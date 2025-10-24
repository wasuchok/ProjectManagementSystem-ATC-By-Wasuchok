"use client";

import ModalAddTask from "@/app/components/boards/modal/ModalAddTask";
import { apiPrivate } from "@/app/services/apiPrivate";
import { decodeSingleHashid } from "@/app/utils/hashids";
import {
    DragDropContext,
    Draggable,
    Droppable,
    DropResult,
} from "@hello-pangea/dnd";
import { useParams } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
    FaPlus
} from "react-icons/fa";

type Task = {
    id: string;
    title: string;
    priority?: string;
};

type Board = {
    id: string;
    title: string;
    tasks: Task[];
    icon?: ReactNode;
    isDefault: boolean;
    color?: string;
};

export default function KanbanBoard() {
    const [boards, setBoards] = useState<Board[]>([])
    const [openModalIsDefault, setOpenModalIsDefault] = useState(false)

    const { id } = useParams()

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

    const fetchTaskProject = async (boardsFromStatus?: Board[]) => {
        const baseBoards = boardsFromStatus ?? boards;
        if (!id || baseBoards.length === 0) return;

        try {
            const response = await apiPrivate.get(`/project/task/project/${decodeSingleHashid(String(id))}`)
            if (response.status == 200) {
                const tasks = Array.isArray(response.data.data) ? response.data.data : [];

                const boardsWithTasks = baseBoards.map((board) => {
                    const tasksForBoard = tasks
                        .filter((task: any) => String(task.status_id) === board.id)
                        .map((task: any) => ({
                            id: String(task.id),
                            title: task.title ?? "",
                            priority: typeof task.priority === "string" ? task.priority.toLowerCase() : undefined,
                        }));

                    return {
                        ...board,
                        tasks: tasksForBoard,
                    };
                });

                setBoards(boardsWithTasks);
            }
        } catch (error) {
            console.log(error)
        }
    }

    const fetchAllStatusTask = async () => {
        if (!id) return;

        try {
            const response = await apiPrivate.get(`/project/task-status/get-all-status-by-project/${decodeSingleHashid(String(id))}`)
            if (response.status == 200 || response.status == 201) {
                const statuses = Array.isArray(response.data.data) ? response.data.data : [];
                const normalizedBoards = statuses.map((status: any) => ({
                    id: String(status.id),
                    title: status.name,
                    tasks: status.tasks ? status.tasks.map((task: any) => ({
                        id: String(task.id),
                        title: task.name ?? task.title ?? "",
                        priority: typeof task.priority === "string" ? task.priority.toLowerCase() : undefined,
                    })) : [],
                    isDefault: Boolean(status.is_default),
                    color: status.color ? String(status.color) : undefined,
                }));

                setBoards(normalizedBoards)
                await fetchTaskProject(normalizedBoards)
            }

        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        fetchAllStatusTask()

    }, [id])


    const handleDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;


        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        )
            return;

        const newBoards = Array.from(boards);
        const sourceBoard = newBoards.find(
            (b) => b.id === source.droppableId
        );
        const destBoard = newBoards.find(
            (b) => b.id === destination.droppableId
        );

        if (!sourceBoard || !destBoard) return;

        const sourceTasks = Array.from(sourceBoard.tasks);
        const destTasks =
            sourceBoard === destBoard
                ? sourceTasks
                : Array.from(destBoard.tasks);

        const [movedTask] = sourceTasks.splice(source.index, 1);
        destTasks.splice(destination.index, 0, movedTask);

        if (sourceBoard === destBoard) {
            sourceBoard.tasks = destTasks;
        } else {
            sourceBoard.tasks = sourceTasks;
            destBoard.tasks = destTasks;
        }

        setBoards(newBoards);
    };

    return (
        <div className="relative">
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-6 overflow-x-auto pb-6 px-1">
                    {boards.map((board) => {
                        const tasks = board.tasks ?? [];

                        return (
                            <Droppable droppableId={board.id} key={board.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`group flex flex-col rounded-2xl border border-transparent bg-gradient-to-b from-white via-slate-50 to-slate-100 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.4)] transition-all duration-200 hover:border-primary-100 hover:shadow-[0_20px_45px_-20px_rgba(15,23,42,0.5)] ${snapshot.isDraggingOver ? "ring-2 ring-offset-2 ring-primary-300" : ""}`}
                                        style={{
                                            width: "20rem",
                                            maxHeight: "82vh",
                                            flexShrink: 0,
                                            borderTop: `6px solid ${board.color ?? "#e2e8f0"}`,
                                        }}
                                    >
                                        <div
                                            className="flex items-center justify-between rounded-t-xl px-5 py-4 text-sm text-white"
                                            style={{
                                                background: board.color ?? "#1f2937",
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xs font-semibold uppercase">
                                                    {(board.title ?? "?").slice(0, 2)}
                                                </div>
                                                <div>
                                                    <h2 className="font-semibold text-base leading-tight">
                                                        {board.title}
                                                    </h2>
                                                    <span className="text-xs text-white/70">
                                                        {tasks.length} งาน
                                                    </span>
                                                </div>
                                            </div>
                                            {board.isDefault && (
                                                <button
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition hover:bg-white/20"
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
                                                <div className="flex h-[130px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/60 text-sm text-gray-400">
                                                    วางการ์ดที่นี่
                                                </div>
                                            )}

                                            {tasks.map((task, index) => {
                                                const priorityMeta = task.priority ? priorityConfig[task.priority] : undefined;
                                                const badgeClass = priorityMeta?.badgeClass ?? "border-slate-200 bg-slate-100 text-slate-500";
                                                const dotClass = priorityMeta?.dotClass ?? "bg-slate-400";
                                                const priorityLabel = priorityMeta?.label ?? (task.priority ? `${task.priority.charAt(0).toUpperCase()}${task.priority.slice(1)}` : "No Priority");

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
                                                                className={`relative flex flex-col gap-3 rounded-xl border border-transparent bg-white/90 p-4 text-sm text-gray-700 shadow-[0_14px_35px_-22px_rgba(15,23,42,0.65)] backdrop-blur-sm transition-all duration-200 ${snapshot.isDragging
                                                                    ? "scale-[1.02] border-primary-200 shadow-[0_22px_40px_-18px_rgba(59,130,246,0.45)]"
                                                                    : "hover:border-primary-200 hover:shadow-[0_20px_36px_-22px_rgba(59,130,246,0.35)]"
                                                                    }`}
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="text-sm font-semibold leading-snug text-gray-800">
                                                                        {task.title}
                                                                    </div>
                                                                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                                        <span className="text-[10px] font-medium text-slate-400">ID</span>
                                                                        <span className="text-slate-600">{task.id}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                                                    <div
                                                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold uppercase tracking-wide ${badgeClass}`}
                                                                    >
                                                                        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                                                                        {priorityLabel}
                                                                    </div>
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                                        รายละเอียด
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-xs text-slate-500">
                                                                    <span className="flex items-center gap-2 text-[11px] font-medium">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-primary-300" />
                                                                        Drag เพื่อเปลี่ยนสถานะ
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className="text-[11px] font-semibold text-primary-500 transition hover:text-primary-600"
                                                                    >
                                                                        ดูเพิ่มเติม
                                                                    </button>
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

            {openModalIsDefault && (
                <ModalAddTask open={openModalIsDefault} setOpen={setOpenModalIsDefault} project_id={decodeSingleHashid(String(id))} boards={boards} />
            )}
        </div>


    );
}
