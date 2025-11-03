import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { getSocket } from "@/app/utils/socket";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCalendar, FiClock, FiEdit2, FiFlag, FiHash, FiList, FiMessageCircle, FiPlus, FiUser, FiRefreshCw } from "react-icons/fi";
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

type TaskStatusOption = {
    id: string;
    title: string;
    color?: string;
};

const normalizeComment = (comment: any): any => ({
    id: String(comment.id),
    taskId: comment.task_id != null ? String(comment.task_id) : comment.taskId ?? undefined,
    userId: comment.user_id ?? comment.userId ?? "",
    message: comment.message ?? "",
    createdAt: comment.created_at ?? comment.createdAt ?? undefined,
    updatedAt: comment.updated_at ?? comment.updatedAt ?? undefined,
    authorName:
        comment.authorName,
    undefined,
    authorRole: comment.authorDepartment ?? undefined,
    data: comment
});

const sortComments = (items: TaskComment[]) => {
    const getTime = (value?: string) => {
        if (!value) return Number.NaN;
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? Number.NaN : parsed;
    };
    return items
        .slice()
        .sort((a, b) => {
            const aTime = getTime(a.createdAt);
            const bTime = getTime(b.createdAt);
            if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
            if (Number.isNaN(aTime)) return 1;
            if (Number.isNaN(bTime)) return -1;
            return aTime - bTime;
        });
};

const mergeUniqueComments = (
    existing: any[],
    incoming: any[]
) => {
    const map = new Map<string, any>();
    existing.forEach((comment) => {
        map.set(comment.id, comment);
    });
    incoming.forEach((comment) => {
        map.set(comment.id, comment);
    });
    return sortComments(Array.from(map.values()));
};

const TYPING_IDLE_TIMEOUT = 3000;
const TYPING_CLEANUP_INTERVAL = 3000;
const MAX_TYPING_DISPLAY_NAMES = 2;

