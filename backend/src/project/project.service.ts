import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, tb_project_members_status, $Enums } from 'generated/prisma';
import { ApiResponse } from 'src/common/dto/api-response.dto';
import { EventsGateway } from 'src/event/events.gateway';
import { PrismaService } from 'src/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) { }
  private generateJoinCode(length = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async generateUniqueJoinCode(): Promise<string> {
    let code: string;
    let isDuplicate = true;

    while (isDuplicate) {
      code = this.generateJoinCode();

      const existing = await this.prisma.tb_project_projects.findFirst({
        where: { join_code: code },
      });

      if (!existing) {
        isDuplicate = false;
      }
    }

    return code!;
  }

  private formatTaskComment(comment: any) {
    if (!comment) return null;
    return {
      id: String(comment.id),
      taskId:
        comment.task_id != null
          ? String(comment.task_id)
          : comment.taskId != null
            ? String(comment.taskId)
            : null,
      userId:
        comment.user_id != null
          ? String(comment.user_id)
          : comment.userId != null
            ? String(comment.userId)
            : null,
      message: comment.message ?? '',
      createdAt: comment.created_at
        ? comment.created_at.toISOString()
        : comment.createdAt ?? null,
      updatedAt: comment.updated_at
        ? comment.updated_at.toISOString()
        : comment.updatedAt ?? null,
      authorName:
        comment.user_account?.full_name ??
        comment.user_account?.fullName ??
        comment.user_account?.username ??
        comment.authorName ??
        null,
      authorRole:
        comment.user_account?.position ??
        comment.user_account?.role ??
        comment.authorRole ??
        null,
      authorDepartment:
        comment.user_account?.department ?? comment.authorDepartment ?? null,
    };
  }

  private formatSubtask(subtask: any) {
    if (!subtask) return null;
    return {
      ...subtask,
      status_id:
        subtask.status_id != null
          ? Number(subtask.status_id)
          : subtask.statusId != null
            ? Number(subtask.statusId)
            : null,
      status_label: subtask.tb_project_task_statuses?.name ?? null,
      status_color: subtask.tb_project_task_statuses?.color ?? null,
    };
  }

  async createProject(createProjectDto: CreateProjectDto) {
    const {
      name,
      priority,
      join,
      description,
      team,
      invited_by,
      created_by,
    }: any = createProjectDto;

    const joinCode = join ? await this.generateUniqueJoinCode() : null;

    const newProject = await this.prisma.tb_project_projects.create({
      data: {
        name,
        description,
        priority,
        join_enabled: join,
        join_code: joinCode,
        status: 'draft',
        created_by,
      },
    });

    if (team && Array.isArray(team) && team.length > 0) {
      const uniqueTeam = Array.from(new Set([...team, created_by]));

      const membersData: any = uniqueTeam.map((member: string) => ({
        project_id: newProject.id,
        user_id: member,
        status: member === created_by ? 'joined' : 'invited',
        invited_by,
      }));

      await this.prisma.tb_project_members.createMany({
        data: membersData,
        skipDuplicates: true,
      });

      for (const member of membersData) {
        if (member.status === 'invited') {
          const inviteCount = await this.prisma.tb_project_members.count({
            where: {
              user_id: member.user_id,
              status: 'invited',
            },
          });

          this.eventsGateway.sendToUser(member.user_id, 'invitedCountUpdated', {
            inviteCount,
            projectId: newProject.id,
            projectName: newProject.name,
            message: `คุณมีคำเชิญโปรเจกต์ ${inviteCount} รายการ`,
          });
        }
      }
    } else {
      await this.prisma.tb_project_members.create({
        data: {
          project_id: newProject.id,
          user_id: created_by,
          status: 'joined',
          invited_by: created_by,
        },
      });
    }

    return new ApiResponse('สร้างโปรเจกต์สำเร็จ', 201, newProject);
  }

  async readAllProjectByEmployee(
    page = 1,
    limit = 10,
    filters?: {
      status?: string;
      priority?: string;
      search?: string;
      created_by?: string;
    },
  ) {
    const skip = (page - 1) * limit;

    const userId = filters?.created_by;

    const where: any = {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
      ...(userId && {
        OR: [
          { created_by: userId },
          {
            tb_project_members: {
              some: {
                user_id: userId,
                status: { not: 'invited' },
              },
            },
          },
        ],
      }),
    };

    const [projects, total] = await this.prisma.$transaction([
      this.prisma.tb_project_projects.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          tb_project_members: {
            where: {
              NOT: { status: 'invited' },
            },
            include: {
              user_account: true,
            },
          },
        },
      }),
      this.prisma.tb_project_projects.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return new ApiResponse('เรียกข้อมูลโปรเจกต์สำเร็จ', 200, {
      pagination: {
        total,
        totalPages,
        currentPage: page,
        perPage: limit,
      },
      filters,
      result: projects,
    });
  }

  async readInviteCount(userId: string) {
    const inviteCount = await this.prisma.tb_project_members.count({
      where: { user_id: userId, status: 'invited' },
    });
    return new ApiResponse('success', 200, inviteCount);
  }

  async readInvite(userId: string) {
    const lists = await this.prisma.tb_project_members.findMany({
      where: {
        user_id: userId,
        status: 'invited',
      },
      include: {
        user_account: true,
        tb_project_projects: true,
      },
    });

    return new ApiResponse('success', 200, lists);
  }

  async updateStatusInviteProject(project_id: number, status: any) {
    await this.prisma.tb_project_members.updateMany({
      where: {
        id: project_id,
      },
      data: {
        status,
      },
    });

    return new ApiResponse('อัพเดทข้อมูลสำเร็จ', 200, {});
  }

  async createTaskStatuses(project_id: number, statuses: any[]) {
    try {
      // Determine current max order to append new statuses correctly
      const agg = await this.prisma.tb_project_task_statuses.aggregate({
        where: { project_id },
        _max: { order_index: true },
      });

      const baseOrder = agg._max.order_index ?? 0;

      const data = statuses.map((s, i) => ({
        project_id,
        name: s.name,
        color: s.color || '#9CA3AF',
        order_index: s.order_index ?? baseOrder + i + 1,
        is_default: s.is_default ?? false,
        is_done: s.is_done ?? false,
      }));

      const created = await this.prisma.tb_project_task_statuses.createMany({
        data,
        skipDuplicates: true,
      });

      return new ApiResponse('สร้างหัวข้องานสำเร็จ', 201, created);
    } catch (error) {
      console.error('❌ createTaskStatuses Error:', error);
      return new ApiResponse('เกิดข้อผิดพลาด', 500, error);
    }
  }

  async updateTaskStatus(id: number, data: any) {
    try {
      const existing = await this.prisma.tb_project_task_statuses.findUnique({
        where: { id },
      });

      if (!existing) {
        return new ApiResponse('ไม่พบสถานะที่ต้องการอัปเดต', 404, null);
      }

      if (data.is_default === true) {
        await this.prisma.tb_project_task_statuses.updateMany({
          where: {
            project_id: existing.project_id,
            NOT: { id },
            is_default: true,
          },
          data: { is_default: false },
        });
      }

      if (data.is_done === true) {
        await this.prisma.tb_project_task_statuses.updateMany({
          where: {
            project_id: existing.project_id,
            NOT: { id },
            is_done: true,
          },
          data: { is_done: false },
        });
      }

      const updated = await this.prisma.tb_project_task_statuses.update({
        where: { id },
        data: {
          name: data.name ?? existing.name,
          color: data.color ?? existing.color,
          is_default: data.is_default ?? existing.is_default,
          is_done: data.is_done ?? existing.is_done,
          order_index: data.order_index ?? existing.order_index,
          updated_at: new Date(),
        },
      });

      return new ApiResponse('อัปเดตสถานะสำเร็จ', 200, updated);
    } catch (error) {
      console.error('❌ updateTaskStatus Error:', error);
      return new ApiResponse('เกิดข้อผิดพลาดในการอัปเดตสถานะ', 500, error);
    }
  }

  async deleteTaskStatus(id: number) {
    try {
      // ตรวจสอบว่ามีข้อมูลนี้จริงไหม
      const existing = await this.prisma.tb_project_task_statuses.findUnique({
        where: { id },
      });

      if (!existing) {
        return new ApiResponse('ไม่พบสถานะที่ต้องการลบ', 404, null);
      }

      // ป้องกันการลบสถานะสำคัญ (optional)
      if (existing.is_default) {
        return new ApiResponse('❌ ไม่สามารถลบสถานะค่าเริ่มต้นได้', 400, null);
      }

      if (existing.is_done) {
        return new ApiResponse('❌ ไม่สามารถลบสถานะเสร็จสิ้นได้', 400, null);
      }

      // ทำการลบจริง
      const deleted = await this.prisma.tb_project_task_statuses.delete({
        where: { id },
      });

      return new ApiResponse('ลบสถานะสำเร็จ', 200, deleted);
    } catch (error) {
      console.error('❌ deleteTaskStatus Error:', error);
      return new ApiResponse('เกิดข้อผิดพลาดในการลบสถานะ', 500, error);
    }
  }

  async getTaskStatusByProjectID(project_id: number) {
    const lists = await this.prisma.tb_project_task_statuses.findMany({
      where: {
        project_id: project_id,
      },
      orderBy: {
        order_index: 'asc',
      },
    });

    return new ApiResponse('เรียกดูข้อมูลสถานะหัวข้องานสำเร็จ', 200, lists);
  }

  async addTaskProject(data: any) {
    const { project_id, title, description, status_id, assigned_to, priority } =
      data;

    const newProject = await this.prisma.tb_project_tasks.create({
      data: {
        project_id,
        title,
        description,
        status_id,
        assigned_to,
        priority,
      },
    });

    return new ApiResponse('เพิ่มสถานะหัวข้องานสำเร็จ', 200, newProject);
  }

  async getTaskProject(project_id: number) {
    const subtaskInclude: Prisma.tb_project_tasks$tb_project_sub_tasksArgs = {
      orderBy: {
        created_at: 'asc',
      },
      include: {
        tb_project_task_statuses: true,
        tb_project_sub_task_assignees: {
          include: {
            user_account: true,
          },
        },
      },
    };

    const lists = await this.prisma.tb_project_tasks.findMany({
      where: {
        project_id: project_id,
      },
      orderBy: {
        updated_at: 'desc',
      },
      include: {
        user_account: true,
        tb_project_sub_tasks: subtaskInclude,
      },
    });

    return new ApiResponse('เรียกดูข้อมูลหัวข้องานสำเร็จ', 200, lists);
  }

  async getTaskLogs(project_id: number) {
    if (!project_id) {
      return new ApiResponse('กรุณาระบุโปรเจกต์', 400, null);
    }

    const project = await this.prisma.tb_project_projects.findUnique({
      where: { id: project_id },
      select: { id: true },
    });

    if (!project) {
      return new ApiResponse('ไม่พบโปรเจกต์ที่ต้องการ', 404, null);
    }

    const logs = await this.prisma.tb_project_task_logs.findMany({
      where: {
        tb_project_tasks: {
          project_id,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      include: {
        user_account: true,
        tb_project_tasks: {
          select: {
            id: true,
            title: true,
          },
        },
        tb_project_sub_tasks: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const statusIds = Array.from(
      new Set(
        logs.flatMap((log) => [
          Number(log.old_status_id),
          Number(log.new_status_id),
        ]),
      ),
    ).filter((value) => !Number.isNaN(value));

    const statuses =
      statusIds.length > 0
        ? await this.prisma.tb_project_task_statuses.findMany({
          where: {
            id: {
              in: statusIds,
            },
          },
          select: {
            id: true,
            name: true,
            color: true,
          },
        })
        : [];

    const statusMap = new Map<
      number,
      { id: number; name: string | null; color: string | null }
    >();

    statuses.forEach((status) =>
      statusMap.set(Number(status.id), {
        id: Number(status.id),
        name: status.name ?? null,
        color: status.color ?? null,
      }),
    );

    const formatted = logs.map((log) => ({
      id: log.id,
      taskId: log.task_id,
      taskTitle: log.tb_project_tasks?.title ?? null,
      subtaskId: log.subtask_id ?? null,
      subtaskTitle: log.tb_project_sub_tasks?.title ?? null,
      changedBy: log.changed_by ?? null,
      changedByName:
        log.user_account?.full_name ??
        log.user_account?.username ??
        log.changed_by ??
        null,
      changedByDepartment: log.user_account?.department ?? null,
      oldStatus: statusMap.get(Number(log.old_status_id)) ?? null,
      newStatus: statusMap.get(Number(log.new_status_id)) ?? null,
      oldProgress: Number(log.old_progress ?? 0),
      newProgress: Number(log.new_progress ?? 0),
      createdAt: log.created_at ? log.created_at.toISOString() : null,
    }));

    return new ApiResponse(
      'ดึงประวัติการเปลี่ยนแปลงของงานสำเร็จ',
      200,
      formatted,
    );
  }

  async getProjectMembersForSubtasks(project_id: number) {
    const project = await this.prisma.tb_project_projects.findUnique({
      where: { id: project_id },
    });

    if (!project) {
      return new ApiResponse('ไม่พบโปรเจกต์ที่ต้องการ', 404, null);
    }

    const members = await this.prisma.tb_project_members.findMany({
      where: {
        project_id,
        status: tb_project_members_status.joined,
      },
      include: {
        user_account: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    return new ApiResponse('เรียกดูสมาชิกโปรเจกต์สำเร็จ', 200, members);
  }

  async getSubtasksByTaskId(task_id: number) {
    const task = await this.prisma.tb_project_tasks.findUnique({
      where: { id: task_id },
    });

    if (!task) {
      return new ApiResponse('ไม่พบหัวข้องานที่ต้องการ', 404, null);
    }

    const subtasks = await this.prisma.tb_project_sub_tasks.findMany({
      where: { task_id },
      orderBy: {
        created_at: 'asc',
      },
      include: {
        tb_project_task_statuses: true,
        tb_project_sub_task_assignees: {
          include: {
            user_account: true,
          },
        },
      },
    });

    return new ApiResponse(
      'เรียกดูงานย่อยสำเร็จ',
      200,
      subtasks.map((subtask) => this.formatSubtask(subtask)),
    );
  }

  private async recalculateTaskProgress(task_id: number) {
    const aggregate = await this.prisma.tb_project_sub_tasks.aggregate({
      where: { task_id },
      _avg: {
        progress_percent: true,
      },
    });

    const avgProgress = aggregate._avg.progress_percent
      ? Number(aggregate._avg.progress_percent)
      : 0;

    await this.prisma.tb_project_tasks.update({
      where: { id: task_id },
      data: {
        progress_percent: avgProgress,
        updated_at: new Date(),
      },
    });
  }

  async createSubtask(task_id: number, data: any) {
    const task = await this.prisma.tb_project_tasks.findUnique({
      where: { id: task_id },
    });

    if (!task) {
      return new ApiResponse('ไม่พบหัวข้องานที่ต้องการ', 404, null);
    }

    if (!data?.title || typeof data.title !== 'string') {
      return new ApiResponse('กรุณาระบุชื่องานย่อย', 400, null);
    }

    const statusId =
      data.status_id != null ? Number(data.status_id) : task.status_id;

    const progressPercent =
      data.progress_percent != null ? Number(data.progress_percent) : 0;

    const hasDueDate =
      data.has_due_date === true ||
      data.has_due_date === 'true' ||
      data.has_due_date === 1;

    const createPayload: Prisma.tb_project_sub_tasksUncheckedCreateInput = {
      task_id,
      title: data.title.trim(),
      description: data.description?.trim() ?? '',
      status_id: statusId,
      progress_percent: progressPercent,
      start_date: data.start_date ? new Date(data.start_date) : new Date(),
      has_due_date: hasDueDate,
    };

    if (hasDueDate && data.due_date) {
      createPayload.due_date = new Date(data.due_date);
    }

    if (data.completed_date) {
      createPayload.completed_date = new Date(data.completed_date);
    }

    const created = await this.prisma.tb_project_sub_tasks.create({
      data: createPayload,
    });

    const assigneeIds: string[] = Array.isArray(data.assignee_user_ids)
      ? data.assignee_user_ids
        .map((value: any) => String(value).trim())
        .filter((value: string) => value.length > 0)
      : typeof data.assignee_user_id === 'string'
        ? [data.assignee_user_id.trim()]
        : [];

    if (assigneeIds.length > 0) {
      await this.prisma.tb_project_sub_task_assignees.createMany({
        data: assigneeIds.map((userId) => ({
          subtask_id: created.id,
          user_id: userId,
          assigned_at: new Date(),
        })),
        skipDuplicates: true,
      });
    }

    const subtaskWithRelations =
      await this.prisma.tb_project_sub_tasks.findUnique({
        where: { id: created.id },
        include: {
          tb_project_task_statuses: true,
          tb_project_sub_task_assignees: {
            include: {
              user_account: true,
            },
          },
        },
      });

    await this.recalculateTaskProgress(task_id);

    await this.prisma.tb_project_task_logs.create({
      data: {
        task_id: task_id,
        subtask_id: created.id,
        changed_by: data.changed_by,
        old_status_id: task.status_id ?? 0,
        new_status_id: statusId,
        old_progress: 0.0,
        new_progress: progressPercent ?? 0.0,
        created_at: new Date(),
      },
    });

    return new ApiResponse(
      'สร้างงานย่อยสำเร็จ',
      201,
      this.formatSubtask(subtaskWithRelations),
    );
  }

  async updateSubtask(
    task_id: number,
    subtask_id: number,
    userId: string,
    data: any,
  ) {
    if (!userId) {
      return new ApiResponse('ไม่พบข้อมูลผู้ใช้งาน', 401, null);
    }

    const subtask = await this.prisma.tb_project_sub_tasks.findFirst({
      where: {
        id: subtask_id,
        task_id,
      },
      include: {
        tb_project_sub_task_assignees: true,
      },
    });

    if (!subtask) {
      return new ApiResponse('ไม่พบงานย่อยที่ต้องการ', 404, null);
    }

    const isAssignee = subtask.tb_project_sub_task_assignees.some(
      (assignee) => assignee.user_id === userId,
    );

    if (!isAssignee) {
      return new ApiResponse('คุณไม่มีสิทธิ์อัปเดตงานย่อยนี้', 403, null);
    }

    const task = await this.prisma.tb_project_tasks.findUnique({
      where: { id: task_id },
      select: { id: true, project_id: true },
    });

    if (!task) {
      return new ApiResponse('ไม่พบหัวข้องานที่ต้องการ', 404, null);
    }

    // ✅ เก็บค่าเก่าก่อนอัปเดต
    const oldStatusId = subtask.status_id ?? 0;
    const oldProgress = Number(subtask.progress_percent ?? 0);

    const updateData: Prisma.tb_project_sub_tasksUncheckedUpdateInput = {
      updated_at: new Date(),
    };

    // ✅ อัปเดต progress ถ้ามี
    if (data.progress_percent != null) {
      const progressNumber = Number(data.progress_percent);
      if (!Number.isNaN(progressNumber)) {
        updateData.progress_percent = Math.min(
          100,
          Math.max(0, progressNumber),
        );
        // auto handle completed_date based on progress
        if (Number(updateData.progress_percent) >= 100) {
          const dateFromBody = data.completed_date
            ? new Date(data.completed_date)
            : undefined;
          updateData.completed_date = dateFromBody ?? new Date();
        } else {
          updateData.completed_date = null;
        }
        if (data.status_id == null) {
          const statuses =
            await this.prisma.tb_project_task_statuses.findMany({
              where: { project_id: task.project_id },
              orderBy: {
                order_index: 'asc',
              },
            });
          if (statuses.length > 0) {
            const sorted = statuses.sort(
              (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
            );
            const span = sorted.length - 1;
            const normalized = Math.min(
              1,
              Math.max(0, Number(updateData.progress_percent) / 100),
            );
            const targetIndex =
              span <= 0 ? 0 : Math.min(span, Math.floor(normalized * span));
            updateData.status_id = sorted[targetIndex]?.id ?? updateData.status_id;
          }
        }
      }
    }

    // ✅ allow explicit completed_date update when progress not provided
    if (data.progress_percent == null && 'completed_date' in data) {
      updateData.completed_date = data.completed_date
        ? new Date(data.completed_date)
        : null;
    }

    // ✅ อัปเดต status ถ้ามี
    if (data.status_id != null) {
      const statusNumber = Number(data.status_id);
      if (!Number.isNaN(statusNumber)) {
        updateData.status_id = statusNumber;
      }
    }

    // ✅ อัปเดตข้อมูลใน DB
    await this.prisma.tb_project_sub_tasks.update({
      where: { id: subtask.id },
      data: updateData,
    });

    // ✅ ดึงข้อมูลล่าสุด (หลังอัปเดต)
    const subtaskWithRelations =
      await this.prisma.tb_project_sub_tasks.findUnique({
        where: { id: subtask.id },
        include: {
          tb_project_task_statuses: true,
          tb_project_sub_task_assignees: {
            include: {
              user_account: true,
            },
          },
        },
      });

    // ✅ คำนวณความคืบหน้าใหม่ของ task หลัก
    await this.recalculateTaskProgress(task_id);

    // ✅ เพิ่ม Log การอัปเดต
    await this.prisma.tb_project_task_logs.create({
      data: {
        task_id,
        subtask_id: subtask.id,
        changed_by: userId,
        old_status_id: oldStatusId,
        new_status_id: updateData.status_id
          ? Number(updateData.status_id)
          : oldStatusId,
        old_progress: oldProgress,
        new_progress: updateData.progress_percent
          ? Number(updateData.progress_percent)
          : oldProgress,
        created_at: new Date(),
      },
    });

    return new ApiResponse(
      'อัปเดตงานย่อยสำเร็จ',
      200,
      this.formatSubtask(subtaskWithRelations),
    );
  }

  async updateSubtaskById(subtask_id: number, userId: string, data: any) {
    const sub = await this.prisma.tb_project_sub_tasks.findUnique({
      where: { id: subtask_id },
      select: { id: true, task_id: true },
    });
    if (!sub) {
      return new ApiResponse('ไม่พบงานย่อยที่ต้องการ', 404, null);
    }
    return this.updateSubtask(Number(sub.task_id), Number(sub.id), userId, data);
  }

  async getTaskComments(task_id: number) {
    if (!task_id) {
      return new ApiResponse('กรุณาระบุงาน', 400, null);
    }

    const task = await this.prisma.tb_project_tasks.findUnique({
      where: { id: task_id },
      select: { id: true },
    });

    if (!task) {
      return new ApiResponse('ไม่พบหัวข้องานที่ต้องการ', 404, null);
    }

    const comments = await this.prisma.tb_project_task_comments.findMany({
      where: { task_id },
      orderBy: { created_at: 'asc' },
      include: {
        user_account: true,
      },
    });

    return new ApiResponse(
      'ดึงข้อมูลความคิดเห็นสำเร็จ',
      200,
      comments.map((comment) => this.formatTaskComment(comment)),
    );
  }

  async summarizeTaskComments(task_id: number) {
    if (!task_id) {
      return new ApiResponse('กรุณาระบุงาน', 400, null);
    }

    const task = await this.prisma.tb_project_tasks.findUnique({
      where: { id: task_id },
      select: { id: true },
    });
    if (!task) {
      return new ApiResponse('ไม่พบหัวข้องานที่ต้องการ', 404, null);
    }

    const comments = await this.prisma.tb_project_task_comments.findMany({
      where: { task_id },
      orderBy: { created_at: 'asc' },
      include: { user_account: true },
    });

    const plain = comments.map((c) => {
      const who = c.user_account?.full_name || c.user_account?.username || 'unknown';
      const when = c.created_at?.toISOString?.() ?? '';
      return `- (${when}) ${who}: ${c.message}`;
    }).join('\n');

    const systemPrompt = 'คุณคือผู้ช่วยที่สรุปข้อมูลให้สั้น กระชับ เป็นข้อ ๆ ภาษาไทย เน้นประเด็นสำคัญ การตัดสินใจ งานค้าง และกำหนดเวลา';
    const userPrompt = `สรุปคอมเมนต์ของงานต่อไปนี้แบบ bullet point 3-8 ข้อ พร้อมสรุปสถานะโดยรวมถ้ามี:\n\n${plain}`;

    let summary = '';
    const apiKey = process.env.OPENAI_API_KEY;
    try {
      if (apiKey) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 300,
          }),
        });
        const json = await res.json();
        summary = json?.choices?.[0]?.message?.content ?? '';
      }
    } catch (e) {
      // fall back summarization below
    }

    if (!summary) {
      // Fallback: naive summary (no external AI)
      const last = comments.slice(-5).map((c) => c.message).filter(Boolean);
      summary = last.length
        ? `สรุปโดยย่อ (fallback):\n- ล่าสุด: ${last.join('\n- ')}`
        : 'ยังไม่มีคอมเมนต์ให้สรุป';
    }

    return new ApiResponse('สรุปคอมเมนต์สำเร็จ', 200, {
      task_id,
      count: comments.length,
      summary,
    });
  }

  async createTaskComment(
    task_id: number,
    userId: string,
    message: string,
  ) {
    if (!task_id) {
      return new ApiResponse('กรุณาระบุงาน', 400, null);
    }
    const trimmedMessage = message?.trim();
    if (!trimmedMessage) {
      return new ApiResponse('กรุณาระบุข้อความความคิดเห็น', 400, null);
    }
    if (!userId) {
      return new ApiResponse('ไม่พบข้อมูลผู้ใช้งาน', 401, null);
    }

    const task = await this.prisma.tb_project_tasks.findUnique({
      where: { id: task_id },
      select: { id: true, project_id: true },
    });

    if (!task) {
      return new ApiResponse('ไม่พบหัวข้องานที่ต้องการ', 404, null);
    }

    const user = await this.prisma.user_account.findUnique({
      where: { user_id: userId },
      select: { user_id: true },
    });

    if (!user) {
      return new ApiResponse('ไม่พบข้อมูลผู้ใช้งาน', 404, null);
    }

    const created = await this.prisma.tb_project_task_comments.create({
      data: {
        task_id,
        user_id: userId,
        message: trimmedMessage,
      },
      include: {
        user_account: true,
      },
    });

    const formatted = this.formatTaskComment(created);

    this.eventsGateway.broadcastToTask(task_id, 'project:task:comment:created', {
      taskId: task_id,
      comment: formatted,
    });

    if (task.project_id != null) {
      this.eventsGateway.broadcastToProject(
        task.project_id,
        'project:task:comment:created',
        {
          projectId: task.project_id,
          taskId: task_id,
          comment: formatted,
        },
      );
    }

    return new ApiResponse('สร้างความคิดเห็นสำเร็จ', 201, formatted);
  }

  async getProjectDetail(
    project_id: number,
    userId: string,
    roles: string[],
  ) {
    if (!project_id) {
      throw new BadRequestException('กรุณาระบุโปรเจกต์');
    }

    type ProjectWithMembers = Prisma.tb_project_projectsGetPayload<{
      include: {
        tb_project_members: {
          include: {
            user_account: true;
          };
        };
      };
    }>;

    const project = (await this.prisma.tb_project_projects.findUnique({
      where: { id: project_id },
      include: {
        tb_project_members: {
          include: {
            user_account: true,
          },
          orderBy: {
            joined_at: 'asc',
          },
        },
      },
    })) as ProjectWithMembers | null;

    if (!project) {
      throw new NotFoundException('ไม่พบโปรเจกต์ที่ระบุ');
    }

    const normalizedUserId = userId != null ? String(userId) : '';
    const normalizedRoles = Array.isArray(roles)
      ? roles.map((role) => String(role).toLowerCase())
      : [];
    const isAdmin = normalizedRoles.includes('admin');

    const isOwner =
      project.created_by != null &&
      String(project.created_by) === normalizedUserId;

    let isMember = false;
    if (normalizedUserId) {
      const member = await this.prisma.tb_project_members.findFirst({
        where: {
          project_id,
          user_id: normalizedUserId,
          status: {
            in: [
              tb_project_members_status.joined,
              tb_project_members_status.invited,
            ],
          },
        },
      });
      isMember = Boolean(member);
    }

    if (!isOwner && !isMember && !isAdmin) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงโปรเจกต์นี้');
    }

    let ownerAccount: any = null;
    if (project.created_by != null) {
      ownerAccount = await this.prisma.user_account.findUnique({
        where: { user_id: String(project.created_by) },
        select: {
          user_id: true,
          full_name: true,
          username: true,
          department: true,
          position: true,
          image: true,
          email: true,
        },
      });
    }

    const data = {
      ...project,
      owner: ownerAccount,
      employees: project.tb_project_members,
    };

    return new ApiResponse('success', 200, data);
  }

  async updateProjectStatus(
    project_id: number,
    status: string,
    userId: string,
    roles: string[],
  ) {
    if (!project_id) {
      return new ApiResponse('กรุณาระบุโปรเจกต์', 400, null);
    }

    const normalizedStatus = (status ?? '').toLowerCase().trim();
    const allowedStatuses = new Set(['draft', 'started', 'completed', 'cancelled']);

    if (!normalizedStatus || !allowedStatuses.has(normalizedStatus)) {
      return new ApiResponse('สถานะที่ต้องการไม่ถูกต้อง', 400, null);
    }

    const project = await this.prisma.tb_project_projects.findUnique({
      where: { id: project_id },
      select: {
        id: true,
        status: true,
        created_by: true,
      },
    });

    if (!project) {
      return new ApiResponse('ไม่พบโปรเจกต์ที่ระบุ', 404, null);
    }

    const normalizedUserId = userId != null ? String(userId) : '';
    const isOwner =
      project.created_by != null &&
      String(project.created_by) === normalizedUserId;

    const normalizedRoles = Array.isArray(roles)
      ? roles.map((role) => String(role).toLowerCase())
      : [];
    const hasPrivilegedRole = normalizedRoles.some((role) =>
      ['admin', 'staff'].includes(role),
    );

    if (!isOwner && !hasPrivilegedRole) {
      return new ApiResponse('คุณไม่มีสิทธิ์เปลี่ยนสถานะโปรเจกต์นี้', 403, null);
    }

    if (
      (project.status ?? '').toLowerCase().trim() === normalizedStatus
    ) {
      return new ApiResponse('สถานะโปรเจกต์ถูกอัปเดตแล้ว', 200, project);
    }

    const updatedProject = await this.prisma.tb_project_projects.update({
      where: { id: project_id },
      data: {
        status: normalizedStatus as $Enums.tb_project_projects_status,
        updated_at: new Date(),
      },
    });

    this.eventsGateway.broadcastToProject(project_id, 'project:status:updated', {
      projectId: project_id,
      status: normalizedStatus,
      previousStatus: project.status ?? null,
    });

    return new ApiResponse('อัปเดตสถานะโปรเจกต์สำเร็จ', 200, updatedProject);
  }

  async moveTask(task_id: number, status_id: number) {
    if (!status_id) {
      return new ApiResponse('กรุณาระบุสถานะใหม่', 400, null);
    }

    const existingTask = await this.prisma.tb_project_tasks.findUnique({
      where: { id: task_id },
    });

    if (!existingTask) {
      return new ApiResponse('ไม่พบหัวข้องานที่ต้องการ', 404, null);
    }

    const targetStatus = await this.prisma.tb_project_task_statuses.findUnique({
      where: { id: status_id },
    });

    if (!targetStatus || targetStatus.project_id !== existingTask.project_id) {
      return new ApiResponse('สถานะที่เลือกไม่ถูกต้อง', 400, null);
    }

    const updatedTask = await this.prisma.tb_project_tasks.update({
      where: { id: task_id },
      data: {
        status_id,
        updated_at: new Date(),
      },
      include: {
        user_account: true,
        tb_project_task_statuses: true,
        tb_project_sub_tasks: {
          orderBy: { created_at: 'asc' },
          include: {
            tb_project_task_statuses: true,
            tb_project_sub_task_assignees: {
              include: {
                user_account: true,
              },
            },
          },
        },
      },
    });

    this.eventsGateway.broadcastToProject(
      existingTask.project_id,
      'project:task:moved',
      {
        projectId: existingTask.project_id,
        previousStatusId: existingTask.status_id,
        newStatusId: updatedTask.status_id,
        task: updatedTask,
      },
    );

    return new ApiResponse('อัปเดตสถานะงานสำเร็จ', 200, updatedTask);
  }

  async getAutoAssignSuggestions(project_id: number) {
    if (!project_id) {
      return new ApiResponse('กรุณาระบุโปรเจกต์', 400, null);
    }

    const members = await this.prisma.tb_project_members.findMany({
      where: { project_id, status: tb_project_members_status.joined },
      include: { user_account: true },
    });

    if (members.length === 0) {
      return new ApiResponse('ไม่มีสมาชิกในโปรเจกต์', 200, []);
    }

    const now = new Date();
    const tasks = await this.prisma.tb_project_tasks.findMany({
      where: { project_id },
      include: {
        tb_project_sub_tasks: {
          include: { tb_project_sub_task_assignees: true },
        },
      },
    });

    const stats = new Map<string, { userId: string; name: string; active: number; late: number; avgProgress: number; total: number }>();
    members.forEach((m) => {
      const name = m.user_account?.full_name || m.user_account?.username || m.user_id;
      stats.set(m.user_id ?? '', { userId: m.user_id ?? '', name: name ?? '', active: 0, late: 0, avgProgress: 0, total: 0 });
    });

    tasks.forEach((task) => {
      task.tb_project_sub_tasks.forEach((sub) => {
        (sub.tb_project_sub_task_assignees || []).forEach((asg) => {
          const s = stats.get(asg.user_id);
          if (!s) return;
          const progress = Number(sub.progress_percent ?? 0);
          const hasDue = sub.has_due_date === true && sub.due_date != null;
          const isLate = progress < 100 && hasDue && sub.due_date! < now;
          s.active += progress >= 100 ? 0 : 1;
          s.late += isLate ? 1 : 0;
          s.avgProgress += progress;
          s.total += 1;
        });
      });
    });

    const result = Array.from(stats.values()).map((s) => {
      const avg = s.total > 0 ? s.avgProgress / s.total : 0;
      const score = s.active + s.late * 2 + (1 - avg / 100); // lower is better
      const reason = `งานค้าง ${s.active} • ช้า ${s.late} • เฉลี่ย ${Math.round(avg)}%`;
      return { userId: s.userId, name: s.name, active: s.active, late: s.late, avgProgress: Math.round(avg), score, reason };
    }).sort((a, b) => a.score - b.score);

    return new ApiResponse('แนะนำผู้รับงานใหม่', 200, result);
  }
}
