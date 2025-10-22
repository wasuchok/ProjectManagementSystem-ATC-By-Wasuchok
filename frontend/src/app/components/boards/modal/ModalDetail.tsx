"use client"
import { useLanguage } from "@/app/contexts/LanguageContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Lottie from "lottie-react";
import { useEffect, useState } from "react";
import { FiCalendar, FiCheck, FiClipboard, FiEdit2, FiFlag, FiHash, FiPlus, FiTrash2, FiUsers, FiX } from "react-icons/fi";
import { LuGripVertical } from "react-icons/lu";
import projectAnimation from "../../../../../public/Comacon - planning.json";
import { CustomButton } from "../../Input/CustomButton";
import TextArea from "../../Input/TextArea";
import TextField from "../../Input/TextField";
import MinimalModal from "../../MinimalModal";

const ModalDetail = ({ open, setOpen, project }: any) => {
    const { t } = useLanguage();
    const [taskList, setTaskList] = useState<any>([]);
    const [isEditMode, setIsEditMode] = useState(false);

    const getTaskStatus = async () => {
        try {
            const response = await apiPrivate.get(`/project/task-status/get-all-status-by-project/${project.id}`)

            if (response.status == 200) {
                console.log(response.data.data)
                setTaskList(response.data.data);
            }
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        getTaskStatus()
    }, [])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;

        if (!isEditMode || !over || active.id === over.id) return;

        setTaskList((items: any[]) => {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);

            const updatedItems = arrayMove(items, oldIndex, newIndex);
            return updatedItems.map((item: any, index: number) => ({
                ...item,
                order_index: index + 1
            }));
        });

        // Update order_index via API for all tasks
        setTimeout(async () => {
            try {
                const promises = taskList.map((task: any) =>
                    apiPrivate.patch(`/project/task-status/update/${task.id}`, { order_index: task.order_index })
                );
                await Promise.all(promises);
            } catch (error) {
                console.error("Error updating order indices:", error);
                getTaskStatus(); // Refresh to rollback if needed
            }
        }, 0);
    };

    const handleAddTask = async () => {
        if (!isEditMode) return;

        const newOrder = taskList.length + 1;
        const tempId = Date.now();
        const newTask = {
            id: tempId,
            name: "Untitled",
            color: "#3B82F6",
            order_index: newOrder,
            is_default: false,
            is_done: false,
        };

        setTaskList((prev: any) => [...prev, newTask]);

        try {
            const payload = {
                project_id: project.id,
                statuses: [{
                    name: newTask.name,
                    color: newTask.color,
                    order_index: newTask.order_index,
                    is_default: newTask.is_default,
                    is_done: newTask.is_done,
                }],
            };

            const response = await apiPrivate.post(`/project/task-status/create`, payload);

            if (response.status === 201) {
                getTaskStatus(); // Refresh to include the new real task
            }
        } catch (error) {
            console.error("Error creating task status:", error);
            // Rollback state on error
            setTaskList((prev: any) => prev.filter((t: any) => t.id !== tempId));
            alert("เกิดข้อผิดพลาดในการเพิ่มหัวข้องาน");
        }
    };

    const handleRemoveTask = async (id: number) => {
        if (!isEditMode) return;

        try {
            const response = await apiPrivate.delete(`/project/task-status/delete/${id}`);

            if (response.status === 200) {
                getTaskStatus(); // Refresh list
            } else {
                alert("⚠️ ลบไม่สำเร็จ");
            }
        } catch (error) {
            console.error("Error deleting task status:", error);
            alert("เกิดข้อผิดพลาดในการลบ");
        }
    };

    const handleChangeName = async (id: number, value: string) => {
        if (!isEditMode) return;

        setTaskList((prev: any) =>
            prev.map((task: any) =>
                task.id === id ? { ...task, name: value } : task
            )
        );

        try {
            await apiPrivate.patch(`/project/task-status/update/${id}`, { name: value });
        } catch (error) {
            console.error("Error updating task name:", error);
            // Optionally rollback
            getTaskStatus();
        }
    };

    const handleChangeColor = async (id: number, color: string) => {
        if (!isEditMode) return;

        setTaskList((prev: any) =>
            prev.map((task: any) =>
                task.id === id ? { ...task, color } : task
            )
        );

        try {
            await apiPrivate.patch(`/project/task-status/update/${id}`, { color });
        } catch (error) {
            console.error("Error updating task color:", error);
            // Optionally rollback
            getTaskStatus();
        }
    };

    const handleToggle = async (id: number, field: "is_default" | "is_done") => {
        if (!isEditMode) return;

        const currentTask = taskList.find((t: any) => t.id === id);
        if (!currentTask) return;

        const updateData: any = {};
        if (field === "is_default") {
            updateData.is_default = true;
            updateData.is_done = false;
        } else {
            updateData.is_done = true;
            updateData.is_default = false;
        }

        // Optimistic update for this task
        setTaskList((prev: any) =>
            prev.map((task: any) =>
                task.id === id ? { ...task, ...updateData } : task
            )
        );

        try {
            await apiPrivate.patch(`/project/task-status/update/${id}`, updateData);
            getTaskStatus(); // Refresh to update other tasks (backend sets others to false)
        } catch (error) {
            console.error("Error toggling task status:", error);
            getTaskStatus(); // Rollback by refresh
        }
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
    };

    const handleDoneEdit = () => {
        setIsEditMode(false);
    };

    const InfoItem = ({ icon: Icon, label, value }: any) => (
        <div className="flex items-start gap-3 py-2 px-2 rounded-md hover:bg-gray-50 transition-colors duration-200 border-l-2 border-primary-200 bg-white">
            <div className="text-primary-500 mt-0.5 flex-shrink-0">
                <Icon size={16} />
            </div>
            <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
                <p className="text-sm font-medium text-gray-900 break-words">{value || "-"}</p>
            </div>
        </div>
    );

    const SortableTaskRow = ({ task, index }: { task: any; index: number }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: String(task.id) });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
        };

        const currentColor = task.color || "#3B82F6";

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 ${isDragging ? 'opacity-75 ring-2 ring-primary-500/50 shadow-lg' : ''}`}
            >
                {/* Main row: Drag/Order + Name + Color */}
                <div className="flex items-center gap-4 mb-3">
                    <div className="flex-shrink-0 w-8">
                        {isEditMode ? (
                            <div className="flex justify-center" {...attributes} {...listeners}>
                                <LuGripVertical className="text-gray-400 cursor-grab active:cursor-grabbing text-lg" />
                            </div>
                        ) : (
                            <span className="text-sm font-semibold text-gray-600">#{index + 1}</span>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <TextField
                            fieldSize="sm"
                            placeholder={`หัวข้องานที่ ${index + 1}`}
                            value={task.name || task.title || ""}
                            onChange={(e) => handleChangeName(task.id, e.target.value)}
                            className={`${isEditMode ? "" : "bg-gray-100 cursor-not-allowed"} text-sm font-medium`}
                            readOnly={!isEditMode}
                        />
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                        <span
                            className="w-5 h-5 rounded-full border-2 border-gray-200 shadow-sm flex-shrink-0"
                            style={{ backgroundColor: currentColor }}
                        />
                        {isEditMode && (
                            <TextField
                                fieldSize="sm"
                                type="color"
                                value={currentColor}
                                onChange={(e) => handleChangeColor(task.id, e.target.value)}
                                className="w-20 h-8 p-0 border-2 border-gray-300 rounded-md focus:ring-primary-500"
                            />
                        )}
                    </div>
                </div>

                {/* Status row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-wrap">
                        {isEditMode ? (
                            <>
                                <label className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={task.is_default}
                                        onChange={() => handleToggle(task.id, "is_default")}
                                        className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    <span className="text-sm font-medium text-blue-700">ค่าเริ่มต้น</span>
                                </label>

                                <label className="flex items-center gap-2 p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={task.is_done}
                                        onChange={() => handleToggle(task.id, "is_done")}
                                        className="rounded border-green-300 text-green-600 focus:ring-green-500 w-4 h-4"
                                    />
                                    <span className="text-sm font-medium text-green-700">เสร็จสิ้น</span>
                                </label>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full border flex-shrink-0"
                                    style={{ backgroundColor: currentColor }}
                                />
                                {task.is_default && (
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium border border-blue-200">
                                        ค่าเริ่มต้น
                                    </span>
                                )}
                                {task.is_done && (
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium border border-green-200">
                                        เสร็จสิ้น
                                    </span>
                                )}
                                {!task.is_default && !task.is_done && (
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium border border-gray-200">
                                        ปกติ
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {isEditMode && (
                        <button
                            onClick={() => handleRemoveTask(task.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                            disabled={taskList.length <= 1}
                        >
                            <FiTrash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <MinimalModal
            isOpen={open}
            onClose={() => setOpen(false)}
            title={t("project.detail_project")}
            width="max-w-4xl"
        >

            <div className="relative mb-4 p-3 bg-gradient-to-r from-primary-100/70 to-green-200/70 rounded-lg shadow-sm overflow-hidden flex-shrink-0">
                <div className="absolute inset-0">
                    <Lottie
                        animationData={projectAnimation}
                        loop={true}
                        style={{ height: 100, width: 100 }}
                        className="absolute top-1/2 left-1/4 transform -translate-x-1/3 -translate-y-1/2"
                    />
                </div>
                <div className="relative z-10 text-center text-gray-800">
                    <h2 className="text-xl font-semibold mb-1">{t('project.detail_project_title')}</h2>
                    <p className="text-gray-600 text-sm">{t('project.detail_project_desc')}</p>
                </div>
            </div>

            <div className="space-y-5">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        {
                            icon: FiHash,
                            label: t('project.join_code'),
                            value: project?.join_code || "-"
                        },
                        {
                            icon: FiCalendar,
                            label: t('project.table_created_at'),
                            value: project?.created_at || "-"
                        },
                        {
                            icon: FiFlag,
                            label: t('project.table_priority'),
                            value: project?.priority === "urgent" ? "เร่งด่วน (Urgent)" : project?.priority === "high" ? "สูง (High)" : project?.priority === "normal" ? "ปกติ (Normal)" : "ต่ำ (Low)"
                        },
                        {
                            icon: FiFlag,
                            label: t('project.table_status'),
                            value: project?.status === "draft" ? "ร่าง (Draft)" : project?.status === "started" ? "เริ่มต้นแล้ว (Started)" : project?.status === "completed" ? "เสร็จสิ้น (Completed)" : project?.status === "cancelled" ? "ยกเลิก (Cancelled)" : "-"
                        }
                    ].map((item, index) => (
                        <InfoItem key={index} {...item} />
                    ))}
                </div>

                <div className="border border-gray-100 rounded-xl p-6 bg-white space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">
                            หัวข้องาน ({taskList.length})
                        </p>
                        <div className="flex items-center gap-2">
                            {!isEditMode ? (
                                <CustomButton
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsEditMode(true)}
                                    className="flex items-center gap-1"
                                >
                                    <FiEdit2 size={14} /> แก้ไข
                                </CustomButton>
                            ) : (
                                <>
                                    <CustomButton
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
                                    >
                                        <FiX size={14} /> ยกเลิก
                                    </CustomButton>
                                    <CustomButton
                                        size="sm"
                                        onClick={handleDoneEdit}
                                        className="flex items-center gap-1"
                                    >
                                        <FiCheck size={14} /> เสร็จสิ้น
                                    </CustomButton>
                                </>
                            )}
                            <button
                                onClick={handleAddTask}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-primary-600 border border-primary-300 hover:bg-primary-50 transition disabled:opacity-50"
                                disabled={!isEditMode}
                            >
                                <FiPlus size={14} /> เพิ่ม
                            </button>
                        </div>
                    </div>

                    {taskList.length > 0 ? (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {isEditMode ? (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={taskList.map((task: any) => String(task.id))}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {taskList.map((task: any, index: number) => (
                                            <SortableTaskRow key={task.id} task={task} index={index} />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            ) : (
                                taskList.map((task: any, index: number) => (
                                    <SortableTaskRow key={task.id} task={task} index={index} />
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <FiClipboard className="text-gray-300 mx-auto mb-3" size={48} />
                            <p className="text-sm text-gray-500 mb-4">ยังไม่มีหัวข้องาน</p>
                            <button
                                onClick={handleAddTask}
                                className="flex items-center gap-1 mx-auto px-4 py-2 rounded-lg text-sm font-medium text-primary-600 border border-primary-300 hover:bg-primary-50 transition"
                                disabled={!isEditMode}
                            >
                                <FiPlus size={14} /> เพิ่มหัวข้องานแรก
                            </button>
                        </div>
                    )}
                </div>

                <div className="border border-gray-100 rounded-xl p-6 bg-white space-y-4 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="text-primary-500 mt-1 flex-shrink-0">
                            <FiClipboard size={16} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-600 mb-2">{t('project.project_name')}</p>
                            <TextField value={project?.projectName || "-"} readOnly className="text-sm" />
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="text-primary-500 mt-1 flex-shrink-0">
                            <FiClipboard size={16} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-600 mb-2">{t('project.description')}</p>
                            <TextArea
                                value={project?.description || "-"}
                                readOnly
                                className="text-sm min-h-[80px]"
                            />
                        </div>
                    </div>
                </div>

                <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <FiUsers className="text-primary-500" size={20} />
                        <p className="text-sm font-semibold text-gray-800">
                            {t('project.list_of_employees')} ({project?.employees?.length || 0})
                        </p>
                    </div>

                    {project?.employees?.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto pr-1 space-y-3">
                            {project.employees.map((member: any) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors duration-200 border border-gray-100"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={member.user_account?.image ? `${member.user_account.image}` : "/user_profile.png"}
                                            alt={member.user_account?.full_name || "User"}
                                            width={40}
                                            height={40}
                                            className="rounded-full object-cover border border-gray-200"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "/user_profile.png";
                                            }}
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">
                                                {member.user_account?.full_name || "-"}
                                            </p>
                                            <p className="text-xs text-gray-600 flex items-center gap-1">
                                                <span>{member.user_account?.department || "-"}</span>
                                                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                                {member.status === "joined" ? "เข้าร่วมแล้ว" : member.status === "invited" ? "รอเข้าร่วม" : member.status}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`text-xs px-3 py-1 rounded-full font-medium ${member.status === "joined"
                                            ? "bg-green-50 text-green-700 border border-green-200"
                                            : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                            }`}
                                    >
                                        {member.status === "joined" ? "Joined" : "Invited"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <FiUsers className="text-gray-300 mx-auto mb-3" size={48} />
                            <p className="text-sm text-gray-500">{t('no_member')}</p>
                        </div>
                    )}
                </div>

            </div>
        </MinimalModal >
    );
};

export default ModalDetail;