"use client";

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
    const { id } = useParams()

    const fetchAllStatusTask = async () => {
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
                    })) : [],
                    isDefault: Boolean(status.is_default),
                    color: status.color ? String(status.color) : undefined,
                }));

                setBoards(normalizedBoards)
            }

        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        fetchAllStatusTask()

    }, [])


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
                                        className={`flex flex-col rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-slate-50 shadow-md transition-all duration-200 ${snapshot.isDraggingOver ? "ring-2 ring-offset-2 ring-primary-300" : ""}`}
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

                                            {tasks.map((task, index) => (
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
                                                            className={`relative rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm transition-all ${snapshot.isDragging
                                                                ? "scale-[1.02] border-primary-200 shadow-lg"
                                                                : "hover:border-primary-200 hover:shadow-md"
                                                                }`}
                                                        >
                                                            <div className="text-sm font-semibold text-gray-800">
                                                                {task.title}
                                                            </div>
                                                            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                                                                <span>รายละเอียดเพิ่มเติม</span>
                                                                <span className="font-medium text-primary-500">ดู</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}

                                            {provided.placeholder}
                                        </div>
                                    </div>
                            )}
                            </Droppable>
                        );
                    })}
                </div>
            </DragDropContext>
        </div>
    );
}
