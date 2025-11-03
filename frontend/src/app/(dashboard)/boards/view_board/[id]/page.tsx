"use client";

import ModalAddTask from "@/app/components/boards/modal/ModalAddTask";
import ModalDetailTask from "@/app/components/boards/modal/ModalDetailTask";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { decodeSingleHashid } from "@/app/utils/hashids";
import { getSocket } from "@/app/utils/socket";
import {
    DragDropContext,
    Draggable,
    Droppable,
    DropResult,
} from "@hello-pangea/dnd";
import { useParams } from "next/navigation";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FaPlus
} from "react-icons/fa";
import { FiChevronRight, FiClock, FiRefreshCw } from "react-icons/fi";
import type { Socket } from "socket.io-client";

type SubtaskAssignee = {
    id: string;
    userId: string;
    fullName?: string;
    assignedAt?: string;
};

type Subtask = {
    id: string;
    title: string;
    description?: string;
    statusId?: string;
    statusLabel?: string;
    progressPercent?: string;
    startDate?: string;
    hasDueDate?: boolean;
    dueDate?: string;
    completedDate?: string;
    createdAt?: string;
    updatedAt?: string;
    assignees?: SubtaskAssignee[];
};

type Task = {
    id: string;
    title: string;
    priority?: string;
    description?: string;
    assignedTo?: string;
    progressPercent?: string;
    createdAt?: string;
    updatedAt?: string;
    statusId?: string;
    statusLabel?: string;
    subtasks?: Subtask[];
};

type Board = {
    id: string;
    title: string;
    tasks: Task[];
    icon?: ReactNode;
    isDefault: boolean;
    color?: string;
};

type ProjectMember = {
    userId: string;
    fullName?: string;
    department?: string;
    avatarUrl?: string;
};

type TaskMovedEvent = {
    projectId: number;
    previousStatusId?: number | null;
    newStatusId: number;
    task: any;
};

type TaskLogStatus = {
    id?: string | null;
    name?: string | null;
    color?: string | null;
};

