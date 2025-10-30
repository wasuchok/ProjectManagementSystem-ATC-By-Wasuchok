import { Injectable } from '@nestjs/common';
import { ApiResponse } from 'src/common/dto/api-response.dto';
import { EventsGateway } from 'src/event/events.gateway';
import { PrismaService } from 'src/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { Prisma, tb_project_members_status } from 'generated/prisma';

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}
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

    return new ApiResponse('เรียกดูงานย่อยสำเร็จ', 200, subtasks);
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

    return new ApiResponse('สร้างงานย่อยสำเร็จ', 201, subtaskWithRelations);
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
      }
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

    return new ApiResponse('อัปเดตงานย่อยสำเร็จ', 200, subtaskWithRelations);
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
}