const normalizeSubtask = (subtask: any): SubtaskSummary => ({
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
    statusOptions: TaskStatusOption[];
    onTaskProgressChanged?: (taskId: string, progressPercent: number) => void;
    onSubtaskUpdated?: (taskId: string, subtask: SubtaskSummary) => void;
    onSubtaskCreated?: (taskId: string, subtask: SubtaskSummary) => void;
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
    statusOptions,
    onTaskProgressChanged,
    onSubtaskUpdated,
    onSubtaskCreated,
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
    const typingSingleSuffix = resolveLabel('project.typing_single_suffix', 'กำลังพิมพ์...');
    const typingPluralSuffix = resolveLabel('project.typing_plural_suffix', 'กำลังพิมพ์...');
    const typingMoreSuffix = resolveLabel('project.typing_more_suffix', 'และอีก {count} คนกำลังพิมพ์...');
    const typingConnector = resolveLabel('project.typing_connector', 'และ');
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
    const [summaryText, setSummaryText] = useState<string | null>(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; expiresAt: number }>>({});
    const [commentSubmitError, setCommentSubmitError] = useState<string | null>(null);
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
    const currentUserName = user?.full_name ?? user?.username ?? currentUserId ?? "";
    const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
    const [editProgressPercent, setEditProgressPercent] = useState<string>("0");
    const [editStatusId, setEditStatusId] = useState<string | null>(null);
    const [isUpdatingSubtask, setIsUpdatingSubtask] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const lastEmittedProgressRef = useRef<number | null>(null);
    const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasActiveTypingRef = useRef(false);

    useEffect(() => {
        if (!editingSubtaskId) return;
        if (statusOptions.length === 0) return;
        if (editStatusId && statusOptions.some((option) => option.id === editStatusId)) {
            return;
        }
        setEditStatusId(statusOptions[0]?.id ?? null);
    }, [statusOptions, editingSubtaskId, editStatusId]);
    const typingMessage = useMemo(() => {
        const entries = Object.values(typingUsers);
        if (entries.length === 0) return "";
        const names = Array.from(
            new Set(
                entries
                    .slice()
                    .sort((a, b) => a.expiresAt - b.expiresAt)
                    .map((entry) => entry.name?.trim())
                    .filter((name): name is string => Boolean(name))
            )
        );
        if (names.length === 0) return "";
        if (names.length === 1) {
            return `${names[0]} ${typingSingleSuffix}`;
        }
        if (names.length === 2) {
            return `${names[0]} ${typingConnector} ${names[1]} ${typingPluralSuffix}`;
        }
        const [first, second] = names;
        const remainingCount = Math.max(0, names.length - MAX_TYPING_DISPLAY_NAMES);
        return `${first}, ${second} ${typingMoreSuffix.replace("{count}", String(remainingCount))}`;
    }, [typingUsers, typingSingleSuffix, typingPluralSuffix, typingMoreSuffix, typingConnector]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTypingUsers((prev) => {
                const entries = Object.entries(prev);
                if (entries.length === 0) return prev;
                const now = Date.now();
                const filtered = entries.filter(([, info]) => info.expiresAt > now);
                if (filtered.length === entries.length) return prev;
                const next: Record<string, { name: string; expiresAt: number }> = {};
                filtered.forEach(([userId, info]) => {
                    next[userId] = info;
                });
                return next;
            });
        }, TYPING_CLEANUP_INTERVAL);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!isTaskModalOpen || !selectedTask?.id) {
            return;
        }

        const controller = new AbortController();
        setIsLoadingComments(true);
        setCommentsError(null);
        setCommentSubmitError(null);
        setComments([]);
        setNewCommentMessage("");

        apiPrivate
            .get(`/project/task/${selectedTask.id}/comments`, { signal: controller.signal })
            .then((response) => {
                const payload = response?.data?.data ?? response?.data ?? [];
                const normalized = Array.isArray(payload) ? payload.map((item: any) => normalizeComment(item)) : [];
                setComments(mergeUniqueComments([], normalized));
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

    const handleSummarizeComments = useCallback(async () => {
        if (!selectedTask?.id) return;
        setIsLoadingSummary(true);
        setSummaryError(null);
        setSummaryText(null);
        try {
            const response = await apiPrivate.get(`/project/task/${selectedTask.id}/comments/summary`);
            if (response.status === 200 || response.status === 201) {
                const text = response.data?.data?.summary || '';
                setSummaryText(text);
            } else {
                setSummaryError('ไม่สามารถสรุปคอมเมนต์ได้');
            }
        } catch (e) {
            setSummaryError('ไม่สามารถสรุปคอมเมนต์ได้');
        } finally {
            setIsLoadingSummary(false);
        }
    }, [selectedTask?.id]);

    const emitTypingStart = useCallback(() => {
        if (!selectedTask?.id || !currentUserId) return;
        const socket = getSocket();
        if (!socket.connected) socket.connect();
        socket.emit('task:typing:start', {
            taskId: selectedTask.id,
            userId: currentUserId,
            displayName: currentUserName || currentUserId,
        });
        hasActiveTypingRef.current = true;
    }, [selectedTask?.id, currentUserId, currentUserName]);

    const emitTypingStop = useCallback(() => {
        if (typingStopTimerRef.current) {
            clearTimeout(typingStopTimerRef.current);
            typingStopTimerRef.current = null;
        }
        if (!hasActiveTypingRef.current) {
            return;
        }
        if (!selectedTask?.id || !currentUserId) {
            hasActiveTypingRef.current = false;
            return;
        }
        const socket = getSocket();
        if (socket.connected) {
            socket.emit('task:typing:stop', {
                taskId: selectedTask.id,
                userId: currentUserId,
            });
        }
        hasActiveTypingRef.current = false;
    }, [selectedTask?.id, currentUserId]);

    useEffect(() => {
        if (!isTaskModalOpen || !selectedTask?.id) {
            return;
        }

        const socket = getSocket();
        if (!socket.connected) socket.connect();

        const taskId = selectedTask.id;
        setTypingUsers({});

        const handleCommentCreated = (payload: any) => {
            if (!payload) return;
            const payloadTaskId = payload.taskId ?? payload.comment?.taskId ?? payload.comment?.task_id;
            if (payloadTaskId == null || Number(payloadTaskId) !== Number(taskId)) return;

            const normalized = normalizeComment(payload.comment ?? payload);
            setComments((prev) => mergeUniqueComments(prev, [normalized]));
            setTypingUsers((prev) => {
                if (!normalized.userId || !(normalized.userId in prev)) {
                    return prev;
                }
                const next = { ...prev };
                delete next[normalized.userId];
                return next;
            });
        };

        const handleTypingStart = (payload: any) => {
            if (!payload?.taskId || Number(payload.taskId) !== Number(taskId)) return;
            if (!payload?.userId || payload.userId === currentUserId) return;
            const displayName = payload.displayName ?? payload.userId;
            setTypingUsers((prev) => ({
                ...prev,
                [payload.userId]: {
                    name: displayName,
                    expiresAt: Date.now() + TYPING_IDLE_TIMEOUT,
                },
            }));
        };

        const handleTypingStop = (payload: any) => {
            if (!payload?.taskId || Number(payload.taskId) !== Number(taskId)) return;
            if (!payload?.userId || payload.userId === currentUserId) return;
            setTypingUsers((prev) => {
                if (!(payload.userId in prev)) return prev;
                const next = { ...prev };
                delete next[payload.userId];
                return next;
            });
        };

        socket.emit('joinTask', { taskId });
        socket.on('project:task:comment:created', handleCommentCreated);
        socket.on('task:typing:start', handleTypingStart);
        socket.on('task:typing:stop', handleTypingStop);

        return () => {
            socket.emit('leaveTask', { taskId });
            socket.off('project:task:comment:created', handleCommentCreated);
            socket.off('task:typing:start', handleTypingStart);
            socket.off('task:typing:stop', handleTypingStop);
            emitTypingStop();
        };
    }, [isTaskModalOpen, selectedTask?.id, currentUserId, emitTypingStop]);

    useEffect(() => {
        if (!isTaskModalOpen) {
            setTypingUsers({});
            emitTypingStop();
        }
    }, [isTaskModalOpen, emitTypingStop]);

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
                const normalized = normalizeSubtask(created);
                setSubtasks((prev) => [...prev, normalized]);
                onSubtaskCreated?.(String(selectedTask.id), normalized);
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
        setEditStatusId(subtask.statusId ?? (statusOptions[0]?.id ?? null));
        setUpdateError(null);
    };

    const handleCancelEdit = () => {
        setEditingSubtaskId(null);
        setIsUpdatingSubtask(false);
        setUpdateError(null);
        setEditStatusId(null);
    };

    const handleCommentInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        const value = event.target.value;
        setNewCommentMessage(value);
        if (!selectedTask?.id || !currentUserId) return;
        if (!hasActiveTypingRef.current) {
            emitTypingStart();
        }
        if (typingStopTimerRef.current) {
            clearTimeout(typingStopTimerRef.current);
        }
        typingStopTimerRef.current = setTimeout(() => {
            emitTypingStop();
        }, TYPING_IDLE_TIMEOUT);
    };

    const handleCommentInputBlur = () => {
        emitTypingStop();
    };

    const handleSubmitComment = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedTask?.id) return;

        const trimmedMessage = newCommentMessage.trim();
        if (!trimmedMessage) return;

        setIsSubmittingComment(true);
        setCommentSubmitError(null);

        try {
            const response = await apiPrivate.post(`/project/task/${selectedTask.id}/comments`, {
                message: trimmedMessage,
            });
            const payload = response?.data?.data ?? response?.data;
            if (Array.isArray(payload)) {
                const normalized = payload.map((item: any) => normalizeComment(item));
                setComments((prev) => mergeUniqueComments(prev, normalized));
            } else if (payload) {
                const normalized = normalizeComment(payload);
                setComments((prev) => mergeUniqueComments(prev, [normalized]));
            }
            setNewCommentMessage("");
        } catch (error: any) {
            console.error("Failed to submit comment", error);
            setCommentSubmitError(commentsSendErrorLabel);
        } finally {
            setIsSubmittingComment(false);
            emitTypingStop();
        }
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
        if (editStatusId != null && editStatusId !== "") {
            payload.status_id = Number(editStatusId);
        }

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
                onSubtaskUpdated?.(String(selectedTask.id), normalized);
                lastEmittedProgressRef.current = null;
            }
            setEditingSubtaskId(null);
            setEditStatusId(null);
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
                                                            <div className="space-y-3">
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
                                                                {statusOptions.length > 0 && (
                                                                    <div className="space-y-1">
                                                                        <label className="font-semibold uppercase tracking-wide text-slate-500">
                                                                            {t('project.table_status')}
                                                                        </label>
                                                                        <select
                                                                            value={editStatusId ?? ""}
                                                                            onChange={(event) => {
                                                                                const value = event.target.value;
                                                                                setEditStatusId(value ? value : null);
                                                                            }}
                                                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                                                                        >
                                                                            {statusOptions.map((option) => (
                                                                                <option key={option.id} value={option.id}>
                                                                                    {option.title}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                )}
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
                        <div className="mb-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide">
                                <FiMessageCircle size={14} />
                                {commentSectionTitle}
                            </div>
                            <div className="flex items-start gap-3">
                                {summaryText ? (
                                    <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-line">
                                        {summaryText}
                                    </div>
                                ) : summaryError ? (
                                    <div className="flex-1 text-xs font-semibold text-rose-500">{summaryError}</div>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={handleSummarizeComments}
                                    disabled={isLoadingSummary}
                                    className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-primary-200 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200"
                                >
                                    <FiRefreshCw className={isLoadingSummary ? 'animate-spin' : ''} size={12} />
                                    {isLoadingSummary ? 'กำลังสรุป...' : 'สรุปคอมเมนต์'}
                                </button>
                            </div>
                        </div>
                        <div className="max-h-60 space-y-3 overflow-y-auto pr-1">
                            {isLoadingComments ? (
                                <p className="text-xs text-slate-500">{commentsLoadingLabel}</p>
                            ) : commentsError ? (
                                <p className="text-xs font-semibold text-rose-500">{commentsError}</p>
                            ) : comments.length === 0 ? (
                                <p className="text-xs text-slate-500">{commentsEmptyLabel}</p>
                            ) : (
                                comments.map((comment) => {

                                    const author = comment.authorName ?? comment.userId;
                                    console.log("test tesat", comment)
                                    const displayTime = comment.createdAt ? formatDateTime(comment.createdAt) : undefined;
                                    return (
                                        <div
                                            key={comment.id}
                                            className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3"
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-600">
                                                {getInitials(author)}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-semibold text-slate-700">{author}</p>
                                                    {comment.authorRole && (
                                                        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-600">
                                                            {comment.authorRole}
                                                        </span>
                                                    )}
                                                    {displayTime && (
                                                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                                            <FiClock size={11} />
                                                            {displayTime}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                                                    {comment.message}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {typingMessage && (
                            <p className="mt-3 text-xs font-medium text-primary-600">
                                {typingMessage}
                            </p>
                        )}
                        <form className="mt-4 space-y-2" onSubmit={handleSubmitComment}>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {resolveLabel('project.add_comment', 'เพิ่มความคิดเห็น')}
                            </label>
                            <textarea
                                rows={3}
                                value={newCommentMessage}
                                onChange={handleCommentInputChange}
                                onBlur={handleCommentInputBlur}
                                placeholder={commentsPlaceholder}
                                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                disabled={isSubmittingComment}
                            />
                            {commentSubmitError && (
                                <p className="text-xs font-semibold text-rose-500">{commentSubmitError}</p>
                            )}
                            <div className="flex items-center justify-end">
                                <button
                                    type="submit"
                                    disabled={isSubmittingComment || !newCommentMessage.trim()}
                                    className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-primary-300"
                                >
                                    {isSubmittingComment ? commentsSubmittingLabel : commentsSubmitLabel}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </MinimalModal>
        </>
    )
}

export default ModalDetailTask
