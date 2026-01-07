"use client";

import ModalAddTask from "@/app/components/boards/modal/ModalAddTask";
import ModalDetailTask from "@/app/components/boards/modal/ModalDetailTask";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { decodeSingleHashid } from "@/app/utils/hashids";
import { getSocket } from "@/app/utils/socket";
import {
    DropResult
} from "@hello-pangea/dnd";
import { useParams, useRouter } from "next/navigation";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiPlay, FiX } from "react-icons/fi";
import type { Socket } from "socket.io-client";
import BoardView from "./components/BoardView";
import GanttView from "./components/GanttView";
import LogsView from "./components/LogsView";
import TimelineView from "./components/TimelineView";
import WorkloadView from "./components/WorkloadView";

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
    const { user } = useUser();
    const { id } = useParams();
    const router = useRouter();
    const [boards, setBoards] = useState<Board[]>([]);
    const [openModalIsDefault, setOpenModalIsDefault] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
    const [activeTab, setActiveTab] = useState<"board" | "logs" | "timeline" | "gantt" | "workload">("board");
    const [taskLogs, setTaskLogs] = useState<TaskLogEntry[]>([]);
    const [isLoadingTaskLogs, setIsLoadingTaskLogs] = useState(false);
    const [taskLogsError, setTaskLogsError] = useState<string | null>(null);
    const [workload, setWorkload] = useState<Array<{ userId: string; name: string; active: number; late: number; avgProgress: number; score: number; reason: string }>>([]);
    const [isLoadingWorkload, setIsLoadingWorkload] = useState(false);
    const [workloadError, setWorkloadError] = useState<string | null>(null);
    const [projectStatus, setProjectStatus] = useState<string | null>(null);
    const [isProjectOwner, setIsProjectOwner] = useState(false);
    const [accessChecked, setAccessChecked] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [isUpdatingProjectStatus, setIsUpdatingProjectStatus] = useState(false);

    const workloadMax = useMemo(() => {
        let maxActive = 1;
        let maxLate = 1;
        workload.forEach((w) => {
            if (w.active > maxActive) maxActive = w.active;
            if (w.late > maxLate) maxLate = w.late;
        });
        return { maxActive, maxLate };
    }, [workload]);
    const isDraftStatus = useMemo(
        () => (projectStatus ?? "").toLowerCase().trim() === "draft",
        [projectStatus]
    );
    const isCancelledStatus = useMemo(
        () => (projectStatus ?? "").toLowerCase().trim() === "cancelled",
        [projectStatus]
    );
    const isCompletedStatus = useMemo(
        () => (projectStatus ?? "").toLowerCase().trim() === "completed",
        [projectStatus]
    );
    const isReadOnlyStatus = useMemo(
        () => isCancelledStatus || isCompletedStatus,
        [isCancelledStatus, isCompletedStatus]
    );
    const canManageTasks = useMemo(
        () => isProjectOwner && !isReadOnlyStatus,
        [isProjectOwner, isReadOnlyStatus]
    );
    const socketRef = useRef<Socket | null>(null);
    const draftRedirectRef = useRef(false);
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
            { key: "workload" as const, label: 'ภาพรวมทีม' },
        ],
        [t]
    );
    const ganttScaleOptions = useMemo(
        () => [
            { value: "day", label: t('project.gantt_scale_day') },
            { value: "week", label: t('project.gantt_scale_week') },
            { value: "month", label: t('project.gantt_scale_month') },
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
        if (isReadOnlyStatus) {
            return;
        }
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
    }, [isReadOnlyStatus]);

    const handleSubtaskUpsert = useCallback((taskId: string, subtask: Subtask) => {
        if (isReadOnlyStatus) {
            return;
        }
        const boardMatch = subtask.statusId
            ? boards.find((board) => board.id === subtask.statusId)
            : undefined;

        const rawProgress =
            subtask.progressPercent ??
            ((subtask as any).progress_percent != null
                ? String((subtask as any).progress_percent)
                : undefined);
        const progressNum =
            rawProgress != null && !Number.isNaN(Number(rawProgress))
                ? Number(rawProgress)
                : null;
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
    }, [boards, isReadOnlyStatus]);

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
            const columns: Array<{ key: string; date: Date; label: string }> = [];
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
                    date: columnStart,
                    label,
                });
                cursor = columnEnd;
                index += 1;
            }
            return columns;
        },
        [addScaleStep, dateFormatter]
    );



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

    const fetchProjectMetadata = useCallback(async () => {
        if (!projectId) {
            return;
        }

        try {
            const response = await apiPrivate.get(`/project/${projectId}`);
            const payload = response?.data?.data ?? response?.data ?? {};

            const statusValue =
                payload?.status ??
                payload?.project_status ??
                payload?.projectStatus ??
                payload?.state ??
                null;
            setProjectStatus(statusValue ?? null);

            const currentUserId = user?.id != null ? String(user.id) : null;
            const matchesCurrentUser = (value: any) =>
                currentUserId != null && value != null && String(value) === currentUserId;

            const ownerCandidates = [
                payload?.created_by,
                payload?.createdBy,
                payload?.owner_id,
                payload?.ownerId,
                payload?.owner?.id,
                payload?.owner?.user_id,
                payload?.owner?.userId,
            ];

            let derivedOwner = false;

            for (const candidate of ownerCandidates) {
                if (typeof candidate === "object" && candidate !== null) {
                    if (
                        matchesCurrentUser(candidate.id) ||
                        matchesCurrentUser(candidate.user_id) ||
                        matchesCurrentUser(candidate.userId)
                    ) {
                        derivedOwner = true;
                        break;
                    }
                    continue;
                }

                if (matchesCurrentUser(candidate)) {
                    derivedOwner = true;
                    break;
                }
            }

            if (!derivedOwner && Array.isArray(payload?.tb_project_members)) {
                derivedOwner = payload.tb_project_members.some((member: any) => {
                    const hasOwnerRole =
                        member?.is_owner === true ||
                        member?.isOwner === true ||
                        member?.owner === true ||
                        (typeof member?.role === "string" && member.role.toLowerCase() === "owner") ||
                        (typeof member?.member_role === "string" && member.member_role.toLowerCase() === "owner") ||
                        (typeof member?.memberRole === "string" && member.memberRole.toLowerCase() === "owner");

                    if (!hasOwnerRole) {
                        return false;
                    }

                    const memberIds = [
                        member?.user_account_id,
                        member?.user_account?.id,
                        member?.user_id,
                        member?.employee_id,
                        member?.id,
                    ];

                    return memberIds.some((idValue) => matchesCurrentUser(idValue));
                });
            }

            setIsProjectOwner(derivedOwner);

            const shouldBlock =
                String(statusValue ?? "").toLowerCase().trim() === "draft" && !derivedOwner;

            setAccessDenied(shouldBlock);
            if (!shouldBlock) {
                draftRedirectRef.current = false;
            }
            if (shouldBlock && !draftRedirectRef.current) {
                draftRedirectRef.current = true;
                if (typeof window !== "undefined") {
                    alert(t("project.status_draft_no_access"));
                }
                router.replace("/boards/view");
            }
        } catch (error) {
            console.error("fetchProjectMetadata error", error);
            setProjectStatus(null);
            setIsProjectOwner(false);
            setAccessDenied(true);
            if (!draftRedirectRef.current) {
                draftRedirectRef.current = true;
                router.replace("/boards/view");
            }
        } finally {
            setAccessChecked(true);
        }
    }, [projectId, router, t, user?.id]);

    useEffect(() => {
        if (!id) {
            return;
        }

        if (!projectId) {
            setAccessChecked(true);
            setAccessDenied(true);
            if (!draftRedirectRef.current) {
                draftRedirectRef.current = true;
                router.replace("/boards/view");
            }
            return;
        }

        fetchProjectMetadata();
    }, [id, projectId, fetchProjectMetadata, router]);

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

    const handleUpdateProjectStatus = async (nextStatus: "started" | "cancelled" | "completed") => {
        if (!projectId || isUpdatingProjectStatus) return;
        setIsUpdatingProjectStatus(true);

        const statusLabel =
            nextStatus === "started"
                ? t("project.status_started")
                : nextStatus === "completed"
                    ? t("project.status_completed")
                    : t("project.status_cancelled");

        try {
            await apiPrivate.patch(`/project/${projectId}`, { status: nextStatus });
            setProjectStatus(nextStatus);

            if (typeof window !== "undefined") {
                const message = fillTemplate(t("project.status_update_success"), { status: statusLabel });
                alert(message);
            }

            await fetchProjectMetadata();
            await fetchAllStatusTask();
        } catch (error) {
            console.error("update project status error", error);
            if (typeof window !== "undefined") {
                alert(t("project.status_update_error"));
            }
        } finally {
            setIsUpdatingProjectStatus(false);
        }
    };

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

    const fetchWorkload = useCallback(async () => {
        if (!projectId) {
            setWorkload([]);
            return;
        }
        setIsLoadingWorkload(true);
        setWorkloadError(null);
        try {
            const response = await apiPrivate.get(`/project/${projectId}/auto-assign`);
            if (response.status === 200 || response.status === 201) {
                const rows = Array.isArray(response.data?.data) ? response.data.data : [];
                setWorkload(rows);
            } else {
                setWorkload([]);
                setWorkloadError('ไม่สามารถโหลดข้อมูลแนะนำผู้รับงานได้');
            }
        } catch (e) {
            setWorkload([]);
            setWorkloadError('ไม่สามารถโหลดข้อมูลแนะนำผู้รับงานได้');
        } finally {
            setIsLoadingWorkload(false);
        }
    }, [projectId]);

    const describeTimelineEvent = useCallback(
        (entry: any) => {
            const log = entry.meta as TaskLogEntry;
            if (!log) return "";

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
                id: log.id,
                date: log.createdAt ? new Date(log.createdAt) : new Date(),
                type: "updated" as const, // Default to updated, logic can be improved
                title: log.taskTitle || log.subtaskTitle || t('project.task_logs_untitled_task'),
                user: log.changedByName || t('project.gantt_owner_unassigned'),
                meta: log,
            }))
            .sort((a, b) => {
                const aTime = a.date.getTime();
                const bTime = b.date.getTime();
                return bTime - aTime;
            });
    }, [taskLogs, t]);

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
            const dateKey = entry.date.toISOString().split("T")[0];
            const displayLabel = dateFormatter.format(entry.date);
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
            const log = entry.meta as TaskLogEntry;
            if (!log || !log.subtaskId) return;
            const id = String(log.subtaskId);
            const progress =
                log.newProgress != null
                    ? Number(log.newProgress)
                    : log.oldProgress != null
                        ? Number(log.oldProgress)
                        : null;
            const arr = map.get(id) ?? [];
            arr.push({
                timestamp: entry.date,
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
                    // If no due date, or due date <= start date (same day), default to 1 day duration for visualization
                    let plannedEnd = hasDue && dueDate ? dueDate : new Date(start.getTime() + MS_PER_DAY);
                    if (plannedEnd.getTime() <= start.getTime()) {
                        plannedEnd = new Date(start.getTime() + MS_PER_DAY);
                    }

                    // Calculate actual end based on progress percentage
                    const duration = plannedEnd.getTime() - start.getTime();
                    const progressVal = Number(subtask.progressPercent || 0);
                    const progressFraction = Math.min(100, Math.max(0, progressVal)) / 100;

                    // If completed, ensure bar fills at least the planned duration (user request)
                    // If late, it extends beyond. If early, it fills the plan.
                    const actualEnd = completedDate
                        ? (completedDate.getTime() > plannedEnd.getTime() ? completedDate : plannedEnd)
                        : new Date(start.getTime() + (duration * progressFraction));

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
                    const dueDayStart = dueDate ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()) : null;
                    const completionSource =
                        completedDate ??
                        (progress >= 100 ? now : null);
                    const completionDayStart = completionSource
                        ? new Date(completionSource.getFullYear(), completionSource.getMonth(), completionSource.getDate())
                        : null;
                    const isLate =
                        progress >= 100 &&
                        Boolean(hasDue) &&
                        dueDayStart != null &&
                        completionDayStart != null &&
                        completionDayStart.getTime() > dueDayStart.getTime();

                    const compareEndForEarly = completionSource;
                    const isEarly =
                        progress >= 100 &&
                        hasDue &&
                        dueDayStart != null &&
                        compareEndForEarly != null &&
                        compareEndForEarly.getTime() < dueDayStart.getTime();

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
        if (!projectId || !accessChecked || accessDenied) return;
        fetchAllStatusTask();
        fetchProjectMembers();
        fetchTaskLogs();
    }, [projectId, accessChecked, accessDenied, normalizeTaskData, fetchTaskLogs]);

    useEffect(() => {
        if (!projectId || !accessChecked || accessDenied) return;
        const socket = getSocket();
        socketRef.current = socket;
        if (!socket.connected) socket.connect();

        const handleTaskCreated = (payload: any) => {
            if (!payload) return;
            if (Number(payload.projectId) !== Number(projectId)) return;
            if (!payload.task) return;
            const normalizedTask = normalizeTaskData(payload.task);
            updateBoardsWithTask(normalizedTask, null);
        };

        const handleTaskMoved = (payload: TaskMovedEvent) => {
            if (!payload) return;
            if (Number(payload.projectId) !== Number(projectId)) return;
            const normalizedTask = normalizeTaskData(payload.task);
            const previousStatusId = payload.previousStatusId != null ? String(payload.previousStatusId) : undefined;
            updateBoardsWithTask(normalizedTask, previousStatusId);
        };

        socket.emit("joinProject", projectId);
        socket.on("project:task:created", handleTaskCreated);
        socket.on("project:task:moved", handleTaskMoved);

        return () => {
            socket.emit("leaveProject", projectId);
            socket.off("project:task:created", handleTaskCreated);
            socket.off("project:task:moved", handleTaskMoved);
        };
    }, [projectId, accessChecked, accessDenied, normalizeTaskData, updateBoardsWithTask]);

    useEffect(() => {
        if (activeTab === "logs" || activeTab === "timeline" || activeTab === "gantt") {
            fetchTaskLogs();
        }
        if (activeTab === "workload") {
            fetchWorkload();
        }
    }, [activeTab, fetchTaskLogs, fetchWorkload]);

    useEffect(() => {
        if (!canManageTasks) {
            setOpenModalIsDefault(false);
        }
    }, [canManageTasks]);


    const handleDragEnd = async (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;
        if (!canManageTasks) return;

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

    if (!accessChecked) {
        return (
            <div className="flex min-h-[82vh] items-center justify-center rounded-3xl border border-slate-100 bg-slate-50/80 p-6 text-slate-500">
                {t("loading_data")}
            </div>
        );
    }

    if (accessDenied) {
        return null;
    }

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
                {isDraftStatus && isProjectOwner && (
                    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm">
                        {t("project.status_draft_owner_hint")}
                    </div>
                )}
                {isReadOnlyStatus && (
                    <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                        {t("project.status_readonly_hint")}
                    </div>
                )}
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
                    {isProjectOwner && (
                        <div className="flex flex-wrap items-center gap-2">
                            {isDraftStatus && (
                                <button
                                    type="button"
                                    onClick={() => handleUpdateProjectStatus("started")}
                                    disabled={isUpdatingProjectStatus}
                                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
                                >
                                    <FiPlay size={14} />
                                    {isUpdatingProjectStatus ? t("project.saving") : t("project.action_start_work")}
                                </button>
                            )}
                            {!isDraftStatus && !isReadOnlyStatus && (
                                <button
                                    type="button"
                                    onClick={() => handleUpdateProjectStatus("completed")}
                                    disabled={isUpdatingProjectStatus}
                                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
                                >
                                    <FiCheck size={14} />
                                    {isUpdatingProjectStatus ? t("project.saving") : t("project.action_complete_project")}
                                </button>
                            )}
                            {!isDraftStatus && !isCancelledStatus && !isCompletedStatus && (
                                <button
                                    type="button"
                                    onClick={() => handleUpdateProjectStatus("cancelled")}
                                    disabled={isUpdatingProjectStatus}
                                    className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
                                >
                                    <FiX size={14} />
                                    {isUpdatingProjectStatus ? t("project.saving") : t("project.action_cancel_project")}
                                </button>
                            )}
                        </div>
                    )}

                </div>
                {activeTab === "board" && (
                    <BoardView
                        boards={boards}
                        canManageTasks={canManageTasks}
                        handleDragEnd={handleDragEnd}
                        handleOpenTaskModal={handleOpenTaskModal}
                        setOpenModalIsDefault={setOpenModalIsDefault}
                        t={t}
                        priorityConfig={priorityConfig}
                        getProgressValue={getProgressValue}
                        getProgressAppearance={getProgressAppearance}
                    />
                )}

                {activeTab === "logs" && (
                    <LogsView
                        taskLogs={taskLogs}
                        isLoadingTaskLogs={isLoadingTaskLogs}
                        taskLogsError={taskLogsError}
                        t={t}
                        formatDateTime={formatDateTime}
                    />
                )}

                {activeTab === "timeline" && (
                    <TimelineView
                        timelineGroups={timelineGroups}
                        isLoadingTaskLogs={isLoadingTaskLogs}
                        taskLogsError={taskLogsError}
                        t={t}
                        formatDateTime={formatDateTime}
                        describeTimelineEvent={describeTimelineEvent}
                    />
                )}

                {activeTab === "gantt" && (
                    <>
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                                {t("project.gantt_help_title")}
                            </p>
                            <p className="mt-1">{t("project.gantt_help_content")}</p>
                            <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.2em]">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                    {t("project.gantt_legend_early")}
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                                    {t("project.gantt_legend_late")}
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                                    {t("project.gantt_legend_overdue")}
                                </div>
                            </div>
                        </div>
                        <GanttView
                            ganttItems={ganttItems}
                            ganttRange={ganttRange}
                            ganttColumns={ganttColumns}
                            ganttScale={ganttScale}
                            setGanttScale={setGanttScale}
                            ganttScaleOptions={ganttScaleOptions}
                            ganttScaleLabels={ganttScaleLabels}
                            ganttStatusLegend={ganttStatusLegend}
                            ganttGroups={ganttGroups}
                            t={t}
                            dateFormatter={(date, options) => new Intl.DateTimeFormat("th-TH", options).format(date)}
                        />
                    </>
                )}

                {activeTab === "workload" && (
                    <WorkloadView
                        workload={workload}
                        isLoadingWorkload={isLoadingWorkload}
                        workloadError={workloadError}
                        fetchWorkload={fetchWorkload}
                        workloadMax={workloadMax}
                        t={t}
                    />
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
                        projectReadOnly={isReadOnlyStatus}
                        isProjectOwner={isProjectOwner}
                    />
                )}

                {openModalIsDefault && (
                    <ModalAddTask fetchTaskProject={fetchTaskProject} open={openModalIsDefault} setOpen={setOpenModalIsDefault} project_id={projectId ?? undefined} boards={boards} />
                )}
            </div>
        </>
    );
}
