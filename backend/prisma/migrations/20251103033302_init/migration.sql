-- CreateEnum
CREATE TYPE "tb_project_members_status" AS ENUM ('invited', 'joined', 'declined');

-- CreateEnum
CREATE TYPE "tb_project_projects_priority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "tb_project_projects_status" AS ENUM ('draft', 'started', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "tb_project_tasks_priority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateTable
CREATE TABLE "user_account" (
    "user_id" UUID NOT NULL,
    "username" VARCHAR(50),
    "password_hash" VARCHAR(255),
    "full_name" VARCHAR(255),
    "email" VARCHAR(255),
    "department" VARCHAR(50) NOT NULL,
    "position" VARCHAR(50) NOT NULL,
    "image" VARCHAR(255),
    "v_admin" INTEGER DEFAULT 0,
    "v_create" INTEGER DEFAULT 0,
    "status" INTEGER DEFAULT 0,
    "create_date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "create_by" UUID,
    "refresh_token" VARCHAR(255),
    "sect" VARCHAR(10),

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "tb_project_members" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER,
    "user_id" UUID,
    "status" "tb_project_members_status" DEFAULT 'invited',
    "invited_by" UUID NOT NULL,
    "is_active" BOOLEAN,
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),

    CONSTRAINT "tb_project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_project_projects" (
    "id" SERIAL NOT NULL,
    "join_code" VARCHAR(20),
    "name" VARCHAR(255),
    "description" TEXT,
    "priority" "tb_project_projects_priority" NOT NULL,
    "status" "tb_project_projects_status" NOT NULL,
    "join_enabled" BOOLEAN NOT NULL,
    "progress_percent" DECIMAL(5,2) DEFAULT 0.00,
    "completed_date" TIMESTAMP(3),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_project_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_project_task_statuses" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "color" VARCHAR(10),
    "order_index" INTEGER DEFAULT 0,
    "is_default" BOOLEAN DEFAULT false,
    "is_done" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_project_task_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_project_tasks" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "description" TEXT,
    "status_id" INTEGER NOT NULL,
    "assigned_to" UUID NOT NULL,
    "priority" "tb_project_tasks_priority" NOT NULL,
    "progress_percent" DECIMAL(5,2) DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_project_sub_tasks" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status_id" INTEGER NOT NULL,
    "progress_percent" DECIMAL(5,2) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "has_due_date" BOOLEAN,
    "due_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_project_sub_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_project_sub_task_assignees" (
    "id" SERIAL NOT NULL,
    "subtask_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_project_sub_task_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_project_task_logs" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "subtask_id" INTEGER,
    "changed_by" UUID,
    "old_status_id" INTEGER NOT NULL,
    "new_status_id" INTEGER NOT NULL,
    "old_progress" DECIMAL(5,2) NOT NULL,
    "new_progress" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_project_task_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_project_task_comments" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_project_task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_account_create_by_idx" ON "user_account"("create_by");

-- CreateIndex
CREATE INDEX "tb_project_members_project_id_idx" ON "tb_project_members"("project_id");

-- CreateIndex
CREATE INDEX "tb_project_members_user_id_idx" ON "tb_project_members"("user_id");

-- CreateIndex
CREATE INDEX "tb_project_projects_created_by_idx" ON "tb_project_projects"("created_by");

-- CreateIndex
CREATE INDEX "tb_project_task_statuses_project_id_idx" ON "tb_project_task_statuses"("project_id");

-- CreateIndex
CREATE INDEX "tb_project_tasks_assigned_to_idx" ON "tb_project_tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "tb_project_tasks_project_id_idx" ON "tb_project_tasks"("project_id");

-- CreateIndex
CREATE INDEX "tb_project_tasks_status_id_idx" ON "tb_project_tasks"("status_id");

-- CreateIndex
CREATE INDEX "tb_project_sub_tasks_status_id_idx" ON "tb_project_sub_tasks"("status_id");

-- CreateIndex
CREATE INDEX "tb_project_sub_tasks_task_id_idx" ON "tb_project_sub_tasks"("task_id");

-- CreateIndex
CREATE INDEX "tb_project_sub_task_assignees_subtask_id_idx" ON "tb_project_sub_task_assignees"("subtask_id");

-- CreateIndex
CREATE INDEX "tb_project_sub_task_assignees_user_id_idx" ON "tb_project_sub_task_assignees"("user_id");

-- CreateIndex
CREATE INDEX "tb_project_task_logs_changed_by_idx" ON "tb_project_task_logs"("changed_by");

-- CreateIndex
CREATE INDEX "tb_project_task_logs_subtask_id_idx" ON "tb_project_task_logs"("subtask_id");

-- CreateIndex
CREATE INDEX "tb_project_task_logs_task_id_idx" ON "tb_project_task_logs"("task_id");

-- CreateIndex
CREATE INDEX "tb_project_task_comments_task_id_idx" ON "tb_project_task_comments"("task_id");

-- CreateIndex
CREATE INDEX "tb_project_task_comments_user_id_idx" ON "tb_project_task_comments"("user_id");

-- AddForeignKey
ALTER TABLE "user_account" ADD CONSTRAINT "user_account_create_by_fkey" FOREIGN KEY ("create_by") REFERENCES "user_account"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tb_project_members" ADD CONSTRAINT "tb_project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tb_project_projects"("id") ON DELETE SET NULL ON UPDATE SET NULL;

-- AddForeignKey
ALTER TABLE "tb_project_members" ADD CONSTRAINT "tb_project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE SET NULL;

-- AddForeignKey
ALTER TABLE "tb_project_projects" ADD CONSTRAINT "tb_project_projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE SET NULL;

-- AddForeignKey
ALTER TABLE "tb_project_task_statuses" ADD CONSTRAINT "tb_project_task_statuses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tb_project_projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tb_project_tasks" ADD CONSTRAINT "tb_project_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "user_account"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tb_project_tasks" ADD CONSTRAINT "tb_project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tb_project_projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tb_project_tasks" ADD CONSTRAINT "tb_project_tasks_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "tb_project_task_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tb_project_sub_tasks" ADD CONSTRAINT "tb_project_sub_tasks_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "tb_project_task_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tb_project_sub_tasks" ADD CONSTRAINT "tb_project_sub_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tb_project_tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tb_project_sub_task_assignees" ADD CONSTRAINT "tb_project_sub_task_assignees_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "tb_project_sub_tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tb_project_sub_task_assignees" ADD CONSTRAINT "tb_project_sub_task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tb_project_task_logs" ADD CONSTRAINT "tb_project_task_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "user_account"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tb_project_task_logs" ADD CONSTRAINT "tb_project_task_logs_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "tb_project_sub_tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tb_project_task_logs" ADD CONSTRAINT "tb_project_task_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tb_project_tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tb_project_task_comments" ADD CONSTRAINT "tb_project_task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tb_project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_project_task_comments" ADD CONSTRAINT "tb_project_task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
