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
                <div className="flex gap-5 overflow-x-auto pb-4">
                    {boards.map((board) => {
                        const tasks = board.tasks ?? [];

                        return (
                            <Droppable droppableId={board.id} key={board.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`flex flex-col border rounded-xl shadow-sm transition-all duration-200 ${snapshot.isDraggingOver
                                            ? "ring-2 ring-primary-300"
                                            : board.id === "failed"
                                                ? "bg-white/95"
                                                : "bg-white/95"
                                            }`}
                                        style={{
                                            width: "18rem",
                                            maxHeight: "80vh",
                                            flexShrink: 0,
                                            borderTop: `4px solid ${board.color ?? "#e5e7eb"}`,
                                        }}
                                    >
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                            <div className="flex items-center gap-2">
                                                {board.icon}
                                                <h2 className="font-semibold text-gray-700">
                                                    {board.title}
                                                </h2>
                                            </div>
                                            {board.isDefault && (
                                                <button className="text-gray-400 hover:text-primary-500">
                                                    <FaPlus size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <div
                                            className="p-3 space-y-3 overflow-y-auto"
                                            style={{
                                                height: "calc(80vh - 64px)",
                                            }}
                                        >
                                            {tasks.length === 0 && (
                                                <div className="border border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-400 text-center">
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
                                                            className={`border border-gray-200 rounded-md p-3 text-sm text-gray-700 bg-white whitespace-pre-wrap cursor-grab transition-all ${snapshot.isDragging
                                                                ? "bg-primary-100 shadow-md scale-[1.02]"
                                                                : "hover:bg-primary-50 hover:shadow-sm"
                                                                }`}
                                                        >
                                                            {task.title}
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
