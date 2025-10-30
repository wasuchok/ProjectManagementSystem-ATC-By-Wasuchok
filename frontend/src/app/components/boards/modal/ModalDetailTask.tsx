import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FiCalendar, FiClock, FiEdit2, FiFlag, FiHash, FiList, FiMessageCircle, FiPlus, FiUser } from "react-icons/fi";
import MinimalModal from "../../MinimalModal";

type AssigneeOption = {
    userId: string;
    fullName?: string;
    department?: string;
};

type SubtaskAssigneeSummary = {
    id: string;
    userId: string;
    fullName?: string;
    assignedAt?: string;
};

type SubtaskSummary = {
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
    assignees?: SubtaskAssigneeSummary[];
};

type TaskComment = {
    id: string;
    taskId?: string;
    userId: string;
    message: string;
    createdAt?: string;
    updatedAt?: string;
    authorName?: string;
    authorRole?: string;
};

const normalizeComment = (comment: any): TaskComment => ({
    id: String(comment.id),
    taskId: comment.task_id != null ? String(comment.task_id) : comment.taskId ?? undefined,
    userId: comment.user_id ?? comment.userId ?? "",
    message: comment.message ?? "",
    createdAt: comment.created_at ?? comment.createdAt ?? undefined,
    updatedAt: comment.updated_at ?? comment.updatedAt ?? undefined,
    authorName:
        comment.user?.full_name ??
        comment.user?.fullName ??
        comment.user?.username ??
        comment.full_name ??
        comment.fullName ??
        undefined,
    authorRole: comment.user?.role ?? comment.user?.position ?? comment.role ?? undefined,
});

const normalizeSubtask = (subtask: any): SubtaskSummary => ({
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
});

type SubtaskFormValues = {
    title: string;
    description: string;
    startDate: string;
    hasDueDate: boolean;
    dueDate: string;
    progressPercent: string;
    assigneeIds: string[];
};

const createEmptyFormValues = (): SubtaskFormValues => ({
    title: "",
    description: "",
    startDate: "",
    hasDueDate: false,
    dueDate: "",
    progressPercent: "0",
    assigneeIds: [],
});

type ModalDetailTaskProps = {
    isTaskModalOpen: boolean;
    handleCloseTaskModal: () => void;
    selectedTask: any;
    priorityConfig: Record<string, { label: string; badgeClass: string; dotClass: string }>;
    getProgressValue: (value?: string) => number;
    getProgressAppearance: (value: number) => { gradient: string; glowColor: string };
    formatDateTime: (value?: string) => string;
    availableAssignees: AssigneeOption[];
    onTaskProgressChanged?: (taskId: string, progressPercent: number) => void;
};

