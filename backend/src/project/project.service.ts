import { Injectable } from '@nestjs/common';
import { ApiResponse } from 'src/common/dto/api-response.dto';
import { EventsGateway } from 'src/event/events.gateway';
import { PrismaService } from 'src/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService, private eventsGateway: EventsGateway) { }
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
          { name: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
      ...(userId && {
        OR: [
          { created_by: userId },
          {
            tb_project_members: {
              some: {
                user_id: userId,
                status: { not: "invited" },
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
        orderBy: { created_at: "desc" },
        include: {
          tb_project_members: {
            where: {
              NOT: { status: "invited" },
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

    return new ApiResponse("เรียกข้อมูลโปรเจกต์สำเร็จ", 200, {
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
        user_id: userId, status: 'invited',
      },
      include: {
        user_account: true,
        tb_project_projects: true
      }
    })

    return new ApiResponse('success', 200, lists)
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

    return new ApiResponse('อัพเดทข้อมูลสำเร็จ', 200, {})
  }

  async createTaskStatuses(project_id: number, statuses: any[]) {
    try {

      const existing = await this.prisma.tb_project_task_statuses.findMany({
        where: { project_id },
      });

      if (existing.length > 0) {
        return new ApiResponse('โปรเจกต์นี้มีสถานะอยู่แล้ว', 200, existing);
      }


      const created = await this.prisma.tb_project_task_statuses.createMany({
        data: statuses.map((s, i) => ({
          project_id,
          name: s.name,
          color: s.color || '#9CA3AF',
          order_index: s.order_index || i + 1,
          is_default: s.is_default ?? false,
          is_done: s.is_done ?? false,
        })),
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
        return new ApiResponse("ไม่พบสถานะที่ต้องการอัปเดต", 404, null);
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

      return new ApiResponse("อัปเดตสถานะสำเร็จ", 200, updated);
    } catch (error) {
      console.error("❌ updateTaskStatus Error:", error);
      return new ApiResponse("เกิดข้อผิดพลาดในการอัปเดตสถานะ", 500, error);
    }
  }

  async deleteTaskStatus(id: number) {
    try {
      // ตรวจสอบว่ามีข้อมูลนี้จริงไหม
      const existing = await this.prisma.tb_project_task_statuses.findUnique({
        where: { id },
      });

      if (!existing) {
        return new ApiResponse("ไม่พบสถานะที่ต้องการลบ", 404, null);
      }

      // ป้องกันการลบสถานะสำคัญ (optional)
      if (existing.is_default) {
        return new ApiResponse("❌ ไม่สามารถลบสถานะค่าเริ่มต้นได้", 400, null);
      }

      if (existing.is_done) {
        return new ApiResponse("❌ ไม่สามารถลบสถานะเสร็จสิ้นได้", 400, null);
      }

      // ทำการลบจริง
      const deleted = await this.prisma.tb_project_task_statuses.delete({
        where: { id },
      });

      return new ApiResponse("ลบสถานะสำเร็จ", 200, deleted);
    } catch (error) {
      console.error("❌ deleteTaskStatus Error:", error);
      return new ApiResponse("เกิดข้อผิดพลาดในการลบสถานะ", 500, error);
    }
  }



  async getTaskStatusByProjectID(project_id: number) {
    const lists = await this.prisma.tb_project_task_statuses.findMany({
      where: {
        project_id: project_id
      }
    });

    return new ApiResponse('เรียกดูข้อมูลสถานะหัวข้องานสำเร็จ', 200, lists)
  }




}
