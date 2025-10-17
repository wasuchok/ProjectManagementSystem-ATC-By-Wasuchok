import { Injectable } from '@nestjs/common';
import { ApiResponse } from 'src/common/dto/api-response.dto';
import { PrismaService } from 'src/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) { }
  async createProject(createProjectDto: CreateProjectDto) {
    const {
      name,
      priority,
      join,
      description,
      team,
      invited_by
    }: any = createProjectDto

    const newProject = await this.prisma.tb_project_projects.create({
      data: {
        name,
        description,
        priority,
        join_enabled: join,
        status: "draft"
      }
    })

    if (team && Array.isArray(team) && team.length > 0) {
      const membersData: any = team.map((member: any) => ({
        project_id: newProject.id,
        user_id: member,
        status: "invited",
        invited_by
      }));

      await this.prisma.tb_project_members.createMany({
        data: membersData,
        skipDuplicates: true,
      });
    }

    return new ApiResponse("สร้างโปรเจกต์สำเร็จ", 201, newProject);


  }

}
