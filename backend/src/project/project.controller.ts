import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from 'src/common/dto/api-response.dto';
import { Roles } from 'src/common/role/roles.decorator';
import { RolesGuard } from 'src/common/role/roles.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectService } from './project.service';
import type { Request } from 'express';

@Controller('project')
@UseGuards(RolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('create')
  @Roles('admin', 'staff', 'employee')
  createProject(@Body() createProjectDto: CreateProjectDto) {
    return this.projectService.createProject(createProjectDto);
  }

  @Get('views')
  @Roles('admin', 'staff', 'employee')
  async readAllProjectByEmployee(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('created_by') created_by?: string,
  ) {
    return this.projectService.readAllProjectByEmployee(
      Number(page),
      Number(limit),
      {
        status,
        priority,
        search,
        created_by,
      },
    );
  }

  @Get('view/invite/:userId')
  @Roles('admin', 'staff', 'employee')
  async readInvite(@Param('userId') userId: string) {
    return this.projectService.readInvite(userId);
  }

  @Get('view/invite-count/:userId')
  @Roles('admin', 'staff', 'employee')
  async readInviteCount(@Param('userId') userId: string) {
    return this.projectService.readInviteCount(userId);
  }

  @Put('update/invite')
  @Roles('admin', 'staff', 'employee')
  async updateStatusInviteProject(
    @Body() body: { project_id: number; status: string },
  ) {
    return this.projectService.updateStatusInviteProject(
      body.project_id,
      body.status,
    );
  }

  @Post('task-status/create')
  @Roles('admin', 'staff', 'employee')
  async createTaskStatuses(@Body() body: any) {
    const { project_id, statuses } = body;

    if (!project_id || !statuses || !Array.isArray(statuses)) {
      return new ApiResponse('ข้อมูลไม่ถูกต้อง', 400, null);
    }

    return this.projectService.createTaskStatuses(project_id, statuses);
  }

  @Patch('/task-status/update/:id')
  async updateStatus(@Param('id') id: string, @Body() body: any) {
    const result = await this.projectService.updateTaskStatus(Number(id), body);
    return result;
  }

  @Delete('/task-status/delete/:id')
  async deleteStatus(@Param('id') id: string) {
    const result = await this.projectService.deleteTaskStatus(Number(id));
    return result;
  }

  @Get('/task-status/get-all-status-by-project/:project_id')
  @Roles('admin', 'staff', 'employee')
  async getTaskStatusByProjectID(@Param('project_id') project_id: string) {
    return this.projectService.getTaskStatusByProjectID(Number(project_id));
  }

  @Post('/task/add')
  @Roles('admin', 'staff')
  async addTask(@Body() body: any) {
    return this.projectService.addTaskProject(body);
  }

  @Get('/task/project/:project_id')
  @Roles('admin', 'staff', 'employee')
  async getTaskProject(@Param('project_id') project_id: string) {
    return this.projectService.getTaskProject(Number(project_id));
  }

  @Get('/task/logs/:project_id')
  @Roles('admin', 'staff', 'employee')
  async getTaskLogs(@Param('project_id') project_id: string) {
    return this.projectService.getTaskLogs(Number(project_id));
  }

  @Get('/task/:task_id/subtasks')
  @Roles('admin', 'staff', 'employee')
  async getSubtasks(@Param('task_id') task_id: string) {
    return this.projectService.getSubtasksByTaskId(Number(task_id));
  }

  @Post('/task/:task_id/subtasks')
  @Roles('admin', 'staff', 'employee')
  async createSubtask(
    @Param('task_id') task_id: string,
    @Body() body: any,
  ) {
    return this.projectService.createSubtask(Number(task_id), body);
  }

  @Get('/task/:task_id/comments')
  @Roles('admin', 'staff', 'employee')
  async getTaskComments(@Param('task_id') task_id: string) {
    return this.projectService.getTaskComments(Number(task_id));
  }

  @Post('/task/:task_id/comments')
  @Roles('admin', 'staff', 'employee')
  async createTaskComment(
    @Param('task_id') task_id: string,
    @Body('message') message: string,
    @Req() req: Request,
  ) {
    const authUser: any = (req as any).user;
    const userId =
      typeof authUser?.sub === 'string'
        ? authUser.sub
        : authUser?.sub != null
          ? String(authUser.sub)
          : '';

    if (!userId) {
      return new ApiResponse('ไม่พบข้อมูลผู้ใช้งาน', 401, null);
    }

    return this.projectService.createTaskComment(
      Number(task_id),
      userId,
      message,
    );
  }

  @Get('/members/:project_id')
  @Roles('admin', 'staff', 'employee')
  async getProjectMembers(@Param('project_id') project_id: string) {
    return this.projectService.getProjectMembersForSubtasks(
      Number(project_id),
    );
  }

  @Patch('/task/:task_id/subtasks/:subtask_id')
  @Roles('admin', 'staff', 'employee')
  async updateSubtask(
    @Param('task_id') task_id: string,
    @Param('subtask_id') subtask_id: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const authUser: any = (req as any).user;
    const userId =
      typeof authUser?.sub === 'string'
        ? authUser.sub
        : authUser?.sub != null
          ? String(authUser.sub)
          : '';

    return this.projectService.updateSubtask(
      Number(task_id),
      Number(subtask_id),
      userId,
      body,
    );
  }

  // Alias endpoint to update subtask by id only
  @Patch('/sub-task/:subtask_id')
  @Roles('admin', 'staff', 'employee')
  async updateSubtaskById(
    @Param('subtask_id') subtask_id: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const authUser: any = (req as any).user;
    const userId =
      typeof authUser?.sub === 'string'
        ? authUser.sub
        : authUser?.sub != null
          ? String(authUser.sub)
          : '';

    return this.projectService.updateSubtaskById(
      Number(subtask_id),
      userId,
      body,
    );
  }

  @Patch('/task/:task_id/move')
  @Roles('admin', 'staff', 'employee')
  async moveTask(
    @Param('task_id') task_id: string,
    @Body() body: { status_id: number },
  ) {
    return this.projectService.moveTask(Number(task_id), Number(body.status_id));
  }

  @Get('/task/:task_id/comments/summary')
  @Roles('admin', 'staff', 'employee')
  async summarizeTaskComments(@Param('task_id') task_id: string) {
    return this.projectService.summarizeTaskComments(Number(task_id));
  }
}
