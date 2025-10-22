"use client"
import { useLanguage } from "@/app/contexts/LanguageContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Lottie from "lottie-react";
import { memo, useEffect, useState } from "react";
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
    const [originalTaskList, setOriginalTaskList] = useState<any[]>([]);
    const [deletedIds, setDeletedIds] = useState<number[]>([]);
    const [focusedTaskId, setFocusedTaskId] = useState<any>(null);

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

    // DnD sensors and handler
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (!isEditMode || !over || active.id === over.id) return;

        setTaskList((items: any[]) => {
            const oldIndex = items.findIndex((item) => String(item.id) === String(active.id));
            const newIndex = items.findIndex((item) => String(item.id) === String(over.id));
            const updatedItems = arrayMove(items, oldIndex, newIndex).map((item: any, index: number) => ({
                ...item,
                order_index: index + 1,
            }));
            return updatedItems;
        });
    };

    const handleAddTask = async () => {
        if (!isEditMode) return;

        const newOrder = taskList.length + 1;
        const tempId = `temp-${Date.now()}`;
        const newTask = {
            id: tempId,
            name: "Untitled",
            color: "#3B82F6",
            order_index: newOrder,
            is_default: false,
            is_done: false,
            _isNew: true,
        };

        setTaskList((prev: any) => [...prev, newTask]);
    };

    const handleRemoveTask = async (id: any) => {
        if (!isEditMode) return;

        const isTemp = typeof id === 'string' && id.startsWith('temp-');
        if (!isTemp) {
            setDeletedIds((prev) => Array.from(new Set([...(prev || []), Number(id)])));
        }

        setTaskList((prev: any[]) => prev.filter((t) => String(t.id) !== String(id)).map((item, idx) => ({
            ...item,
            order_index: idx + 1,
        })));
    };

    const handleChangeName = async (id: any, value: string) => {
        if (!isEditMode) return;

        setTaskList((prev: any) =>
            prev.map((task: any) =>
                String(task.id) === String(id) ? { ...task, name: value } : task
            )
        );
    };

    const handleChangeColor = async (id: any, color: string) => {
        if (!isEditMode) return;

        setTaskList((prev: any) =>
            prev.map((task: any) =>
                String(task.id) === String(id) ? { ...task, color } : task
            )
        );
    };

    const handleToggle = async (id: any, field: "is_default" | "is_done") => {
        if (!isEditMode) return;

        setTaskList((prev: any[]) => {
            const current = prev.find((t) => String(t.id) === String(id));
            if (!current) return prev;

            return prev.map((task) => {
                if (String(task.id) === String(id)) {
                    return {
                        ...task,
                        is_default: field === 'is_default',
                        is_done: field === 'is_done',
                    };
                }
                // Ensure exclusivity within local state
                if (field === 'is_default' && task.is_default) {
                    return { ...task, is_default: false };
                }
                if (field === 'is_done' && task.is_done) {
                    return { ...task, is_done: false };
                }
                return task;
            });
        });
    };

    const startEdit = () => {
        setOriginalTaskList(JSON.parse(JSON.stringify(taskList)));
        setDeletedIds([]);
        setIsEditMode(true);
    };

    const handleCancelEdit = () => {
        setDeletedIds([]);
        setIsEditMode(false);
        getTaskStatus();
    };

    const handleDoneEdit = async () => {
        try {
            // Prepare operations
            const isTemp = (id: any) => typeof id === 'string' && id.startsWith('temp-');

            const newTasks = taskList.filter((t: any) => isTemp(t.id));
            const existingTasks = taskList.filter((t: any) => !isTemp(t.id) && !deletedIds.includes(Number(t.id)));

            // Deletes
            if (deletedIds.length > 0) {
                await Promise.all(deletedIds.map((id) => apiPrivate.delete(`/project/task-status/delete/${id}`)));
            }

            // Creates
            if (newTasks.length > 0) {
                const payload = {
                    project_id: project.id,
                    statuses: newTasks.map((t: any) => ({
                        name: t.name,
                        color: t.color,
                        order_index: t.order_index,
                        is_default: t.is_default,
                        is_done: t.is_done,
                    })),
                };
                await apiPrivate.post(`/project/task-status/create`, payload);
            }

            // Updates (compare with original)
            const originalMap = new Map<string, any>(originalTaskList.map((o: any) => [String(o.id), o]));
            const updatePromises: any[] = [];
            for (const t of existingTasks) {
                const orig = originalMap.get(String(t.id));
                if (!orig) continue;

                const changes: any = {};
                if (t.name !== orig.name) changes.name = t.name;
                if (t.color !== orig.color) changes.color = t.color;
                if (t.is_default !== orig.is_default) changes.is_default = t.is_default;
                if (t.is_done !== orig.is_done) changes.is_done = t.is_done;
                if (t.order_index !== orig.order_index) changes.order_index = t.order_index;

                if (Object.keys(changes).length > 0) {
                    updatePromises.push(apiPrivate.patch(`/project/task-status/update/${t.id}`, changes));
                }
            }

            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
            }

            await getTaskStatus();
            setIsEditMode(false);
            setDeletedIds([]);
        } catch (error) {
            console.error('Error saving changes:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกการแก้ไข');
            await getTaskStatus();
            setIsEditMode(false);
            setDeletedIds([]);
        }
    };

    const InfoItem = ({ icon: Icon, label, value, variant = "default", chipClass = "" }: any) => (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-start gap-3">
                <div className="text-gray-500 mt-0.5 flex-shrink-0">
                    <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{label}</p>
                    {variant === "code" ? (
                        <span className="inline-flex items-center font-mono text-sm px-2 py-1 rounded-md bg-gray-100 text-gray-800 border border-gray-200">
                            {value || "-"}
                        </span>
                    ) : variant === "chip" ? (
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium ${chipClass}`}>
                            {value || "-"}
                        </span>
                    ) : (
                        <p className="text-sm font-semibold text-gray-900 truncate">{value || "-"}</p>
                    )}
                </div>
            </div>
        </div>
    );

    const SortableTaskRow = memo(({ task, index, isEditMode }: { task: any; index: number; isEditMode: boolean }) => {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(task.id) });
        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
        } as React.CSSProperties;

        const currentColor = task.color || "#3B82F6";

        return (
            <div
                ref={setNodeRef}
                style={{ ...style, borderLeftColor: currentColor, borderLeftWidth: 4, borderLeftStyle: 'solid' }}
                className={`bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 ${isDragging ? 'opacity-75 ring-2 ring-primary-500/50 shadow-lg' : ''}`}
            >

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
                            placeholder={`ชื่อหัวข้องาน...`}
                            value={task.name || task.title || ""}
                            onChange={(e) => handleChangeName(task.id, e.target.value)}
                            onFocus={() => setFocusedTaskId(task.id)}
                            autoFocus={focusedTaskId === task.id}
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
                                tabIndex={-1}
                                className="w-20 h-8 p-0 border-2 border-gray-300 rounded-md focus:ring-primary-500"
                            />
                        )}
                    </div>
                </div>

                {/* Status row */}
                <div className="flex items-center justify-between border-t pt-3">
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
    });
    SortableTaskRow.displayName = "SortableTaskRow";

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
                    {(() => {
                        const priorityLabel = project?.priority === "urgent"
                            ? "เร่งด่วน (Urgent)"
                            : project?.priority === "high"
                                ? "สูง (High)"
                                : project?.priority === "normal"
                                    ? "ปกติ (Normal)"
                                    : project?.priority === "low"
                                        ? "ต่ำ (Low)"
                                        : "-";

                        const priorityClass = project?.priority === "urgent"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : project?.priority === "high"
                                ? "bg-orange-50 text-orange-700 border border-orange-200"
                                : project?.priority === "low"
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "bg-gray-100 text-gray-700 border border-gray-300";

                        const statusLabel = project?.status === "draft"
                            ? "ร่าง (Draft)"
                            : project?.status === "started"
                                ? "เริ่มต้นแล้ว (Started)"
                                : project?.status === "completed"
                                    ? "เสร็จสิ้น (Completed)"
                                    : project?.status === "cancelled"
                                        ? "ยกเลิก (Cancelled)"
                                        : "-";

                        const statusClass = project?.status === "completed"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : project?.status === "started"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : project?.status === "cancelled"
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : "bg-gray-100 text-gray-700 border border-gray-300";

                        return (
                            <>
                                <InfoItem icon={FiHash} label={t('project.join_code')} value={project?.join_code || '-'} variant="code" />
                                <InfoItem icon={FiCalendar} label={t('project.table_created_at')} value={project?.created_at || '-'} />
                                <InfoItem icon={FiFlag} label={t('project.table_priority')} value={priorityLabel} variant="chip" chipClass={priorityClass} />
                                <InfoItem icon={FiFlag} label={t('project.table_status')} value={statusLabel} variant="chip" chipClass={statusClass} />
                            </>
                        );
                    })()}
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b px-6 py-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            หัวข้องาน
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200">{taskList.length}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            {!isEditMode ? (
                                <CustomButton size="sm" onClick={startEdit} className="flex items-center gap-1">
                                    <FiEdit2 size={14} /> แก้ไข
                                </CustomButton>
                            ) : (
                                <>
                                    <CustomButton size="sm" variant="outline" onClick={handleCancelEdit} className="flex items-center gap-1 text-gray-600 hover:text-gray-800">
                                        <FiX size={14} /> ยกเลิก
                                    </CustomButton>
                                    <CustomButton size="sm" onClick={handleDoneEdit} className="flex items-center gap-1">
                                        <FiCheck size={14} /> เสร็จสิ้น
                                    </CustomButton>
                                </>
                            )}
                            <button
                                onClick={handleAddTask}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition disabled:opacity-50"
                                disabled={!isEditMode}
                            >
                                <FiPlus size={14} /> เพิ่ม
                            </button>
                        </div>
                    </div>

                    {taskList.length > 0 ? (
                        <div className="space-y-4 max-h-[28rem] overflow-y-auto p-6">
                            {isEditMode ? (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={taskList.map((t: any) => String(t.id))} strategy={verticalListSortingStrategy}>
                                        {taskList.map((task: any, index: number) => (
                                            <SortableTaskRow key={String(task.id)} task={task} index={index} isEditMode={isEditMode} />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            ) : (
                                taskList.map((task: any, index: number) => (
                                    <SortableTaskRow key={String(task.id)} task={task} index={index} isEditMode={isEditMode} />
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 m-6">
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