type TaskLogEntry = {
    id: string;
    taskId: string;
    taskTitle?: string | null;
    subtaskId?: string | null;
    subtaskTitle?: string | null;
    changedBy?: string | null;
    changedByName?: string | null;
    changedByDepartment?: string | null;
    oldStatus?: TaskLogStatus | null;
    newStatus?: TaskLogStatus | null;
    oldProgress?: number | null;
    newProgress?: number | null;
    createdAt?: string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default function KanbanBoard() {
    const { t } = useLanguage();
    const { id } = useParams();
    const [boards, setBoards] = useState<Board[]>([]);
    const [openModalIsDefault, setOpenModalIsDefault] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
    const [activeTab, setActiveTab] = useState<"board" | "logs" | "timeline" | "gantt">("board");
    const [taskLogs, setTaskLogs] = useState<TaskLogEntry[]>([]);
    const [isLoadingTaskLogs, setIsLoadingTaskLogs] = useState(false);
    const [taskLogsError, setTaskLogsError] = useState<string | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const statusOptions = useMemo(
        () =>
            boards.map((board) => ({
                id: board.id,
                title: board.title,
                color: board.color,
            })),
        [boards]
    );
    const tabOptions = useMemo(
        () => [
            { key: "board" as const, label: t('project.board_tab') },
            { key: "logs" as const, label: t('project.task_logs_tab') },
            { key: "timeline" as const, label: t('project.timeline_tab') },
            { key: "gantt" as const, label: t('project.gantt_tab') },
        ],
        [t]
    );
    const ganttScaleOptions = useMemo(
        () => [
            { key: "day" as const, label: t('project.gantt_scale_day') },
            { key: "week" as const, label: t('project.gantt_scale_week') },
            { key: "month" as const, label: t('project.gantt_scale_month') },
        ],
        [t]
    );
    const dateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
            }),
        []
    );

    const projectId = useMemo(() => {
        if (!id) return null;
        const decoded = decodeSingleHashid(String(id));
        return decoded ?? null;
    }, [id]);

    const handleTaskProgressChanged = useCallback((taskId: string, progressPercent: number) => {
        const clampedProgress = Math.min(100, Math.max(0, progressPercent));
        setBoards((prevBoards) =>
            prevBoards.map((board) => ({
                ...board,
                tasks: board.tasks.map((task) =>
                    task.id === taskId
                        ? {
                            ...task,
                            progressPercent: String(clampedProgress),
                        }
                        : task
                ),
            }))
        );

        setSelectedTask((prev) =>
            prev && prev.id === taskId
                ? {
                    ...prev,
                    progressPercent: String(clampedProgress),
                }
                : prev
        );
    }, []);

    const handleSubtaskUpsert = useCallback((taskId: string, subtask: Subtask) => {
        const boardMatch = subtask.statusId
            ? boards.find((board) => board.id === subtask.statusId)
            : undefined;

        const rawProgress = subtask.progressPercent ?? (subtask as any).progress_percent != null ? String((subtask as any).progress_percent) : undefined;
        const progressNum = rawProgress != null && !Number.isNaN(Number(rawProgress)) ? Number(rawProgress) : null;
        const isComplete = progressNum != null && progressNum >= 100;
        const existingCompleted = subtask.completedDate ?? (subtask as any).completed_date ?? undefined;
        const computedCompletedDate = isComplete ? (existingCompleted ?? new Date().toISOString()) : undefined;

        const enhancedSubtask: Subtask = {
            ...subtask,
            statusLabel: subtask.statusLabel ?? boardMatch?.title ?? subtask.statusLabel,
            completedDate: computedCompletedDate,
        };
        setBoards((prevBoards) =>
            prevBoards.map((board) => ({
                ...board,
                tasks: board.tasks.map((task) => {
                    if (task.id !== taskId) {
                        return task;
                    }
                    const existingSubtasks = Array.isArray(task.subtasks) ? [...task.subtasks] : [];
                    const index = existingSubtasks.findIndex((item) => item.id === enhancedSubtask.id);
                    if (index >= 0) {
                        existingSubtasks[index] = {
                            ...existingSubtasks[index],
                            ...enhancedSubtask,
                        };
                    } else {
                        existingSubtasks.push(enhancedSubtask);
                    }
                    return {
                        ...task,
                        subtasks: existingSubtasks,
                    };
                }),
            }))
        );

        setSelectedTask((prev) => {
            if (!prev || prev.id !== taskId) {
                return prev;
            }
            const existingSubtasks = Array.isArray(prev.subtasks) ? [...prev.subtasks] : [];
            const index = existingSubtasks.findIndex((item) => item.id === enhancedSubtask.id);
            if (index >= 0) {
                existingSubtasks[index] = {
                    ...existingSubtasks[index],
                    ...enhancedSubtask,
                };
            } else {
                existingSubtasks.push(enhancedSubtask);
            }

            return {
                ...prev,
                subtasks: existingSubtasks,
            };
        });

        // Try to sync completed_date to backend optimistically (ignore errors)
        (async () => {
            try {
                if (progressNum != null) {
                    if (progressNum >= 100) {
                        await apiPrivate.patch(`/project/sub-task/${enhancedSubtask.id}`, {
                            completed_date: computedCompletedDate,
                        });
                    } else if (existingCompleted) {
                        await apiPrivate.patch(`/project/sub-task/${enhancedSubtask.id}`, {
                            completed_date: null,
                        });
                    }
                }
            } catch (e) {
                // silent fail; UI already updated optimistically
                console.log(e);
            }
        })();
    }, [boards]);

    const priorityConfig: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
        low: {
            label: "Low",
            badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-100",
            dotClass: "bg-emerald-500",
        },
        normal: {
            label: "Normal",
            badgeClass: "bg-sky-50 text-sky-600 border-sky-100",
            dotClass: "bg-sky-500",
        },
        high: {
            label: "High",
            badgeClass: "bg-amber-50 text-amber-600 border-amber-100",
            dotClass: "bg-amber-500",
        },
        urgent: {
            label: "Urgent",
            badgeClass: "bg-rose-50 text-rose-600 border-rose-100",
            dotClass: "bg-rose-500",
        },
    };

    const normalizeSubtaskData = useCallback(
        (subtask: any): Subtask => ({
            id: String(subtask.id),
            title: subtask.title ?? "",
            description: subtask.description ?? "",
            statusId: subtask.status_id != null ? String(subtask.status_id) : subtask.statusId ?? undefined,
            statusLabel: subtask.tb_project_task_statuses?.name ?? subtask.status_label ?? subtask.statusLabel ?? undefined,
            progressPercent: subtask.progress_percent != null ? String(subtask.progress_percent) : subtask.progressPercent ?? undefined,
            startDate: subtask.start_date ?? subtask.startDate ?? undefined,
            hasDueDate: subtask.has_due_date ?? subtask.hasDueDate ?? false,
            dueDate: subtask.due_date ?? subtask.dueDate ?? undefined,
            completedDate: subtask.completed_date ?? subtask.completedDate ?? undefined,
            createdAt: subtask.created_at ?? subtask.createdAt ?? undefined,
            updatedAt: subtask.updated_at ?? subtask.updatedAt ?? undefined,
            assignees: Array.isArray(subtask.tb_project_sub_task_assignees ?? subtask.assignees)
                ? (subtask.tb_project_sub_task_assignees ?? subtask.assignees).map((assignee: any) => ({
                    id: String(assignee.id ?? `${subtask.id}-${assignee.user_id ?? assignee.userId ?? ""}`),
                    userId: assignee.user_id ?? assignee.userId ?? "",
                    fullName: assignee.user_account?.full_name ?? assignee.fullName ?? assignee.user_account?.username ?? undefined,
                    assignedAt: assignee.assigned_at ?? assignee.assignedAt ?? undefined,
                }))
                : [],
        }),
        []
    );




    const normalizeTaskData = useCallback(
        (task: any): Task => ({
            id: String(task.id),
            title: task.title ?? task.name ?? "",
            priority: typeof task.priority === "string" ? task.priority.toLowerCase() : undefined,
            description: task.description ?? task.details ?? "",
            assignedTo: task.user_account?.full_name ?? undefined,
            progressPercent: task.progress_percent != null ? String(task.progress_percent) : task.progressPercent ?? undefined,
            createdAt: task.created_at ?? task.createdAt ?? undefined,
            updatedAt: task.updated_at ?? task.updatedAt ?? undefined,
            statusId: task.status_id != null ? String(task.status_id) : task.statusId ?? undefined,
            statusLabel: task.tb_project_task_statuses?.name ?? task.statusLabel ?? undefined,
            subtasks: Array.isArray(task.tb_project_sub_tasks ?? task.subtasks)
                ? (task.tb_project_sub_tasks ?? task.subtasks).map((sub: any) => normalizeSubtaskData(sub))
                : [],
        }),
        [normalizeSubtaskData]
    );

    const normalizeTaskLog = useCallback((log: any): TaskLogEntry => {
        const toStatus = (status: any): TaskLogStatus | null => {
            if (!status) return null;
            const statusId =
                status.id != null
                    ? String(status.id)
                    : status.status_id != null
                        ? String(status.status_id)
                        : status.statusId != null
                            ? String(status.statusId)
                            : undefined;
            return {
                id: statusId ?? null,
                name: status.name ?? status.statusName ?? null,
                color: status.color ?? status.statusColor ?? null,
            };
        };

        let createdAt: string | null = null;
        if (typeof log?.createdAt === "string") {
            createdAt = log.createdAt;
        } else if (log?.created_at instanceof Date) {
            createdAt = log.created_at.toISOString();
        } else if (typeof log?.created_at === "string") {
            createdAt = log.created_at;
        }

        const oldStatus =
            log?.oldStatus != null
                ? toStatus(log.oldStatus)
                : log?.old_status_id != null
                    ? {
                        id: String(log.old_status_id),
                        name: log.old_status_name ?? null,
                        color: log.old_status_color ?? null,
                    }
                    : null;

        const newStatus =
            log?.newStatus != null
                ? toStatus(log.newStatus)
                : log?.new_status_id != null
                    ? {
                        id: String(log.new_status_id),
                        name: log.new_status_name ?? null,
                        color: log.new_status_color ?? null,
                    }
                    : null;

        const resolveProgress = (value: any): number | null => {
            if (typeof value === "number") {
                return value;
            }
            if (value != null) {
                const numeric = Number(value);
                return Number.isNaN(numeric) ? null : numeric;
            }
            return null;
        };

        const taskId =
            log?.taskId != null
                ? String(log.taskId)
                : log?.task_id != null
                    ? String(log.task_id)
                    : "";

        const subtaskId =
            log?.subtaskId != null
                ? String(log.subtaskId)
                : log?.subtask_id != null
                    ? String(log.subtask_id)
                    : null;

        return {
            id: String(log?.id ?? ""),
            taskId,
            taskTitle:
                log?.taskTitle ??
                log?.task_title ??
                log?.tb_project_tasks?.title ??
                null,
            subtaskId,
            subtaskTitle:
                log?.subtaskTitle ??
                log?.subtask_title ??
                log?.tb_project_sub_tasks?.title ??
                null,
            changedBy: log?.changedBy ?? log?.changed_by ?? null,
            changedByName:
                log?.changedByName ??
                log?.user_account?.full_name ??
                log?.user_account?.username ??
                null,
            changedByDepartment:
                log?.changedByDepartment ?? log?.user_account?.department ?? null,
            oldStatus,
            newStatus,
            oldProgress:
                resolveProgress(log?.oldProgress) ?? resolveProgress(log?.old_progress),
            newProgress:
                resolveProgress(log?.newProgress) ?? resolveProgress(log?.new_progress),
            createdAt,
        };
    }, []);

    const statusLookup = useMemo(() => {
        const map = new Map<string, { title: string; color?: string }>();
        statusOptions.forEach((option) => {
            map.set(option.id, { title: option.title, color: option.color });
        });
        return map;
    }, [statusOptions]);

    const parseDateValue = useCallback((value?: string | null) => {
        if (!value) return null;
        if (value === "0") return null; // treat "0" as no date
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return date;
    }, []);

    const alignDateToScaleStart = useCallback((date: Date, scale: "day" | "week" | "month") => {
        const aligned = new Date(date);
        if (scale === "day") {
            aligned.setHours(0, 0, 0, 0);
        } else if (scale === "week") {
            const day = aligned.getDay() || 7;
            aligned.setDate(aligned.getDate() - day + 1);
            aligned.setHours(0, 0, 0, 0);
        } else if (scale === "month") {
            aligned.setDate(1);
            aligned.setHours(0, 0, 0, 0);
        }
        return aligned;
    }, []);

    const addScaleStep = useCallback((date: Date, scale: "day" | "week" | "month") => {
        const next = new Date(date);
        if (scale === "day") {
            next.setDate(next.getDate() + 1);
        } else if (scale === "week") {
            next.setDate(next.getDate() + 7);
        } else if (scale === "month") {
            next.setMonth(next.getMonth() + 1);
        }
        return next;
    }, []);

    const buildGanttColumns = useCallback(
        (rangeStart: Date, rangeEnd: Date, scale: "day" | "week" | "month") => {
            const columns: Array<{ key: string; start: Date; end: Date; label: string }> = [];
            let cursor = new Date(rangeStart);
            let index = 0;
            while (cursor < rangeEnd) {
                const columnStart = new Date(cursor);
                const columnEnd = addScaleStep(columnStart, scale);
                let label = "";
                if (scale === "day") {
                    label = dateFormatter.format(columnStart);
                } else if (scale === "week") {
                    const endLabel = new Date(columnEnd.getTime() - MS_PER_DAY);
                    label = `${dateFormatter.format(columnStart)} - ${dateFormatter.format(endLabel)}`;
                } else if (scale === "month") {
                    label = new Intl.DateTimeFormat("th-TH", {
                        month: "short",
                        year: "numeric",
                    }).format(columnStart);
                }
                columns.push({
                    key: `${scale}-${index}`,
                    start: columnStart,
                    end: columnEnd,
                    label,
                });
                cursor = columnEnd;
                index += 1;
            }
            return columns;
        },
        [addScaleStep, dateFormatter]
    );

    // moved below timelineBySubtask to avoid TDZ errors

    const updateBoardsWithTask = useCallback((normalizedTask: Task, previousStatusId?: string | null) => {
        const destinationBoardId = normalizedTask.statusId ? String(normalizedTask.statusId) : null;
        const previousBoardId = previousStatusId != null ? String(previousStatusId) : null;

        setBoards((prevBoards) =>
            prevBoards.map((board) => {
                const filteredTasks = board.tasks.filter((task) => task.id !== normalizedTask.id);

                if (destinationBoardId && board.id === destinationBoardId) {
                    return {
                        ...board,
                        tasks: [normalizedTask, ...filteredTasks],
                    };
                }

                if (previousBoardId && previousBoardId !== destinationBoardId && board.id === previousBoardId) {
                    return {
                        ...board,
                        tasks: filteredTasks,
                    };
                }

                if (filteredTasks.length !== board.tasks.length) {
                    return {
                        ...board,
                        tasks: filteredTasks,
                    };
                }

                return board;
            })
        );

        setSelectedTask((prev) =>
            prev && prev.id === normalizedTask.id ? { ...prev, ...normalizedTask } : prev
        );
    }, []);

    const handleOpenTaskModal = (task: Task) => {

        setSelectedTask(task);
        setIsTaskModalOpen(true);
    };

    const handleCloseTaskModal = () => {
        setSelectedTask(null);
        setIsTaskModalOpen(false);
    };

    const fetchProjectMembers = async () => {
        if (!projectId) {
            setProjectMembers([]);
            return;
        }

        try {
            const response = await apiPrivate.get(`/project/members/${projectId}`);
            if (response.status === 200) {
                const members = Array.isArray(response.data?.data)
                    ? response.data.data
                        .map((member: any) => ({
                            userId: member.user_id ?? "",
                            fullName: member.user_account?.full_name ?? undefined,
                            department: member.user_account?.department ?? undefined,
                            avatarUrl: member.user_account?.image ?? undefined,
                        }))
                        .filter((member: ProjectMember) => member.userId)
                    : [];
                setProjectMembers(members);
            }
        } catch (error) {
            console.log(error);
            setProjectMembers([]);
        }
    };

    const formatDateTime = (value?: string) => {
        if (!value) return "-";
        try {
            const date = new Date(value);
            return new Intl.DateTimeFormat("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }).format(date);
        } catch (error) {
            return value;
        }
    };

    const getProgressValue = (value?: string) => {
        if (!value) return 0;
        const numeric = Number(value);
        if (Number.isNaN(numeric)) return 0;
        return Math.min(100, Math.max(0, numeric));
    };

    const getProgressAppearance = (value: number) => {
        let glowColor = "rgba(14,165,233,0.55)";

        if (value <= 25) {
            glowColor = "rgba(16,185,129,0.55)";
        } else if (value <= 50) {
            glowColor = "rgba(14,165,233,0.55)";
        } else if (value <= 75) {
            glowColor = "rgba(234,179,8,0.55)";
        } else {
            glowColor = "rgba(239,68,68,0.55)";
        }

        return {
            gradient: "linear-gradient(90deg, #34d399 0%, #22d3ee 30%, #facc15 55%, #fb923c 75%, #ef4444 100%)",
            glowColor,
        };
    };

    const fillTemplate = useCallback(
        (template: string, replacements: Record<string, string>) => {
            return Object.entries(replacements).reduce(
                (acc, [key, value]) => acc.split(`{${key}}`).join(value ?? ""),
                template ?? ""
            );
        },
        []
    );

    const fetchTaskProject = async (boardsFromStatus?: Board[]) => {
        const baseBoards = boardsFromStatus ?? boards;
        if (!projectId || baseBoards.length === 0) return;

        try {
            const response = await apiPrivate.get(`/project/task/project/${projectId}`);
            if (response.status == 200) {
                const tasks = Array.isArray(response.data.data) ? response.data.data : [];

                const boardsWithTasks = baseBoards.map((board) => {
                    const tasksForBoard = tasks
                        .filter((task: any) => String(task.status_id) === board.id)
                        .map((task: any) => normalizeTaskData(task));

                    return {
                        ...board,
                        tasks: tasksForBoard,
                    };
                });

                setBoards(boardsWithTasks);
            }
        } catch (error) {
            console.log(error);
        }
    }

    const fetchAllStatusTask = async () => {
        if (!projectId) return;

        try {
            const response = await apiPrivate.get(`/project/task-status/get-all-status-by-project/${projectId}`);
            if (response.status == 200 || response.status == 201) {
                const statuses = Array.isArray(response.data.data) ? response.data.data : [];
                const normalizedBoards = statuses.map((status: any) => ({
                    id: String(status.id),
                    title: status.name,
                    tasks: status.tasks ? status.tasks.map((task: any) => normalizeTaskData(task)) : [],
                    isDefault: Boolean(status.is_default),
                    color: status.color ? String(status.color) : undefined,
                }));

                setBoards(normalizedBoards);
                await fetchTaskProject(normalizedBoards);
            }
        } catch (error) {
            console.log(error);
        }
    }

    const fetchTaskLogs = useCallback(async () => {
        if (!projectId) {
            setTaskLogs([]);
            setIsLoadingTaskLogs(false);
            return;
        }

        setIsLoadingTaskLogs(true);
        setTaskLogsError(null);

        try {
            const response = await apiPrivate.get(`/project/task/logs/${projectId}`);
            if (response.status === 200 || response.status === 201) {
                const logs = Array.isArray(response.data?.data)
                    ? response.data.data.map((log: any) => normalizeTaskLog(log))
                    : [];
                setTaskLogs(logs);
            } else {
                setTaskLogs([]);
                setTaskLogsError(t('project.task_logs_error'));
            }
        } catch (error) {
            console.log(error);
            setTaskLogsError(t('project.task_logs_error'));
        } finally {
            setIsLoadingTaskLogs(false);
        }
    }, [projectId, normalizeTaskLog, t]);

    const describeTimelineEvent = useCallback(
        (log: TaskLogEntry) => {
            const parts: string[] = [];
            const statusUnknown = t('project.task_logs_status_unknown');
            const oldStatusLabel = log.oldStatus?.name ?? statusUnknown;
            const newStatusLabel = log.newStatus?.name ?? statusUnknown;
            const statusChanged =
                log.oldStatus?.id !== undefined &&
                log.newStatus?.id !== undefined &&
                log.oldStatus.id !== log.newStatus.id;

            if (statusChanged) {
                const template = t('project.timeline_status_change');
                parts.push(
                    fillTemplate(template, {
                        old: oldStatusLabel,
                        new: newStatusLabel,
                    })
                );
            }

            const hasOldProgress = log.oldProgress != null;
            const hasNewProgress = log.newProgress != null;
            const oldProgressValue = hasOldProgress ? Math.round(Number(log.oldProgress ?? 0)) : null;
            const newProgressValue = hasNewProgress ? Math.round(Number(log.newProgress ?? 0)) : null;

            if (
                oldProgressValue != null &&
                newProgressValue != null &&
                oldProgressValue !== newProgressValue
            ) {
                const template = t('project.timeline_progress_change');
                parts.push(
                    fillTemplate(template, {
                        old: String(oldProgressValue),
                        new: String(newProgressValue),
                    })
                );
            } else if (newProgressValue != null && parts.length === 0) {
                const template = t('project.timeline_progress_only');
                parts.push(
                    fillTemplate(template, {
                        new: String(newProgressValue),
                    })
                );
            }

            return parts.join(" · ");
        },
        [fillTemplate, t]
    );

    const timelineEntries = useMemo(() => {
        if (!Array.isArray(taskLogs) || taskLogs.length === 0) return [];
        return taskLogs
            .filter((log) => Boolean(log.createdAt))
            .map((log) => ({
                ...log,
                timestamp: log.createdAt ? new Date(log.createdAt) : null,
            }))
            .sort((a, b) => {
                const aTime = a.timestamp?.getTime() ?? 0;
                const bTime = b.timestamp?.getTime() ?? 0;
                return bTime - aTime;
            });
    }, [taskLogs]);

    const timelineGroups = useMemo(() => {
        if (timelineEntries.length === 0) return [];
        const groups = new Map<
            string,
            {
                label: string;
                items: (typeof timelineEntries)[number][];
            }
        >();

        timelineEntries.forEach((entry) => {
            const dateKey = entry.timestamp
                ? entry.timestamp.toISOString().split("T")[0]
                : "unknown";
            const displayLabel = entry.timestamp
                ? dateFormatter.format(entry.timestamp)
                : t('project.timeline_unknown_date');
            if (!groups.has(dateKey)) {
                groups.set(dateKey, {
                    label: displayLabel,
                    items: [],
                });
            }
            groups.get(dateKey)?.items.push(entry);
        });

        return Array.from(groups.entries()).map(([key, value]) => ({
            key,
            label: value.label,
            items: value.items,
        }));
    }, [timelineEntries, dateFormatter, t]);

    const timelineBySubtask = useMemo(() => {
        const map = new Map<
            string,
            Array<{
                timestamp: Date;
                progress: number | null;
            }>
        >();
        timelineEntries.forEach((entry) => {
            if (!entry.subtaskId || !entry.timestamp) return;
            const id = String(entry.subtaskId);
            const progress =
                entry.newProgress != null
                    ? Number(entry.newProgress)
                    : entry.oldProgress != null
                        ? Number(entry.oldProgress)
                        : null;
            const arr = map.get(id) ?? [];
            arr.push({
                timestamp: entry.timestamp,
                progress: progress,
            });
            map.set(id, arr);
        });

        map.forEach((arr, key) => {
            map.set(
                key,
                arr.sort(
                    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
                )
            );
        });

        return map;
    }, [timelineEntries]);

    const ganttItems = useMemo(() => {
        const items: Array<{
            id: string;
            taskId: string;
            taskTitle: string;
            subtaskId: string;
            subtaskTitle: string;
            owner: string;
            progress: number;
            start: Date;
            plannedEnd: Date;
            actualEnd: Date;
            displayEnd: Date;
            durationLabel: string;
            statusLabel?: string | null;
            statusColor?: string | null;
            isLate: boolean;
            isEarly: boolean;
            updates: Array<{ timestamp: Date; progress: number | null }>;
            completedDate?: Date | null;
            dueDate?: Date | null;
        }> = [];

        const isTruthy = (value: any) =>
            value === true ||
            value === "true" ||
            value === 1 ||
            value === "1";

        boards.forEach((board) => {
            board.tasks?.forEach((task) => {
                const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
                subtasks.forEach((subtask) => {
                    const start = parseDateValue(subtask.startDate);
                    if (!start) return;

                    const dueDate = parseDateValue(subtask.dueDate);
                    const completedDate = parseDateValue(subtask.completedDate);
                    const hasDue = isTruthy(subtask.hasDueDate) || (dueDate != null);
                    const plannedEnd = hasDue && dueDate ? dueDate : start;
                    const actualEnd = completedDate ?? plannedEnd;
                    const displayEnd = actualEnd > plannedEnd ? actualEnd : plannedEnd;

                    const statusMeta = subtask.statusId ? statusLookup.get(String(subtask.statusId)) : undefined;
                    const owner =
                        (subtask.assignees && subtask.assignees[0]?.fullName) ||
                        (subtask.assignees && subtask.assignees[0]?.userId) ||
                        t('project.gantt_owner_unassigned');
                    const progress = getProgressValue(subtask.progressPercent);
                    const rawDurationDays = Math.round((displayEnd.getTime() - start.getTime()) / MS_PER_DAY);
                    const displayDurationDays = Math.max(0, rawDurationDays);
                    const durationLabel =
                        !hasDue
                            ? 'ไม่มีกำหนดเสร็จ'
                            : displayDurationDays === 1
                                ? t('project.gantt_duration_day')
                                : fillTemplate(t('project.gantt_duration_days'), { count: String(displayDurationDays) });
                    const updates = timelineBySubtask.get(String(subtask.id)) ?? [];
                    const now = new Date();
                    const compareEndForLate = completedDate ?? (progress >= 100 ? now : null);
                    // compare against end-of-day of due date to avoid same-day false late
                    const dueStartOfDay = dueDate ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 0, 0, 0, 0) : null;
                    const dueEndOfDay = dueDate ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 23, 59, 59, 999) : null;
                    const isLate =
                        progress >= 100 &&
                        hasDue &&
                        dueEndOfDay != null &&
                        compareEndForLate != null &&
                        compareEndForLate.getTime() > dueEndOfDay.getTime();

                    const compareEndForEarly = completedDate ?? (progress >= 100 ? now : null);
                    const isEarly =
                        progress >= 100 &&
                        hasDue &&
                        dueStartOfDay != null &&
                        compareEndForEarly != null &&
                        compareEndForEarly.getTime() < dueStartOfDay.getTime();

                    items.push({
                        id: `${task.id}-${subtask.id}`,
                        taskId: task.id,
                        taskTitle: task.title ?? t('project.task_logs_untitled_task'),
                        subtaskId: subtask.id,
                        subtaskTitle: subtask.title ?? "",
                        owner,
                        progress,
                        start,
                        plannedEnd,
                        actualEnd,
                        displayEnd,
                        durationLabel,
                        statusLabel: subtask.statusLabel ?? statusMeta?.title ?? null,
                        statusColor: statusMeta?.color ?? board.color ?? null,
                        isLate,
                        isEarly,
                        updates,
                        completedDate,
                        dueDate: hasDue ? dueDate ?? null : null,
                    });
                });
            });
        });

        return items.sort((a, b) => a.start.getTime() - b.start.getTime());
    }, [boards, parseDateValue, statusLookup, getProgressValue, fillTemplate, t, timelineBySubtask]);

    const [ganttScale, setGanttScale] = useState<"day" | "week" | "month">("week");

    const ganttRange = useMemo(() => {
        if (ganttItems.length === 0) return null;
        let min = ganttItems[0].start;
        let max = ganttItems[0].displayEnd;
        ganttItems.forEach((item) => {
            if (item.start < min) min = item.start;
            if (item.displayEnd > max) max = item.displayEnd;
        });
        let alignedStart = alignDateToScaleStart(min, ganttScale);
        let alignedEnd = alignDateToScaleStart(max, ganttScale);
        while (alignedEnd <= max) {
            alignedEnd = addScaleStep(alignedEnd, ganttScale);
        }
        if (alignedEnd <= alignedStart) {
            alignedEnd = addScaleStep(alignedStart, ganttScale);
        }
        return { start: alignedStart, end: alignedEnd };
    }, [ganttItems, alignDateToScaleStart, addScaleStep, ganttScale]);

    const ganttColumns = useMemo(() => {
        if (!ganttRange) return [];
        return buildGanttColumns(ganttRange.start, ganttRange.end, ganttScale);
    }, [buildGanttColumns, ganttRange, ganttScale]);

    const ganttScaleLabels = useMemo(() => {
        if (!ganttRange) return null;
        const startLabel = fillTemplate(t('project.gantt_range_start'), {
            date: dateFormatter.format(ganttRange.start),
        });
        const endLabel = fillTemplate(t('project.gantt_range_end'), {
            date: dateFormatter.format(ganttRange.end),
        });
        const midTime =
            ganttRange.start.getTime() +
            (ganttRange.end.getTime() - ganttRange.start.getTime()) / 2;
        const midLabel = fillTemplate(t('project.gantt_range_mid'), {
            date: dateFormatter.format(new Date(midTime)),
        });
        return { startLabel, midLabel, endLabel };
    }, [ganttRange, dateFormatter, fillTemplate, t]);

    const ganttStatusLegend = useMemo(() => {
        const legend: Array<{ label: string; color: string }> = [];
        const seen = new Set<string>();
        ganttItems.forEach((item) => {
            if (!item.statusLabel) return;
            const key = `${item.statusLabel}|${item.statusColor ?? ""}`;
            if (seen.has(key)) return;
            seen.add(key);
            legend.push({
                label: item.statusLabel,
                color: item.statusColor ?? "rgba(59,130,246,0.75)",
            });
        });
        return legend;
    }, [ganttItems]);

    const ganttGroups = useMemo(() => {
        const byTask = new Map<string, { taskId: string; taskTitle: string; items: typeof ganttItems }>();
        ganttItems.forEach((it) => {
            const key = it.taskId;
            if (!byTask.has(key)) {
                byTask.set(key, { taskId: it.taskId, taskTitle: it.taskTitle, items: [] });
            }
            byTask.get(key)!.items.push(it);
        });
        const groups = Array.from(byTask.values());
        groups.forEach((g) => g.items.sort((a, b) => a.start.getTime() - b.start.getTime()));
        groups.sort((a, b) => (a.items[0]?.start.getTime() ?? 0) - (b.items[0]?.start.getTime() ?? 0));
        return groups;
    }, [ganttItems]);


    useEffect(() => {
        fetchAllStatusTask();
        fetchProjectMembers();
        fetchTaskLogs();
    }, [projectId, normalizeTaskData, fetchTaskLogs]);

    useEffect(() => {
        if (!projectId) return;
        const socket = getSocket();
        socketRef.current = socket;
        if (!socket.connected) socket.connect();

        const handleTaskMoved = (payload: TaskMovedEvent) => {
            if (!payload) return;
            if (Number(payload.projectId) !== Number(projectId)) return;
            const normalizedTask = normalizeTaskData(payload.task);
            const previousStatusId = payload.previousStatusId != null ? String(payload.previousStatusId) : undefined;
            updateBoardsWithTask(normalizedTask, previousStatusId);
        };

        socket.emit("joinProject", projectId);
        socket.on("project:task:moved", handleTaskMoved);

        return () => {
            socket.emit("leaveProject", projectId);
            socket.off("project:task:moved", handleTaskMoved);
        };
    }, [projectId, normalizeTaskData, updateBoardsWithTask]);

    useEffect(() => {
        if (activeTab === "logs" || activeTab === "timeline" || activeTab === "gantt") {
            fetchTaskLogs();
        }
    }, [activeTab, fetchTaskLogs]);


    const handleDragEnd = async (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        const cloneBoards = (data: Board[]) =>
            data.map((board) => ({
                ...board,
                tasks: [...board.tasks],
            }));

        const originalBoards = cloneBoards(boards);
        const updatedBoards = cloneBoards(boards);

        const sourceBoard = updatedBoards.find((b) => b.id === source.droppableId);
        const destBoard = updatedBoards.find((b) => b.id === destination.droppableId);

        if (!sourceBoard || !destBoard) return;

        const [movedTask] = sourceBoard.tasks.splice(source.index, 1);
        if (!movedTask) return;

        const movedTaskWithStatus: Task = {
            ...movedTask,
            statusId: destBoard.id,
            statusLabel: destBoard.title,
        };

        destBoard.tasks.splice(destination.index, 0, movedTaskWithStatus);

        setBoards(updatedBoards);

        if (sourceBoard.id !== destBoard.id) {
            setSelectedTask((prev) =>
                prev && prev.id === movedTask.id
                    ? { ...prev, statusId: destBoard.id, statusLabel: destBoard.title }
                    : prev
            );
        }

        if (sourceBoard.id === destBoard.id) {
            return;
        }

        try {
            await apiPrivate.patch(`/project/task/${movedTask.id}/move`, {
                status_id: Number(destBoard.id),
            });
        } catch (error) {
            console.error("Failed to move task", error);
            setBoards(originalBoards);
            if (sourceBoard.id !== destBoard.id) {
                setSelectedTask((prev) =>
                    prev && prev.id === movedTask.id
                        ? { ...prev, statusId: sourceBoard.id, statusLabel: sourceBoard.title }
                        : prev
                );
            }
        }
    };

    return (
        <>
            <style jsx global>{`
                @keyframes kanban-progress-gradient {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }

                @keyframes kanban-progress-glow {
                    0%,
                    100% {
                        box-shadow: 0 0 12px -6px var(--glow-color, rgba(59, 130, 246, 0.45));
                    }
                    50% {
                        box-shadow: 0 0 22px -4px var(--glow-color, rgba(59, 130, 246, 0.65));
                    }
                }

                .progress-bar-fill {
                    animation: kanban-progress-gradient 4s ease-in-out infinite,
                        kanban-progress-glow 2.8s ease-in-out infinite;
                }

                /* Gantt late highlighting */
                @keyframes gantt-stripes-shift {
                    from { background-position: 0 0; }
                    to { background-position: 48px 0; }
                }
                .gantt-late-stripes {
                    position: relative;
                    isolation: isolate;
                }
                .gantt-late-stripes::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    border-radius: 9999px;
                    background-image: repeating-linear-gradient(
                        45deg,
                        rgba(255,255,255,0.22) 0px,
                        rgba(255,255,255,0.22) 6px,
                        rgba(255,255,255,0.38) 6px,
                        rgba(255,255,255,0.38) 12px
                    );
                    mix-blend-mode: overlay;
                    animation: gantt-stripes-shift 12s linear infinite;
                    pointer-events: none;
                }
            `}</style>
            <div className="relative min-h-[82vh] rounded-3xl border border-slate-100 bg-slate-50/80 p-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm">
                        {tabOptions.map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => setActiveTab(option.key)}
                                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition focus:outline-none ${activeTab === option.key
                                    ? "bg-primary-600 text-white shadow"
                                    : "text-slate-500 hover:text-primary-500"
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {activeTab !== "board" && (
                        <button
                            type="button"
                            onClick={() => fetchTaskLogs()}
                            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary-200 hover:text-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={isLoadingTaskLogs}
                        >
                            <FiRefreshCw className={isLoadingTaskLogs ? "animate-spin" : ""} size={14} />
                            {t('project.task_logs_refresh')}
                        </button>
                    )}
                </div>
                {activeTab === "board" && (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <div className="flex gap-6 overflow-x-auto pb-4">
                            {boards.map((board) => {
                                const tasks = board.tasks ?? [];

                                return (
                                    <Droppable droppableId={board.id} key={board.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-22px_rgba(15,23,42,0.5)] transition-all duration-200 hover:border-primary-200/60 hover:shadow-[0_18px_38px_-24px_rgba(15,23,42,0.45)] ${snapshot.isDraggingOver ? "ring-2 ring-primary-200/60" : ""}`}
                                                style={{
                                                    width: "20rem",
                                                    maxHeight: "82vh",
                                                    flexShrink: 0,
                                                    borderTop: `6px solid ${board.color ?? "#e2e8f0"}`,
                                                }}
                                            >
                                                <div
                                                    className="flex items-center justify-between rounded-t-xl px-5 py-4 text-sm text-slate-700"
                                                    style={{
                                                        background: "#ffffff",
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600"
                                                            style={{
                                                                color: board.color ?? "#1f2937",
                                                            }}
                                                        >
                                                            {(board.title ?? "?").slice(0, 2)}
                                                        </div>
                                                        <div>
                                                            <h2 className="font-semibold text-base leading-tight">
                                                                {board.title}
                                                            </h2>
                                                            <span className="text-xs text-slate-400">
                                                                {tasks.length} {t('project.tasks')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {board.isDefault && (
                                                        <button
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-500"
                                                            type="button"
                                                            aria-label="Add task"
                                                            onClick={() => {
                                                                setOpenModalIsDefault(true)
                                                            }}
                                                        >
                                                            <FaPlus size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div
                                                    className="flex-1 overflow-y-auto p-4"
                                                    style={{
                                                        height: "calc(82vh - 110px)",
                                                    }}
                                                >
                                                    {tasks.length === 0 && (
                                                        <div className="flex h-[130px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                                                            {t('project.drop_card_here')}
                                                        </div>
                                                    )}

                                                    {tasks.map((task, index) => {
                                                        const priorityMeta = task.priority ? priorityConfig[task.priority] : undefined;
                                                        const badgeClass = priorityMeta?.badgeClass ?? "border-slate-200 bg-slate-100 text-slate-500";
                                                        const dotClass = priorityMeta?.dotClass ?? "bg-slate-400";
                                                        const priorityLabel = priorityMeta?.label ?? (task.priority ? `${task.priority.charAt(0).toUpperCase()}${task.priority.slice(1)}` : "No Priority");
                                                        const progressValue = getProgressValue(task.progressPercent);
                                                        const hasProgress = task.progressPercent != null && task.progressPercent !== "";
                                                        const progressAppearance = getProgressAppearance(progressValue);

                                                        return (
                                                            <Draggable
                                                                key={task.id}
                                                                draggableId={task.id}
                                                                index={index}
                                                            >
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        className={`relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.45)] transition-all duration-200 ${snapshot.isDragging
                                                                            ? "scale-[1.01] border-primary-200 shadow-[0_18px_38px_-24px_rgba(59,130,246,0.35)]"
                                                                            : "hover:border-primary-200 hover:shadow-[0_16px_30px_-24px_rgba(59,130,246,0.22)]"
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <h3 className="text-sm font-semibold leading-snug text-slate-800">
                                                                                {task.title}
                                                                            </h3>
                                                                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold tracking-wide text-slate-500">
                                                                                #{task.id}
                                                                            </span>
                                                                        </div>

                                                                        {hasProgress && (
                                                                            <div className="space-y-1.5">
                                                                                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                                                                    <span>{t('project.progress')}</span>
                                                                                    <span className="text-slate-500">{progressValue}%</span>
                                                                                </div>
                                                                                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                                                    <div
                                                                                        className="progress-bar-fill absolute inset-y-0 left-0 rounded-full"
                                                                                        style={{
                                                                                            width: `${progressValue}%`,
                                                                                            background: progressAppearance.gradient,
                                                                                            backgroundSize: "200% 100%",
                                                                                            ["--glow-color" as any]: progressAppearance.glowColor,
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                                                            <div
                                                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold uppercase tracking-wide ${badgeClass}`}
                                                                            >
                                                                                <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                                                                                {priorityLabel}
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
                                                                                onClick={() => handleOpenTaskModal(task)}
                                                                            >
                                                                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                                                {t('project.view_details')}
                                                                                <FiChevronRight size={12} />
                                                                            </button>
                                                                        </div>
                                                                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                                                                            <span className="inline-flex items-center gap-2">
                                                                                <span className="h-1 w-1 rounded-full bg-primary-200" />
                                                                                {t('project.drag_to_change_status')}
                                                                            </span>
                                                                            <FiChevronRight className="text-slate-300" size={13} />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        );
                                                    })}

                                                    {provided.placeholder}
                                                </div>
                                            </div>
                                        )}
                                    </Droppable>
                                );
                            })}
                        </div>
                    </DragDropContext>
                )}
                {activeTab === "logs" && (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-base font-semibold text-slate-700">{t('project.task_logs_heading')}</h2>
                        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.4)]">
                            {isLoadingTaskLogs ? (
                                <p className="text-sm text-slate-500">{t('project.task_logs_loading')}</p>
                            ) : taskLogsError ? (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-600">
                                    {taskLogsError}
                                </div>
                            ) : taskLogs.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                    {t('project.task_logs_empty')}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {taskLogs.map((log) => {
                                        const actorName = log.changedByName ?? log.changedBy ?? t('project.task_logs_unknown_user');
                                        const timestamp = log.createdAt ? formatDateTime(log.createdAt) : null;
                                        const statusInfo = (status: TaskLogStatus | null | undefined) => ({
                                            label: status?.name ?? t('project.task_logs_status_unknown'),
                                            color: status?.color ?? "#94a3b8",
                                        });
                                        const oldStatusInfo = statusInfo(log.oldStatus);
                                        const newStatusInfo = statusInfo(log.newStatus);
                                        const showStatus = Boolean(log.oldStatus || log.newStatus);
                                        const showProgress =
                                            log.oldProgress != null &&
                                            log.newProgress != null &&
                                            Number(log.oldProgress) !== Number(log.newProgress);

                                        return (
                                            <div
                                                key={log.id}
                                                className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)]"
                                            >
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">
                                                            {log.taskTitle ?? t('project.task_logs_untitled_task')}
                                                        </p>
                                                        <p className="text-xs text-slate-400">#{log.taskId}</p>
                                                    </div>
                                                    {log.subtaskTitle && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                                            {t('project.task_logs_subtask')}
                                                            <span className="font-semibold text-slate-600">{log.subtaskTitle}</span>
                                                        </span>
                                                    )}
                                                    {timestamp && (
                                                        <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                                                            <FiClock size={12} />
                                                            {timestamp}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex flex-wrap items-center gap-2 text-slate-500">
                                                        <span className="font-semibold text-slate-600">
                                                            {t('project.task_logs_changed_by_label')}
                                                        </span>
                                                        <span className="text-slate-700">
                                                            {actorName}
                                                            {log.changedByDepartment ? ` • ${log.changedByDepartment}` : ""}
                                                        </span>
                                                    </div>
                                                    {showStatus && (
                                                        <div className="flex flex-wrap items-center gap-2 text-slate-600">
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                                {t('project.task_logs_status')}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                                                                <span
                                                                    className="h-2 w-2 rounded-full"
                                                                    style={{ backgroundColor: oldStatusInfo.color ?? "#94a3b8" }}
                                                                />
                                                                {oldStatusInfo.label}
                                                            </span>
                                                            <FiChevronRight className="text-slate-300" size={12} />
                                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                                                                <span
                                                                    className="h-2 w-2 rounded-full"
                                                                    style={{ backgroundColor: newStatusInfo.color ?? "#94a3b8" }}
                                                                />
                                                                {newStatusInfo.label}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {showProgress && (
                                                        <div className="flex flex-wrap items-center gap-2 text-slate-600">
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                                {t('project.task_logs_progress')}
                                                            </span>
                                                            <span className="font-semibold text-slate-600">
                                                                {Math.round(Number(log.oldProgress ?? 0))}%
                                                            </span>
                                                            <FiChevronRight className="text-slate-300" size={12} />
                                                            <span className="font-semibold text-slate-600">
                                                                {Math.round(Number(log.newProgress ?? 0))}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === "timeline" && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base font-semibold text-slate-700">{t('project.timeline_heading')}</h2>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.4)]">
                            {isLoadingTaskLogs ? (
                                <p className="text-sm text-slate-500">{t('project.timeline_loading')}</p>
                            ) : taskLogsError ? (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-600">
                                    {taskLogsError}
                                </div>
                            ) : timelineEntries.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                    {t('project.timeline_empty')}
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {timelineGroups.map((group) => (
                                        <div key={group.key}>
                                            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                                                {group.label}
                                            </h3>
                                            <div className="space-y-4 border-l border-slate-200 pl-6">
                                                {group.items.map((log) => {
                                                    const actorName = log.changedByName ?? log.changedBy ?? t('project.task_logs_unknown_user');
                                                    const timestamp = log.timestamp ? formatDateTime(log.timestamp.toISOString()) : null;
                                                    const statusInfo = (status: TaskLogStatus | null | undefined) => ({
                                                        label: status?.name ?? t('project.task_logs_status_unknown'),
                                                        color: status?.color ?? "#94a3b8",
                                                    });
                                                    const oldStatusInfo = statusInfo(log.oldStatus);
                                                    const newStatusInfo = statusInfo(log.newStatus);
                                                    const showStatus =
                                                        Boolean(log.oldStatus || log.newStatus) &&
                                                        (log.oldStatus?.id !== log.newStatus?.id);
                                                    const showProgress =
                                                        log.oldProgress != null &&
                                                        log.newProgress != null &&
                                                        Number(log.oldProgress) !== Number(log.newProgress);
                                                    const eventDescription = describeTimelineEvent(log);

                                                    return (
                                                        <div key={`${log.id}-${log.taskId}`} className="relative">
                                                            <span className="absolute -left-[13px] top-6 h-3 w-3 rounded-full border-2 border-white bg-primary-500 shadow-[0_0_0_4px_rgba(59,130,246,0.15)]" />
                                                            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)]">
                                                                <div className="flex flex-wrap items-start gap-3">
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-slate-800">
                                                                            {log.taskTitle ?? t('project.task_logs_untitled_task')}
                                                                        </p>
                                                                        <p className="text-xs text-slate-400">#{log.taskId}</p>
                                                                        {log.subtaskTitle && (
                                                                            <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                                                                {t('project.timeline_subtask_label')}
                                                                                <span className="font-semibold text-slate-600">{log.subtaskTitle}</span>
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    {timestamp && (
                                                                        <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                                                                            <FiClock size={12} />
                                                                            {timestamp}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {eventDescription && (
                                                                    <p className="mt-3 text-sm font-medium text-slate-700">
                                                                        {eventDescription}
                                                                    </p>
                                                                )}
                                                                <div className="mt-3 space-y-2 text-xs text-slate-500">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span className="font-semibold text-slate-600">
                                                                            {t('project.timeline_assignee')}
                                                                        </span>
                                                                        <span className="text-slate-700">
                                                                            {actorName}
                                                                            {log.changedByDepartment ? ` • ${log.changedByDepartment}` : ""}
                                                                        </span>
                                                                    </div>
                                                                    {showStatus && (
                                                                        <div className="flex flex-wrap items-center gap-2 text-slate-600">
                                                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                                                {t('project.task_logs_status')}
                                                                            </span>
                                                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                                                                                <span
                                                                                    className="h-2 w-2 rounded-full"
                                                                                    style={{ backgroundColor: oldStatusInfo.color ?? "#94a3b8" }}
                                                                                />
                                                                                {oldStatusInfo.label}
                                                                            </span>
                                                                            <FiChevronRight className="text-slate-300" size={12} />
                                                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                                                                                <span
                                                                                    className="h-2 w-2 rounded-full"
                                                                                    style={{ backgroundColor: newStatusInfo.color ?? "#94a3b8" }}
                                                                                />
                                                                                {newStatusInfo.label}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {showProgress && (
                                                                        <div className="flex flex-wrap items-center gap-2 text-slate-600">
                                                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                                                {t('project.task_logs_progress')}
                                                                            </span>
                                                                            <span className="font-semibold text-slate-600">
                                                                                {Math.round(Number(log.oldProgress ?? 0))}%
                                                                            </span>
                                                                            <FiChevronRight className="text-slate-300" size={12} />
                                                                            <span className="font-semibold text-slate-600">
                                                                                {Math.round(Number(log.newProgress ?? 0))}%
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === "gantt" && (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <h2 className="text-base font-semibold text-slate-700">{t('project.gantt_heading')}</h2>
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <span>{t('project.gantt_scale_label')}</span>
                                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                                        {ganttScaleOptions.map((option) => (
                                            <button
                                                key={option.key}
                                                type="button"
                                                onClick={() => setGanttScale(option.key)}
                                                className={`rounded-full px-3 py-1 font-semibold transition ${ganttScale === option.key ? "bg-primary-600 text-white shadow" : "text-slate-500 hover:text-primary-500"
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {ganttScaleLabels && (
                                <div className="flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    <span>{ganttScaleLabels.startLabel}</span>
                                    <span>{ganttScaleLabels.midLabel}</span>
                                    <span>{ganttScaleLabels.endLabel}</span>
                                </div>
                            )}
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.4)]">
                            {ganttItems.length === 0 || !ganttRange ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                    {t('project.gantt_empty')}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[960px] rounded-xl border border-slate-200">
                                        <div className="grid grid-cols-[minmax(320px,360px)_1fr] border-b border-slate-200 bg-slate-50">
                                            <div className="grid grid-cols-[2fr,0.9fr,1.1fr,1fr,1fr,1fr] items-center gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                                <span>{t('project.task_logs_subtask')}</span>
                                                <span>%</span>
                                                <span>{t('project.timeline_assignee')}</span>
                                                <span>{t('project.gantt_duration_label')}</span>
                                                <span>{t('project.gantt_start_column')}</span>
                                                <span>{t('project.gantt_end_column')}</span>
                                            </div>
                                            <div
                                                className="grid items-center border-l border-slate-200 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600"
                                                style={{ gridTemplateColumns: `repeat(${ganttColumns.length}, minmax(96px, 1fr))` }}
                                            >
                                                {ganttColumns.map((column) => (
                                                    <div key={column.key} className="px-3 py-3">
                                                        <span className="block truncate">{column.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {ganttGroups.map((group, groupIndex) => (
                                            <div key={`group-${group.taskId}`}>
                                                <div className="grid grid-cols-[minmax(320px,360px)_1fr] border-t border-slate-200 bg-slate-50/80">
                                                    <div className="px-4 py-2.5 text-[13px] font-semibold text-slate-700">
                                                        <span className="mr-2 text-slate-400">Task</span>
                                                        <span className="text-slate-800">{group.taskTitle}</span>
                                                        <span className="ml-2 text-xs font-semibold text-slate-400">#{group.taskId}</span>
                                                    </div>
                                                    <div className="border-l border-slate-200" />
                                                </div>
                                                {group.items.map((item, index) => {
                                                    const isStriped = index % 2 === 1;
                                                    const rowBackground = isStriped ? "bg-slate-50" : "bg-white";
                                                    const totalMs = Math.max(1, ganttRange.end.getTime() - ganttRange.start.getTime());
                                                    const plannedDurationMs = Math.max(item.plannedEnd.getTime() - item.start.getTime(), MS_PER_DAY * 0.45);
                                                    const progressRatio = Math.min(1, Math.max(0, item.progress / 100));
                                                    const actualEndMs =
                                                        item.progress >= 100
                                                            ? (item.isEarly ? item.actualEnd.getTime() : item.plannedEnd.getTime())
                                                            : item.start.getTime() + plannedDurationMs * progressRatio;
                                                    const actualDurationMs = Math.max(actualEndMs - item.start.getTime(), MS_PER_DAY * 0.35);
                                                    const planLeft = Math.min(Math.max(0, (item.start.getTime() - ganttRange.start.getTime()) / totalMs * 100), 100);
                                                    const planWidth = Math.min(100 - planLeft, Math.max((plannedDurationMs / totalMs) * 100, 2.75));
                                                    let actualLeft = Math.min(Math.max(0, (item.start.getTime() - ganttRange.start.getTime()) / totalMs * 100), 100);
                                                    let actualWidth = Math.min(100 - actualLeft, Math.max((actualDurationMs / totalMs) * 100, 2.75));
                                                    if (item.progress >= 100 && !item.isEarly) {
                                                        // Force the actual bar to match plan when finished on/after due (not early)
                                                        actualLeft = planLeft;
                                                        actualWidth = planWidth;
                                                    }
                                                    const barColor = item.statusColor ?? "rgba(59,130,246,0.85)";
                                                    const actualColor = item.isLate ? "#ef4444" : (item.isEarly ? "#10b981" : barColor);
                                                    const progressText = `${Math.round(item.progress)}%`;
                                                    const updateMarkers = item.updates
                                                        .map((update) => {
                                                            const ts = update.timestamp.getTime();
                                                            if (ts < ganttRange.start.getTime() || ts > ganttRange.end.getTime()) return null;
                                                            const left = ((ts - ganttRange.start.getTime()) / totalMs) * 100;
                                                            return {
                                                                left,
                                                                progress: update.progress != null ? Math.round(update.progress) : null,
                                                                timestamp: update.timestamp,
                                                            };
                                                        })
                                                        .filter(Boolean) as Array<{ left: number; progress: number | null; timestamp: Date }>;

                                                    // In-bar markers (positioned relative to actual bar)
                                                    const barSpanStart = item.start.getTime();
                                                    const barSpanEnd = item.displayEnd.getTime();
                                                    const barSpanMs = Math.max(1, barSpanEnd - barSpanStart);
                                                    const inBarMarkers = item.updates
                                                        .map((update) => {
                                                            const ts = update.timestamp.getTime();
                                                            if (ts < barSpanStart || ts > barSpanEnd) return null;
                                                            const left = ((ts - barSpanStart) / barSpanMs) * 100;
                                                            return {
                                                                left,
                                                                progress: update.progress != null ? Math.round(update.progress) : null,
                                                                timestamp: update.timestamp,
                                                            };
                                                        })
                                                        .filter(Boolean) as Array<{ left: number; progress: number | null; timestamp: Date }>;

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`grid grid-cols-[minmax(320px,360px)_1fr] border-t border-slate-200 ${rowBackground}`}
                                                        >
                                                            <div className="grid grid-cols-[2fr,0.9fr,1.1fr,1fr,1fr,1fr] items-center gap-3 px-4 py-3 text-sm text-slate-600">
                                                                <div className="flex flex-col gap-1 pr-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="max-w-[210px] truncate font-semibold text-slate-800">{item.taskTitle}</span>
                                                                        <span className="text-xs font-semibold text-slate-400">#{item.subtaskId}</span>
                                                                    </div>
                                                                    {item.subtaskTitle && (
                                                                        <p className="text-xs text-slate-500">{item.subtaskTitle}</p>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="relative h-5 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                                                                        <div
                                                                            className="absolute inset-y-0 left-0 bg-primary-500/80"
                                                                            style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                                                                        />
                                                                        <span className="relative z-10 flex h-full items-center justify-center text-[10px] font-semibold text-primary-900">
                                                                            {progressText}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <span className="truncate text-xs text-slate-600">{item.owner}</span>
                                                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                                                                    <span>{item.durationLabel}</span>
                                                                    {item.isLate && (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-[2px] text-[10px] font-semibold text-rose-600">
                                                                            {t('project.gantt_late_badge')}
                                                                        </span>
                                                                    )}
                                                                    {!item.isLate && item.isEarly && (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-[2px] text-[10px] font-semibold text-emerald-700">
                                                                            เสร็จก่อนกำหนด
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs text-slate-600">{dateFormatter.format(item.start)}</span>
                                                                <div className="text-xs text-slate-600">
                                                                    {item.dueDate ? dateFormatter.format(item.plannedEnd) : '-'}
                                                                    {item.dueDate && item.completedDate && (
                                                                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-slate-500">
                                                                            • {t('project.gantt_actual_label')} {dateFormatter.format(item.actualEnd)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="relative h-16 border-l border-slate-200">
                                                                <div
                                                                    className="absolute inset-0 grid"
                                                                    style={{ gridTemplateColumns: `repeat(${ganttColumns.length}, minmax(96px, 1fr))` }}
                                                                >
                                                                    {ganttColumns.map((column, columnIndex) => {
                                                                        const shade = columnIndex % 2 === 0 ? "rgba(148,163,184,0.08)" : "transparent";
                                                                        return (
                                                                            <div
                                                                                key={`${item.id}-col-${column.key}`}
                                                                                className={`border-l border-slate-100 ${columnIndex === ganttColumns.length - 1 ? "border-r" : ""}`}
                                                                                style={{ backgroundColor: shade }}
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-200/80" />
                                                                <div
                                                                    className="absolute top-1/2 -translate-y-1/2 rounded-full"
                                                                    style={{
                                                                        left: `${planLeft}%`,
                                                                        width: `${planWidth}%`,
                                                                        minWidth: "48px",
                                                                        height: "10px",
                                                                        backgroundColor: "rgba(148,163,184,0.25)",
                                                                        border: "1px dashed rgba(148,163,184,0.6)",
                                                                        transition: "left 0.2s ease, width 0.2s ease",
                                                                    }}
                                                                    aria-hidden="true"
                                                                />
                                                                <div
                                                                    className={`absolute top-1/2 flex h-7 -translate-y-1/2 items-center gap-2 overflow-hidden rounded-full px-2.5 text-[11px] font-semibold text-white shadow ring-1 ring-slate-200/70 ${item.isLate ? "gantt-late-stripes" : ""}`}
                                                                    style={{
                                                                        left: `${actualLeft}%`,
                                                                        width: `${actualWidth}%`,
                                                                        minWidth: "68px",
                                                                        background: `${actualColor}`,
                                                                        boxShadow: `0 10px 24px -16px ${actualColor}`,
                                                                        transition: "left 0.2s ease, width 0.2s ease",
                                                                    }}
                                                                >
                                                                    <span className="truncate">{item.subtaskTitle || item.taskTitle}</span>
                                                                    <span className="rounded-full bg-white/95 px-2 py-[1px] text-[10px] font-semibold text-slate-700 shadow-sm">
                                                                        {progressText}
                                                                    </span>
                                                                    {/* end-cap marker for readability */}
                                                                    <span
                                                                        className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-white ${item.isLate ? 'ring-2 ring-rose-400' : item.isEarly ? 'ring-2 ring-emerald-500' : 'ring-2 ring-white/60'}`}
                                                                        aria-hidden="true"
                                                                    />
                                                                    {/* in-bar update markers */}
                                                                    <div className="absolute inset-0">
                                                                        {inBarMarkers.map((marker, markerIndex) => (
                                                                            <div
                                                                                key={`${item.id}-inbar-${markerIndex}`}
                                                                                className="absolute z-10 cursor-help"
                                                                                style={{ left: `${Math.min(98, Math.max(2, marker.left))}%`, transform: "translateX(-50%)", width: "16px", top: 0, bottom: 0 }}
                                                                                title={`${marker.progress != null ? marker.progress + '%' : ''} ${formatDateTime(marker.timestamp.toISOString())}`.trim()}
                                                                            >
                                                                                <div className="absolute top-1 bottom-1 left-1/2 w-[2px] -translate-x-1/2 rounded bg-white/90" />
                                                                                {marker.progress != null && (
                                                                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-2 py-[1px] text-[10px] font-semibold text-primary-600 shadow">
                                                                                        {marker.progress}%
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                {updateMarkers.map((marker, markerIndex) => (
                                                                    <div
                                                                        key={`${item.id}-marker-${markerIndex}`}
                                                                        className="absolute z-10 cursor-help"
                                                                        style={{ left: `${marker.left}%`, transform: "translateX(-50%)", width: "16px", top: 0, bottom: 0 }}
                                                                        title={`${marker.progress != null ? marker.progress + '%' : ''} ${formatDateTime(marker.timestamp.toISOString())}`.trim()}
                                                                    >
                                                                        <div className="absolute top-2 bottom-2 left-1/2 w-[2px] -translate-x-1/2 rounded bg-primary-400/70" />
                                                                        {marker.progress != null && (
                                                                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-[1px] text-[10px] font-semibold text-primary-500 shadow">
                                                                                {marker.progress}%
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                        {ganttStatusLegend.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-xs font-semibold text-slate-500">
                                                <span className="uppercase tracking-wide text-slate-400">{t('project.gantt_status_legend')}</span>
                                                {ganttStatusLegend.map((status) => (
                                                    <span key={status.label} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200">
                                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                                                        <span className="text-slate-600">{status.label}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {selectedTask && (
                    <ModalDetailTask
                        isTaskModalOpen={isTaskModalOpen}
                        handleCloseTaskModal={handleCloseTaskModal}
                        selectedTask={selectedTask}
                        priorityConfig={priorityConfig}
                        getProgressValue={getProgressValue}
                        getProgressAppearance={getProgressAppearance}
                        formatDateTime={formatDateTime}
                        availableAssignees={projectMembers}
                        statusOptions={statusOptions}
                        onSubtaskUpdated={handleSubtaskUpsert}
                        onSubtaskCreated={handleSubtaskUpsert}
                        onTaskProgressChanged={handleTaskProgressChanged}
                    />
                )}

                {openModalIsDefault && (
                    <ModalAddTask fetchTaskProject={fetchTaskProject} open={openModalIsDefault} setOpen={setOpenModalIsDefault} project_id={projectId ?? undefined} boards={boards} />
                )}
            </div>
        </>
    );
}
