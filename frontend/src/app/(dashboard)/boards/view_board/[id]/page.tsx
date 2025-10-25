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
import { FiChevronRight } from "react-icons/fi";
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

export default function KanbanBoard() {
    const { t } = useLanguage();
    const { id } = useParams();
    const [boards, setBoards] = useState<Board[]>([]);
    const [openModalIsDefault, setOpenModalIsDefault] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
    const socketRef = useRef<Socket | null>(null);

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
            statusLabel: subtask.tb_project_task_statuses?.name ?? subtask.statusLabel ?? undefined,
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

    useEffect(() => {
        fetchAllStatusTask();
        fetchProjectMembers();
    }, [projectId, normalizeTaskData]);

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

        destBoard.tasks.splice(destination.index, 0, movedTask);

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
            `}</style>
            <div className="relative min-h-[82vh] rounded-3xl border border-slate-100 bg-slate-50/80 p-6">
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

                {selectedTask && (
                    <ModalDetailTask isTaskModalOpen={isTaskModalOpen} handleCloseTaskModal={handleCloseTaskModal} selectedTask={selectedTask} priorityConfig={priorityConfig} getProgressValue={getProgressValue} getProgressAppearance={getProgressAppearance} formatDateTime={formatDateTime} availableAssignees={projectMembers} onTaskProgressChanged={handleTaskProgressChanged} />
                )}

                {openModalIsDefault && (
                    <ModalAddTask fetchTaskProject={fetchTaskProject} open={openModalIsDefault} setOpen={setOpenModalIsDefault} project_id={projectId ?? undefined} boards={boards} />
                )}
            </div>
        </>
    );
}