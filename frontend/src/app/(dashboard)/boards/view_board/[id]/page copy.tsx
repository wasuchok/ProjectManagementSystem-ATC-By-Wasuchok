"use client";

import {
    DragDropContext,
    Draggable,
    Droppable,
    DropResult,
} from "@hello-pangea/dnd";
import { useState } from "react";
import {
    FaCheckCircle,
    FaPlus,
    FaSpinner,
    FaTasks,
    FaTimesCircle,
} from "react-icons/fa";

export default function KanbanBoard() {
    const [boards, setBoards] = useState([
        {
            id: "todo",
            title: "To Do",
            icon: <FaTasks className="text-primary-500" />,
            tasks: [
                {
                    id: "1",
                    title:
                        "ออกแบบหน้า Login\n- ใช้สีธีมหลัก\n- ปรับปุ่มให้โค้งมน\n- เพิ่ม animation ตอน hover",
                },
                { id: "2", title: "ตั้งค่า Database MySQL" },
            ],
        },
        {
            id: "progress",
            title: "In Progress",
            icon: <FaSpinner className="text-primary-500 animate-spin-slow" />,
            tasks: [
                {
                    id: "3",
                    title:
                        "พัฒนา API Authentication\n- Register / Login\n- JWT Middleware\n- Validate password",
                },
            ],
        },
        {
            id: "done",
            title: "Done",
            icon: <FaCheckCircle className="text-green-500" />,
            tasks: [
                {
                    id: "4",
                    title:
                        "สร้าง Git Repository\n- Push ครั้งแรก\n- เขียน README\n- ตั้ง branch develop",
                },
            ],
        },
        {
            id: "failed",
            title: "Failed",
            icon: <FaTimesCircle className="text-red-500" />,
            tasks: [
                {
                    id: "5",
                    title:
                        "เชื่อมต่อฐานข้อมูลล้มเหลว\n- ตรวจสอบ Environment Variable\n- แก้ไข Connection String",
                },
            ],
        },
    ]);

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
        )!;
        const destBoard = newBoards.find(
            (b) => b.id === destination.droppableId
        )!;

        const [movedTask] = sourceBoard.tasks.splice(source.index, 1);
        destBoard.tasks.splice(destination.index, 0, movedTask);

        setBoards(newBoards);
    };

    return (
        <div className="relative">
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-5 overflow-x-auto pb-4">
                    {boards.map((board) => (
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
                                    }}
                                >

                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                            {board.icon}
                                            <h2 className="font-semibold text-gray-700">
                                                {board.title}
                                            </h2>
                                        </div>
                                        <button className="text-gray-400 hover:text-primary-500">
                                            <FaPlus size={14} />
                                        </button>
                                    </div>


                                    <div
                                        className="p-3 space-y-3 overflow-y-auto"
                                        style={{
                                            height: "calc(80vh - 64px)",
                                        }}
                                    >
                                        {board.tasks.length === 0 && (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-400 text-center">
                                                วางการ์ดที่นี่
                                            </div>
                                        )}

                                        {board.tasks.map((task, index) => (
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
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}
