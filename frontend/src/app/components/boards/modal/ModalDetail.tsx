"use client";

import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { encodeSingleHashid } from "@/app/utils/hashids";
import {
    closestCenter,
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Lottie from "lottie-react";
import Link from "next/link";
import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    FiCalendar,
    FiCheck,
    FiClipboard,
    FiEdit2,
    FiFileText,
    FiFlag,
    FiHash,
    FiPlay,
    FiPlus,
    FiTrash2,
    FiUsers,
    FiX,
} from "react-icons/fi";
import { LuGripVertical } from "react-icons/lu";
import projectAnimation from "../../../../../public/Comacon - planning.json";
import TextArea from "../../Input/TextArea";
import TextField from "../../Input/TextField";
import MinimalModal from "../../MinimalModal";

const PRIORITY_META = {
    urgent: {
        label: "เร่งด่วน (Urgent)",
        className: "bg-red-50 text-red-700 border border-red-200",
    },
    high: {
        label: "สูง (High)",
        className: "bg-orange-50 text-orange-700 border border-orange-200",
    },
    normal: {
        label: "ปกติ (Normal)",
        className: "bg-gray-100 text-gray-700 border border-gray-300",
    },
    low: {
        label: "ต่ำ (Low)",
        className: "bg-green-50 text-green-700 border border-green-200",
    },
} as const;

const STATUS_META = {
    draft: {
        label: "ร่าง (Draft)",
        className: "bg-gray-100 text-gray-700 border border-gray-300",
    },
    started: {
        label: "เริ่มต้นแล้ว (Started)",
        className: "bg-blue-50 text-blue-700 border border-blue-200",
    },
    completed: {
        label: "เสร็จสิ้น (Completed)",
        className: "bg-green-50 text-green-700 border border-green-200",
    },
    cancelled: {
        label: "ยกเลิก (Cancelled)",
        className: "bg-red-50 text-red-700 border border-red-200",
    },
} as const;