const ModalDetailTask = ({
    isTaskModalOpen,
    handleCloseTaskModal,
    selectedTask,
    priorityConfig,
    getProgressValue,
    getProgressAppearance,
    formatDateTime,
    availableAssignees,
    onTaskProgressChanged,
}: ModalDetailTaskProps) => {
    const { t } = useLanguage()
    const resolveLabel = (key: string, fallback: string) => {
        const translated = t(key);
        return translated && translated !== key ? translated : fallback;
    };
    const commentSectionTitle = resolveLabel('project.comments', 'ความคิดเห็น');
    const commentsLoadingLabel = resolveLabel('project.loading_comments', 'กำลังโหลดความคิดเห็น...');
    const commentsEmptyLabel = resolveLabel('project.no_comments', 'ยังไม่มีความคิดเห็น');
    const commentsErrorLabel = resolveLabel('project.failed_to_load_comments', 'ไม่สามารถโหลดความคิดเห็นได้');
    const commentsSendErrorLabel = resolveLabel('project.failed_to_send_comment', 'ไม่สามารถส่งความคิดเห็นได้');
    const commentsPlaceholder = resolveLabel('project.comment_placeholder', 'พิมพ์ความคิดเห็นของคุณ...');
    const commentsSubmitLabel = resolveLabel('project.comment_submit', 'ส่งความคิดเห็น');
    const commentsSubmittingLabel = resolveLabel('project.comment_submitting', 'กำลังส่ง...');
    const getInitials = (value: string) => {
        if (!value) return "?";
        const parts = value.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) {
            return "?";
        }
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    };
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [commentsError, setCommentsError] = useState<string | null>(null);
    const [newCommentMessage, setNewCommentMessage] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [subtasks, setSubtasks] = useState<SubtaskSummary[]>(() =>
        Array.isArray(selectedTask?.subtasks) ? selectedTask.subtasks.map((sub: any) => normalizeSubtask(sub)) : []
    );
    const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formValues, setFormValues] = useState<SubtaskFormValues>(createEmptyFormValues);
    const { user } = useUser();
    const currentUserId = user?.id != null ? String(user.id) : undefined;
    const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
    const [editProgressPercent, setEditProgressPercent] = useState<string>("0");
    const [isUpdatingSubtask, setIsUpdatingSubtask] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const lastEmittedProgressRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isTaskModalOpen || !selectedTask?.id) {
            return;
        }

        const controller = new AbortController();
        setIsLoadingComments(true);
        setCommentsError(null);

        apiPrivate
            .get(`/project/task/${selectedTask.id}/comments`, { signal: controller.signal })
            .then((response) => {
                const payload = response?.data?.data ?? response?.data ?? [];
                const normalized = Array.isArray(payload) ? payload.map((item: any) => normalizeComment(item)) : [];
                setComments(normalized);
            })
            .catch((error: any) => {
                if (controller.signal.aborted) return;
                console.error("Failed to load comments", error);
                setCommentsError(commentsErrorLabel);
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoadingComments(false);
                }
            });

        return () => controller.abort();
    }, [isTaskModalOpen, selectedTask?.id, commentsErrorLabel]);

    const buildDefaultFormValues = useMemo(() => {
        return () => {
            const base = createEmptyFormValues();
            const defaultAssigneeId = typeof selectedTask?.assignedTo === "string" ? selectedTask.assignedTo : undefined;
            if (defaultAssigneeId && availableAssignees.some((member) => member.userId === defaultAssigneeId)) {
                base.assigneeIds = [defaultAssigneeId];
            }
            return base;
        };
    }, [selectedTask?.assignedTo, availableAssignees]);

    useEffect(() => {
        const initialSubtasks = Array.isArray(selectedTask?.subtasks)
            ? selectedTask.subtasks.map((sub: any) => normalizeSubtask(sub))
            : [];
        setSubtasks(initialSubtasks);
        lastEmittedProgressRef.current = null;
    }, [selectedTask?.id]);

    useEffect(() => {
        setShowAddForm(false);
        setFormValues(buildDefaultFormValues());
        setFormError(null);
    }, [selectedTask?.id, buildDefaultFormValues]);

    useEffect(() => {
        if (!isTaskModalOpen || !selectedTask?.id) {
            return;
        }

        let isCancelled = false;

        const fetchSubtasks = async () => {
            setIsLoadingSubtasks(true);
            setLoadError(null);
            try {
                const response = await apiPrivate.get(`/project/task/${selectedTask.id}/subtasks`);
                if (!isCancelled) {
                    const items = Array.isArray(response.data?.data)
                        ? response.data.data.map((item: any) => normalizeSubtask(item))
                        : [];
                    setSubtasks(items);
                    lastEmittedProgressRef.current = null;
                }
            } catch (error) {
                console.error("Failed to load subtasks", error);
                if (!isCancelled) {
                    setLoadError("โหลดงานย่อยไม่สำเร็จ");
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingSubtasks(false);
                }
            }
        };

        fetchSubtasks();

        return () => {
            isCancelled = true;
        };
    }, [isTaskModalOpen, selectedTask?.id]);

    useEffect(() => {
        if (!selectedTask?.id || !onTaskProgressChanged) return;
        const total = subtasks.reduce(
            (sum, item) => sum + getProgressValue(item.progressPercent),
            0
        );
        const average = subtasks.length > 0 ? Number((total / subtasks.length).toFixed(2)) : 0;
        if (lastEmittedProgressRef.current === average) {
            return;
        }
        lastEmittedProgressRef.current = average;
        onTaskProgressChanged(selectedTask.id, average);
    }, [subtasks, selectedTask?.id, onTaskProgressChanged, getProgressValue]);

    const formatDateOnly = (value?: string) => {
        if (!value) return "-";
        try {
            const date = new Date(value);
            return new Intl.DateTimeFormat("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
            }).format(date);
        } catch (error) {
            return value;
        }
    };

    const resetForm = () => {
        setFormValues(buildDefaultFormValues());
        setFormError(null);
    };

    const handleToggleAddForm = () => {
        if (showAddForm) {
            resetForm();
        }
        if (!showAddForm) {
            setFormValues(buildDefaultFormValues());
            setFormError(null);
        }
        setShowAddForm((prev) => !prev);
    };

    const handleCreateSubtask = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedTitle = formValues.title.trim();

        if (!trimmedTitle) {
            setFormError("กรุณาระบุชื่องานย่อย");
            return;
        }

        if (formValues.hasDueDate && formValues.dueDate && formValues.startDate && formValues.dueDate < formValues.startDate) {
            setFormError("วันครบกำหนดต้องไม่ก่อนวันเริ่ม");
            return;
        }

        setFormError(null);
        setIsSubmitting(true);

        const rawProgress = Number(formValues.progressPercent);
        const progressPercent = Number.isNaN(rawProgress)
            ? 0
            : Math.min(100, Math.max(0, rawProgress));

        try {
            const payload = {
                title: trimmedTitle,
                description: formValues.description.trim() || undefined,
                status_id: selectedTask?.statusId ? Number(selectedTask.statusId) : undefined,
                progress_percent: progressPercent,
                start_date: formValues.startDate || undefined,
                has_due_date: formValues.hasDueDate,
                due_date: formValues.hasDueDate && formValues.dueDate ? formValues.dueDate : undefined,
                changed_by: user?.id
            };

            if (formValues.assigneeIds.length > 0) {
                (payload as any).assignee_user_ids = formValues.assigneeIds;
            }

            const response = await apiPrivate.post(`/project/task/${selectedTask.id}/subtasks`, payload);
            const created = response.data?.data;
            if (created) {
                setSubtasks((prev) => [...prev, normalizeSubtask(created)]);
                lastEmittedProgressRef.current = null;
            }

            resetForm();
            setShowAddForm(false);
        } catch (error: any) {
            console.error("Failed to create subtask", error);
            const message = error?.response?.data?.message ?? "ไม่สามารถสร้างงานย่อยได้";
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleAssignee = (userId: string) => {
        setFormValues((prev) => {
            const exists = prev.assigneeIds.includes(userId);
            const updated = exists
                ? prev.assigneeIds.filter((value) => value !== userId)
                : [...prev.assigneeIds, userId];
            return {
                ...prev,
                assigneeIds: updated,
            };
        });
    };

    const selectedAssigneeNames = useMemo(() => {
        const lookup = new Map(availableAssignees.map((assignee) => [assignee.userId, assignee.fullName ?? assignee.userId]));
        return formValues.assigneeIds
            .map((id) => lookup.get(id))
            .filter((value): value is string => Boolean(value && value.trim()));
    }, [availableAssignees, formValues.assigneeIds]);

    const handleStartEdit = (subtask: SubtaskSummary) => {
        setEditingSubtaskId(subtask.id);
        setEditProgressPercent(String(getProgressValue(subtask.progressPercent)));
        setUpdateError(null);
    };

    const handleCancelEdit = () => {
        setEditingSubtaskId(null);
        setIsUpdatingSubtask(false);
        setUpdateError(null);
    };

    const handleUpdateSubtask = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingSubtaskId) return;

        const progressNumber = Number(editProgressPercent);
        if (Number.isNaN(progressNumber)) {
            setUpdateError("กรุณาระบุความคืบหน้าที่ถูกต้อง");
            return;
        }

        const payload: Record<string, any> = {
            progress_percent: Math.min(100, Math.max(0, progressNumber)),
        };

        setIsUpdatingSubtask(true);
        setUpdateError(null);

        try {
            const response = await apiPrivate.patch(
                `/project/task/${selectedTask.id}/subtasks/${editingSubtaskId}`,
                payload
            );
            const updated = response.data?.data;
            if (updated) {
                const normalized = normalizeSubtask(updated);
                setSubtasks((prev) =>
                    prev.map((subtask) =>
                        subtask.id === normalized.id ? normalized : subtask
                    )
                );
                lastEmittedProgressRef.current = null;
            }
            setEditingSubtaskId(null);
            setUpdateError(null);
        } catch (error: any) {
            console.error("Failed to update subtask", error);
            const message = error?.response?.data?.message ?? "ไม่สามารถอัปเดตงานย่อยได้";
            setUpdateError(message);
        } finally {
            setIsUpdatingSubtask(false);
        }
    };

    return (
        <>
            <MinimalModal
                isOpen={isTaskModalOpen}
                onClose={handleCloseTaskModal}
                title={selectedTask.title || "รายละเอียดงาน"}
                width="max-w-lg"
            >
                <div className="space-y-5 text-sm text-slate-600">
                    <div className="flex flex-wrap items-center gap-2">
                        {(() => {
                            const priorityMeta = selectedTask.priority ? priorityConfig[selectedTask.priority] : undefined;
                            const badgeClass = priorityMeta?.badgeClass ?? "border-slate-200 bg-slate-100 text-slate-500";
                            const dotClass = priorityMeta?.dotClass ?? "bg-slate-400";
                            const priorityLabel = priorityMeta?.label ?? (selectedTask.priority ? `${selectedTask.priority.charAt(0).toUpperCase()}${selectedTask.priority.slice(1)}` : "No Priority");

                            return (
                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}>
                                    <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                                    {priorityLabel}
                                </span>
                            );
                        })()}
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                            <FiHash size={14} className="text-slate-400" />
                            {selectedTask.id}
                        </span>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-600">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                            {t('project.description')}
                        </p>
                        <p className="whitespace-pre-line">
                            {selectedTask.description?.trim()
                                ? selectedTask.description
                                : "ยังไม่มีการระบุรายละเอียดสำหรับงานนี้"}
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5">
                                <FiUser size={14} />
                                {t('project.assignee')}
                            </div>
                            <p className="text-sm font-medium text-slate-700">
                                {selectedTask.assignedTo ?? "ยังไม่มอบหมาย"}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">
                                <FiFlag size={14} />
                                {t('project.progress')}
                            </div>
                            {selectedTask.progressPercent != null && selectedTask.progressPercent !== "" ? (
                                <div className="space-y-2">
                                    {(() => {
                                        const progressValue = getProgressValue(selectedTask.progressPercent);
                                        const appearance = getProgressAppearance(progressValue);
                                        return (
                                            <>
                                                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                                                    <span>{t('project.table_status')}</span>
                                                    <span className="text-slate-600">{progressValue}%</span>
                                                </div>
                                                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                                                    <div
                                                        className="progress-bar-fill h-full rounded-full transition-all duration-500 ease-out"
                                                        style={{
                                                            width: `${progressValue}%`,
                                                            background: appearance.gradient,
                                                            backgroundSize: "200% 100%",
                                                            ["--glow-color" as any]: appearance.glowColor,
                                                        }}
                                                    />
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <p className="text-sm font-medium text-slate-700">
                                    ยังไม่ระบุ
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5">
                                <FiCalendar size={14} />
                                {t('project.table_created_at')}
                            </div>
                            <p className="text-sm font-medium text-slate-700">
                                {formatDateTime(selectedTask.createdAt)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5">
                                <FiCalendar size={14} />
                                {t('project.last_updated')}
                            </div>
                            <p className="text-sm font-medium text-slate-700">
                                {formatDateTime(selectedTask.updatedAt)}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide">
                                <FiList size={14} />
                                {t('project.subtask')}
                            </div>
                            <button
                                type="button"
                                onClick={handleToggleAddForm}
                                className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600 transition hover:border-primary-300 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
                            >
                                <FiPlus size={12} />
                                {showAddForm ? t("project.status_cancelled") : t("project.add_subtask")}
                            </button>
                        </div>

                        {showAddForm && (
                            <form className="mt-4 space-y-4" onSubmit={handleCreateSubtask}>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {t('project.subtask_name')} <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formValues.title}
                                        onChange={(event) =>
                                            setFormValues((prev) => ({
                                                ...prev,
                                                title: event.target.value,
                                            }))
                                        }
                                        placeholder="ระบุชื่องานย่อย"
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {t('project.additional_details')}
                                    </label>
                                    <textarea
                                        value={formValues.description}
                                        onChange={(event) =>
                                            setFormValues((prev) => ({
                                                ...prev,
                                                description: event.target.value,
                                            }))
                                        }
                                        rows={3}
                                        placeholder="ข้อมูลเพิ่มเติมสำหรับทีมงาน"
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                                    />
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            {t('project.start_date')}
                                        </label>
                                        <input
                                            type="date"
                                            value={formValues.startDate}
                                            onChange={(event) =>
                                                setFormValues((prev) => ({
                                                    ...prev,
                                                    startDate: event.target.value,
                                                }))
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            <input
                                                type="checkbox"
                                                checked={formValues.hasDueDate}
                                                onChange={(event) =>
                                                    setFormValues((prev) => ({
                                                        ...prev,
                                                        hasDueDate: event.target.checked,
                                                        dueDate: event.target.checked ? prev.dueDate : "",
                                                    }))
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-400"
                                            />
                                            {t('project.set_due_date')}
                                        </label>
                                        <input
                                            type="date"
                                            value={formValues.dueDate}
                                            onChange={(event) =>
                                                setFormValues((prev) => ({
                                                    ...prev,
                                                    dueDate: event.target.value,
                                                }))
                                            }
                                            min={formValues.startDate || undefined}
                                            disabled={!formValues.hasDueDate}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {t('project.progress')} (%)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={5}
                                        value={formValues.progressPercent}
                                        onChange={(event) =>
                                            setFormValues((prev) => ({
                                                ...prev,
                                                progressPercent: event.target.value,
                                            }))
                                        }
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {t('project.subtask_assignee')}
                                    </label>
                                    {availableAssignees.length > 0 ? (
                                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                                            <div className="flex flex-wrap gap-2">
                                                {availableAssignees.map((assignee) => {
                                                    const isChecked = formValues.assigneeIds.includes(assignee.userId);
                                                    return (
                                                        <label
                                                            key={assignee.userId}
                                                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${isChecked
                                                                ? "border-primary-300 bg-primary-50 text-primary-600"
                                                                : "border-slate-200 bg-slate-50 text-slate-500"
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                value={assignee.userId}
                                                                checked={isChecked}
                                                                onChange={() => handleToggleAssignee(assignee.userId)}
                                                                className="h-3.5 w-3.5 rounded border-slate-300 text-primary-500 focus:ring-primary-400"
                                                            />
                                                            <span className="flex items-center gap-1">
                                                                <FiUser size={11} className="text-slate-400" />
                                                                {assignee.fullName ?? assignee.userId}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            {selectedAssigneeNames.length > 0 && (
                                                <p className="mt-3 text-[11px] font-medium text-primary-600">
                                                    {t('project.selected')}: {selectedAssigneeNames.join(", ")}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-500">
                                            {t('project.no_project_members_to_assign')}
                                        </p>
                                    )}
                                </div>

                                {formError && (
                                    <p className="text-xs font-semibold text-rose-500">{formError}</p>
                                )}

                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={handleToggleAddForm}
                                        className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-1"
                                        disabled={isSubmitting}
                                    >
                                        {t('project.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-primary-300"
                                    >
                                        {isSubmitting ? "กำลังบันทึก..." : "บันทึกงานย่อย"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {!showAddForm && loadError && (
                            <p className="mt-3 text-xs font-semibold text-rose-500">{loadError}</p>
                        )}

                        <div className="mt-4 space-y-3">
                            {isLoadingSubtasks ? (
                                <p className="text-xs text-slate-500">{t('project.loading_subtasks')}</p>
                            ) : subtasks.length === 0 ? (
                                <p className="text-xs text-slate-500">
                                    {t('project.no_subtasks_for_this_task')}
                                </p>
                            ) : (
                                subtasks.map((subtask) => {
                                    const progressValue = getProgressValue(subtask.progressPercent);
                                    const progressAppearance = getProgressAppearance(progressValue);
                                    const assigneeNames = (subtask.assignees ?? [])
                                        .map((assignee) => assignee.fullName ?? assignee.userId)
                                        .filter((value): value is string => Boolean(value?.trim()));
                                    const canManage =
                                        !!currentUserId &&
                                        (subtask.assignees ?? []).some(
                                            (assignee) => assignee.userId === currentUserId
                                        );
                                    const isEditing = editingSubtaskId === subtask.id;

                                    return (
                                        <div
                                            key={subtask.id}
                                            className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 shadow-inner"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-700">
                                                        {subtask.title}
                                                    </p>
                                                    {subtask.description && (
                                                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                                            {subtask.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
                                                    {progressValue}%
                                                </span>
                                            </div>

                                            <div className="mt-3">
                                                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500 ease-out"
                                                        style={{
                                                            width: `${progressValue}%`,
                                                            background: progressAppearance.gradient,
                                                            backgroundSize: "200% 100%",
                                                            ["--glow-color" as any]: progressAppearance.glowColor,
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500">
                                                {assigneeNames.length > 0 && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
                                                        <FiUser size={11} className="text-slate-400" />
                                                        <span className="truncate">{assigneeNames.join(", ")}</span>
                                                    </span>
                                                )}
                                                {subtask.statusLabel && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
                                                        <FiFlag size={11} className="text-slate-400" />
                                                        {subtask.statusLabel}
                                                    </span>
                                                )}
                                                {subtask.startDate && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <FiClock size={11} className="text-slate-400" />
                                                        {formatDateOnly(subtask.startDate)}
                                                    </span>
                                                )}
                                                {subtask.hasDueDate && subtask.dueDate && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <FiCalendar size={11} className="text-slate-400" />
                                                        {formatDateOnly(subtask.dueDate)}
                                                    </span>
                                                )}
                                                {subtask.updatedAt && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <FiClock size={11} className="text-slate-300" />
                                                        {t('project.update')} {formatDateOnly(subtask.updatedAt)}
                                                    </span>
                                                )}
                                            </div>

                                            {canManage && (
                                                <div className="mt-3 rounded-lg border border-slate-200 bg-white/80 p-3">
                                                    {isEditing ? (
                                                        <form className="space-y-3 text-[11px]" onSubmit={handleUpdateSubtask}>
                                                            <div className="space-y-1">
                                                                <label className="font-semibold text-slate-500 uppercase tracking-wide">
                                                                    {t('project.update_progress')}
                                                                </label>
                                                                <input
                                                                    type="range"
                                                                    min={0}
                                                                    max={100}
                                                                    step={5}
                                                                    value={editProgressPercent}
                                                                    onChange={(event) =>
                                                                        setEditProgressPercent(event.target.value)
                                                                    }
                                                                    className="w-full accent-primary-500"
                                                                />
                                                                <p className="text-right font-semibold text-slate-600">
                                                                    {editProgressPercent}%
                                                                </p>
                                                            </div>
                                                            {updateError && (
                                                                <p className="font-semibold text-rose-500">{updateError}</p>
                                                            )}
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleCancelEdit}
                                                                    className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-1"
                                                                    disabled={isUpdatingSubtask}
                                                                >
                                                                    {t('project.cancel')}
                                                                </button>
                                                                <button
                                                                    type="submit"
                                                                    disabled={isUpdatingSubtask}
                                                                    className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-primary-300"
                                                                >
                                                                    {isUpdatingSubtask ? t("project.saving") : t("project.save_changes")}
                                                                </button>
                                                            </div>
                                                        </form>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEdit(subtask)}
                                                            className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[11px] font-semibold text-primary-600 transition hover:border-primary-300 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
                                                        >
                                                            <FiEdit2 size={12} />
                                                            {t('project.adjust_percentage')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide">
                                <FiMessageCircle size={14} />
                                {commentSectionTitle}
                            </div>
                            <p className="text-xs text-slate-400">
                                ข้อความจำลองสำหรับออกแบบส่วนแสดงความคิดเห็น ระบบจริงจะเชื่อมต่อในขั้นต่อไป
                            </p>
                        </div>
                        <div className="max-h-60 space-y-3 overflow-y-auto pr-1">
                            {mockComments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-600">
                                        {getInitials(comment.author)}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-700">{comment.author}</p>
                                            {comment.role && (
                                                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-600">
                                                    {comment.role}
                                                </span>
                                            )}
                                            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                                <FiClock size={11} />
                                                {comment.timestamp}
                                            </span>
                                        </div>
                                        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                                            {comment.message}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                เพิ่มความคิดเห็น
                            </label>
                            <textarea
                                disabled
                                rows={3}
                                placeholder="พื้นที่เพิ่มความคิดเห็นจะพร้อมใช้งานในเวอร์ชันถัดไป"
                                className="w-full resize-none rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 placeholder:text-slate-400 focus:outline-none"
                            />
                            <p className="text-[11px] text-slate-400">
                                * แสดงข้อมูลตัวอย่างเท่านั้น ระบบคอมเมนต์จริงจะพร้อมใช้งานเร็วๆ นี้
                            </p>
                        </div>
                    </div>
                </div>
            </MinimalModal>
        </>
    )
}

export default ModalDetailTask