const ModalDetail = ({ open, setOpen, project }: any) => {
    const { t } = useLanguage();
    const { user } = useUser();
    const [taskList, setTaskList] = useState<any[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [originalTaskList, setOriginalTaskList] = useState<any[]>([]);
    const [deletedIds, setDeletedIds] = useState<number[]>([]);
    const [focusedTaskId, setFocusedTaskId] = useState<any>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    const fetchTaskStatus = useCallback(async () => {
        if (!project?.id) return;
        setIsLoadingStatus(true);
        try {
            const response = await apiPrivate.get(
                `/project/task-status/get-all-status-by-project/${project.id}`
            );

            if (response.status === 200) {
                const sorted = (response.data.data || [])
                    .slice()
                    .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
                setTaskList(sorted);
            }
        } catch (error) {
            console.error("fetch task status error", error);
        } finally {
            setIsLoadingStatus(false);
        }
    }, [project?.id]);

    useEffect(() => {
        if (open) {
            fetchTaskStatus();
            setIsEditMode(false);
        }
    }, [open, fetchTaskStatus]);

    const canManageStatuses = useMemo(() => {
        if (project?.isOwner !== undefined) {
            return Boolean(project.isOwner);
        }

        const currentUserId = user?.id;
        if (currentUserId == null) {
            return false;
        }

        const normalizedUserId = String(currentUserId);
        const matchesCurrentUser = (value: any) =>
            value != null && String(value) === normalizedUserId;

        const ownerCandidates = [
            project?.created_by,
            project?.createdBy,
            project?.owner_id,
            project?.ownerId,
            project?.owner?.id,
            project?.owner?.user_id,
            project?.owner?.userId,
        ];

        for (const candidate of ownerCandidates) {
            if (typeof candidate === "object" && candidate !== null) {
                if (
                    matchesCurrentUser(candidate.id) ||
                    matchesCurrentUser(candidate.user_id) ||
                    matchesCurrentUser(candidate.userId)
                ) {
                    return true;
                }
                continue;
            }

            if (matchesCurrentUser(candidate)) {
                return true;
            }
        }

        const employees = Array.isArray(project?.employees) ? project.employees : [];

        return employees.some((member: any) => {
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

            return memberIds.some((id) => matchesCurrentUser(id));
        });
    }, [project, user?.id]);

    const handleDragEnd = useCallback((event: any) => {
        const { active, over } = event;
        if (!isEditMode || !canManageStatuses || !over || active.id === over.id) return;

        setTaskList((items) => {
            const oldIndex = items.findIndex((item) => String(item.id) === String(active.id));
            const newIndex = items.findIndex((item) => String(item.id) === String(over.id));
            const updatedItems = arrayMove(items, oldIndex, newIndex).map((item: any, index: number) => ({
                ...item,
                order_index: index + 1,
            }));
            return updatedItems;
        });
    }, [canManageStatuses, isEditMode]);

    const handleAddTask = useCallback(() => {
        if (!isEditMode || !canManageStatuses) return;

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

        setTaskList((prev) => [...prev, newTask]);
    }, [canManageStatuses, isEditMode, taskList.length]);

    const handleRemoveTask = useCallback((id: any) => {
        if (!isEditMode || !canManageStatuses) return;

        const isTemp = typeof id === 'string' && id.startsWith('temp-');
        if (!isTemp) {
            setDeletedIds((prev) => Array.from(new Set([...(prev || []), Number(id)])));
        }

        setTaskList((prev) => prev.filter((t) => String(t.id) !== String(id)).map((item, idx) => ({
            ...item,
            order_index: idx + 1,
        })));
    }, [canManageStatuses, isEditMode]);

    const handleChangeName = useCallback((id: any, value: string) => {
        if (!isEditMode || !canManageStatuses) return;

        setTaskList((prev) =>
            prev.map((task: any) =>
                String(task.id) === String(id) ? { ...task, name: value } : task
            )
        );
    }, [canManageStatuses, isEditMode]);

    const handleChangeColor = useCallback((id: any, color: string) => {
        if (!isEditMode || !canManageStatuses) return;

        setTaskList((prev) =>
            prev.map((task: any) =>
                String(task.id) === String(id) ? { ...task, color } : task
            )
        );
    }, [canManageStatuses, isEditMode]);

    const handleToggle = useCallback((id: any, field: "is_default" | "is_done") => {
        if (!isEditMode || !canManageStatuses) return;

        setTaskList((prev) => {
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

                if (field === 'is_default' && task.is_default) {
                    return { ...task, is_default: false };
                }
                if (field === 'is_done' && task.is_done) {
                    return { ...task, is_done: false };
                }
                return task;
            });
        });
    }, [canManageStatuses, isEditMode]);

    const startEdit = useCallback(() => {
        if (!canManageStatuses) return;
        setOriginalTaskList(JSON.parse(JSON.stringify(taskList)));
        setDeletedIds([]);
        setIsEditMode(true);
    }, [canManageStatuses, taskList]);

    const handleCancelEdit = useCallback(() => {
        setDeletedIds([]);
        setIsEditMode(false);
        fetchTaskStatus();
    }, [fetchTaskStatus]);

    const handleDoneEdit = useCallback(async () => {
        if (!canManageStatuses || isSaving) return;
        setIsSaving(true);
        try {

            const isTemp = (id: any) => typeof id === 'string' && id.startsWith('temp-');

            const newTasks = taskList.filter((t: any) => isTemp(t.id));
            const existingTasks = taskList.filter((t: any) => !isTemp(t.id) && !deletedIds.includes(Number(t.id)));


            if (deletedIds.length > 0) {
                await Promise.all(deletedIds.map((id) => apiPrivate.delete(`/project/task-status/delete/${id}`)));
            }


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

            await fetchTaskStatus();
            setIsEditMode(false);
            setDeletedIds([]);
        } catch (error) {
            console.error('Error saving changes:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกการแก้ไข');
            await fetchTaskStatus();
            setIsEditMode(false);
            setDeletedIds([]);
        } finally {
            setIsSaving(false);
        }
    }, [canManageStatuses, deletedIds, fetchTaskStatus, isSaving, originalTaskList, taskList]);

    const members = useMemo(() => project?.employees ?? [], [project?.employees]);
    const taskCount = taskList.length;
    const formattedCreatedAt = useMemo(() => {
        if (!project?.created_at) return "-";
        const date = new Date(project.created_at);
        return date.toLocaleString(undefined, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }, [project?.created_at]);

    const priorityMeta =
        PRIORITY_META[project?.priority as keyof typeof PRIORITY_META] ??
        {
            label: "ไม่ระบุ (N/A)",
            className: "bg-gray-100 text-gray-700 border border-gray-300",
        };
    const statusMeta =
        STATUS_META[project?.status as keyof typeof STATUS_META] ??
        {
            label: "ไม่ระบุ (N/A)",
            className: "bg-gray-100 text-gray-700 border border-gray-300",
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
                                    <span className="text-sm font-medium text-blue-700"> {t('project.default_status')}</span>
                                </label>

                                <label className="flex items-center gap-2 p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={task.is_done}
                                        onChange={() => handleToggle(task.id, "is_done")}
                                        className="rounded border-green-300 text-green-600 focus:ring-green-500 w-4 h-4"
                                    />
                                    <span className="text-sm font-medium text-green-700">{t('project.done_status')}</span>
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
                                        {t('project.default_status')}
                                    </span>
                                )}
                                {task.is_done && (
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium border border-green-200">
                                        {t('project.done_status')}
                                    </span>
                                )}
                                {!task.is_default && !task.is_done && (
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium border border-gray-200">
                                        {t('project.default_status')}
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

            <section className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-primary-50 via-emerald-50 to-slate-50 p-6 shadow-sm">
                <div className="absolute inset-y-0 right-0 opacity-80">
                    <Lottie
                        animationData={projectAnimation}
                        loop
                        className="pointer-events-none h-64 w-64 translate-x-6"
                    />
                </div>
                <div className="relative z-10 flex flex-col gap-4 text-slate-800">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                            {t("project.detail_project_title")}
                        </p>
                        <h2 className="text-2xl font-semibold">
                            {project?.projectName || t("project.project_name")}
                        </h2>
                        <p className="text-sm text-slate-600">
                            {t("project.detail_project_desc")}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                            {t("project.table_created_at")} · {formattedCreatedAt}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                            {t("project.task_status_title")} · {taskCount}
                        </span>
                    </div>
                    {taskCount > 0 && (
                        <Link
                            href={`/boards/view_board/${encodeSingleHashid(project.id)}`}
                            className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:translate-y-0.5"
                        >
                            <FiPlay size={14} />
                            {t("project.start_planning")}
                        </Link>
                    )}
                </div>
            </section>

            <div className="space-y-5">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoItem
                        icon={FiHash}
                        label={t("project.join_code")}
                        value={project?.join_code || "-"}
                        variant="code"
                    />
                    <InfoItem
                        icon={FiCalendar}
                        label={t("project.table_created_at")}
                        value={formattedCreatedAt}
                    />
                    <InfoItem
                        icon={FiFlag}
                        label={t("project.table_priority")}
                        value={priorityMeta.label}
                        variant="chip"
                        chipClass={priorityMeta.className}
                    />
                    <InfoItem
                        icon={FiFlag}
                        label={t("project.table_status")}
                        value={statusMeta.label}
                        variant="chip"
                        chipClass={statusMeta.className}
                    />
                </div>

                <div className="border border-gray-100 rounded-2xl bg-white shadow-sm">
                    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">
                                {t("project.task_status_title")}
                            </p>
                            <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                                {taskCount}
                            </span>
                            {isEditMode && (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                                    {t("project.edit")}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {canManageStatuses && (
                                <>
                                    {!isEditMode ? (
                                        <button
                                            onClick={startEdit}
                                            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-100"
                                        >
                                            <FiEdit2 size={14} />
                                            {t("project.edit")}
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleCancelEdit}
                                                disabled={isSaving}
                                                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <FiX size={14} />
                                                {t("project.cancel")}
                                            </button>
                                            <button
                                                onClick={handleDoneEdit}
                                                disabled={isSaving}
                                                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                                            >
                                                <FiCheck size={14} />
                                                {isSaving ? t("project.saving") : t("project.done_status")}
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleAddTask}
                                        disabled={!isEditMode || isSaving}
                                        className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                                    >
                                        <FiPlus size={14} />
                                        {t("project.add")}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {isLoadingStatus ? (
                        <div className="space-y-3 p-4">
                            {Array.from({ length: 3 }).map((_, idx) => (
                                <div
                                    key={`skeleton-${idx}`}
                                    className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
                                />
                            ))}
                        </div>
                    ) : taskCount > 0 ? (
                        <div className="space-y-4 p-1.5">
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
                            <p className="text-sm text-gray-500 mb-4">
                                {t("project.task_logs_empty")}
                            </p>
                            {canManageStatuses && (
                                <button
                                    onClick={handleAddTask}
                                    className="flex items-center gap-1 mx-auto px-4 py-2 rounded-lg text-sm font-medium text-primary-600 border border-primary-300 hover:bg-primary-50 transition disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={!isEditMode || isSaving}
                                >
                                    <FiPlus size={14} /> เพิ่มหัวข้องานแรก
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="border border-gray-100 rounded-xl p-6 bg-white space-y-6 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="text-primary-500 mt-1 flex-shrink-0 bg-primary-50 p-2 rounded-lg">
                            <FiClipboard size={18} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">{t('project.project_name')}</p>
                            <TextField
                                value={project?.projectName || "-"}
                                readOnly
                                className="text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg focus:ring-0 focus:border-primary-300 transition-colors duration-200"
                            />
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="text-primary-500 mt-1 flex-shrink-0 bg-primary-50 p-2 rounded-lg">
                            <FiFileText size={18} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">{t('project.description')}</p>
                            <TextArea
                                value={project?.description || "-"}
                                readOnly
                                className="text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-0 focus:border-primary-300 min-h-[100px] transition-colors duration-200"
                            />
                        </div>
                    </div>
                </div>

                <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <FiUsers className="text-primary-500" size={20} />
                        <p className="text-sm font-semibold text-gray-800">
                            {t('project.list_of_employees')} ({members.length})
                        </p>
                    </div>

                    {members.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto pr-1 space-y-3">
                            {members.map((member: any) => (
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
