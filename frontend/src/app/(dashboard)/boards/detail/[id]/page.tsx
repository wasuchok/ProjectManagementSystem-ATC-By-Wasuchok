"use client";

import VirtualizedList from "@/app/components/boards/modal/VirtualizedList";
import TextField from "@/app/components/Input/TextField";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { encodeSingleHashid } from "@/app/utils/hashids";
import { getImageUrl } from "@/app/utils/imagePath";
import { CustomAlert } from "@/app/components/CustomAlertModal";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiChevronUp,
    FiClipboard,
    FiEdit2,
    FiPlay,
    FiPlus,
    FiTrash2,
    FiUserPlus,
    FiUsers,
    FiX,
} from "react-icons/fi";

const PRIORITY_META = {
    urgent: {
        label: "เร่งด่วน (Urgent)",
        className: "border-red-200 bg-red-50 text-red-700",
    },
    high: {
        label: "สูง (High)",
        className: "border-orange-200 bg-orange-50 text-orange-700",
    },
    normal: {
        label: "ปกติ (Normal)",
        className: "border-gray-200 bg-gray-50 text-gray-700",
    },
    low: {
        label: "ต่ำ (Low)",
        className: "border-green-200 bg-green-50 text-green-700",
    },
} as const;

const STATUS_META = {
    draft: {
        label: "ร่าง (Draft)",
        className: "border-gray-200 bg-gray-50 text-gray-700",
    },
    started: {
        label: "เริ่มต้นแล้ว (Started)",
        className: "border-blue-200 bg-blue-50 text-blue-700",
    },
    completed: {
        label: "เสร็จสิ้น (Completed)",
        className: "border-green-200 bg-green-50 text-green-700",
    },
    cancelled: {
        label: "ยกเลิก (Cancelled)",
        className: "border-red-200 bg-red-50 text-red-700",
    },
} as const;

const Pill = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
        {children}
    </span>
);

const SectionCard = ({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) => (
    <section
        className={`rounded-[28px] border border-slate-100 bg-white/95 shadow-[0_22px_70px_rgba(15,23,42,0.07)] ${className}`}
    >
        {children}
    </section>
);

const InfoTile = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 shadow-inner">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
        <p className="mt-2 text-base font-semibold text-slate-900 break-words">{value}</p>
    </div>
);

type StatusActionButton = {
    key: string;
    label: string;
    Icon: typeof FiPlay;
    onClick: () => void;
    disabled: boolean;
};

type SortableTaskRowProps = {
    task: any;
    index: number;
    isEditMode: boolean;
    disableRemove: boolean;
    disableMoveUp?: boolean;
    disableMoveDown?: boolean;
    focusedTaskId: any;
    onFocusTask: (id: any) => void;
    onChangeName: (id: any, value: string) => void;
    onChangeColor: (id: any, color: string) => void;
    onToggle: (id: any, field: "is_default" | "is_done") => void;
    onRemove: (id: any) => void;
    onMove?: (id: any, direction: -1 | 1) => void;
    t: (key: string) => string;
};

const TaskRow = memo(
    ({
        task,
        index,
        isEditMode,
        disableRemove,
        disableMoveUp,
        disableMoveDown,
        focusedTaskId,
        onFocusTask,
        onChangeName,
        onChangeColor,
        onToggle,
        onRemove,
        onMove,
        t,
    }: SortableTaskRowProps) => {
        const currentColor = task.color || "#3B82F6";
        const orderLabel = String(index + 1).padStart(2, "0");
        const updatedLabel = t("project.table_updated_at") || "Updated";
        const deleteLabel = t("project.delete") || "Delete";

        return (
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/90 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.05)]">
                <div className="flex flex-wrap items-start gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-inner">
                            {orderLabel}
                        </div>
                        {isEditMode && onMove && (
                            <div className="flex flex-col gap-1">
                                <button
                                    type="button"
                                    onClick={() => onMove(task.id, -1)}
                                    disabled={disableMoveUp}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Move up"
                                >
                                    <FiChevronUp size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onMove(task.id, 1)}
                                    disabled={disableMoveDown}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Move down"
                                >
                                    <FiChevronDown size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="min-w-[220px] flex-1 space-y-3">
                        <TextField
                            fieldSize="sm"
                            placeholder="ชื่อหัวข้องาน..."
                            value={task.name || task.title || ""}
                            onChange={(e) => onChangeName(task.id, e.target.value)}
                            onFocus={() => onFocusTask(task.id)}
                            autoFocus={focusedTaskId === task.id}
                            className={`${isEditMode ? "bg-white" : "bg-slate-50"} text-sm`}
                            readOnly={!isEditMode}
                        />
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 shadow-sm">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: currentColor }} />
                                {t("project.task_status_title")} #{task.order_index ?? index + 1}
                            </span>
                            {task.updated_at && (
                                <span className="text-slate-400">
                                    {updatedLabel}{" "}
                                    {new Date(task.updated_at).toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <span className="h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: currentColor }} />
                            {isEditMode && (
                                <TextField
                                    fieldSize="sm"
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => onChangeColor(task.id, e.target.value)}
                                    tabIndex={-1}
                                    className="h-9 w-16 rounded-md border border-slate-200 p-0"
                                />
                            )}
                        </div>
                        {isEditMode && (
                            <button
                                type="button"
                                onClick={() => onRemove(task.id)}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={disableRemove}
                            >
                                <FiTrash2 size={14} />
                                {deleteLabel}
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {isEditMode ? (
                        <>
                            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(task.is_default)}
                                    onChange={() => onToggle(task.id, "is_default")}
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                {t("project.default_status")}
                            </label>
                            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(task.is_done)}
                                    onChange={() => onToggle(task.id, "is_done")}
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                {t("project.done_status")}
                            </label>
                        </>
                    ) : (
                        <>
                            {task.is_default && (
                                <Pill className="border-slate-200 bg-white/70 text-slate-700">
                                    {t("project.default_status")}
                                </Pill>
                            )}
                            {task.is_done && (
                                <Pill className="border-slate-200 bg-white/70 text-slate-700">
                                    {t("project.done_status")}
                                </Pill>
                            )}
                            {!task.is_default && !task.is_done && (
                                <Pill className="border-slate-200 bg-white/70 text-slate-600">
                                    {t("project.default_status")}
                                </Pill>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }
);
TaskRow.displayName = "TaskRow";

const ProjectDetailPage = () => {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const projectIdParam = params?.id ?? null;
    const { t, lang } = useLanguage();
    const { user } = useUser();
    const [project, setProject] = useState<any | null>(null);
    const [isProjectLoading, setIsProjectLoading] = useState(true);
    const [projectError, setProjectError] = useState<string | null>(null);
    const [taskList, setTaskList] = useState<any[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [originalTaskList, setOriginalTaskList] = useState<any[]>([]);
    const [deletedIds, setDeletedIds] = useState<number[]>([]);
    const [focusedTaskId, setFocusedTaskId] = useState<any>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatingProjectStatus, setIsUpdatingProjectStatus] = useState(false);
    const [members, setMembers] = useState<any[]>(Array.isArray(project?.employees) ? project.employees : []);
    const [newMemberUsername, setNewMemberUsername] = useState("");
    const [isInvitingMember, setIsInvitingMember] = useState(false);
    const [removingMemberIds, setRemovingMemberIds] = useState<Record<string, boolean>>({});

    const fetchProjectDetail = useCallback(async () => {
        if (!projectIdParam) return;
        setIsProjectLoading(true);
        setProjectError(null);
        try {
            const response = await apiPrivate.get(`/project/${projectIdParam}`);
            const payload = response?.data?.data ?? response?.data ?? null;
            if (!payload) {
                throw new Error("PROJECT_NOT_FOUND");
            }
            const normalizedEmployees = Array.isArray(payload?.employees)
                ? payload.employees
                : Array.isArray(payload?.tb_project_members)
                    ? payload.tb_project_members
                    : [];
            setProject({
                ...payload,
                id: payload?.id ?? payload?.project_id ?? projectIdParam,
                projectName: payload?.projectName ?? payload?.name ?? payload?.title ?? "-",
                description: payload?.description ?? "",
                employees: normalizedEmployees,
            });
        } catch (error) {
            console.error("fetch project detail error", error);
            setProject(null);
            setProjectError(t("project.detail_not_found") ?? "ไม่พบข้อมูลโปรเจกต์");
        } finally {
            setIsProjectLoading(false);
        }
    }, [projectIdParam, t]);

    const activeProjectId = project?.id ?? projectIdParam ?? null;

    const fetchTaskStatus = useCallback(async () => {
        if (!activeProjectId) return;
        setIsLoadingStatus(true);
        try {
            const response = await apiPrivate.get(
                `/project/task-status/get-all-status-by-project/${activeProjectId}`
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
    }, [activeProjectId]);

    useEffect(() => {
        fetchProjectDetail();
    }, [fetchProjectDetail]);

    useEffect(() => {
        if (activeProjectId) {
            fetchTaskStatus();
            setIsEditMode(false);
        }
    }, [activeProjectId, fetchTaskStatus]);

    useEffect(() => {
        setMembers(Array.isArray(project?.employees) ? project.employees : []);
    }, [project?.employees]);

    const isAdmin = useMemo(
        () =>
            Array.isArray(user?.roles) &&
            user.roles.some((role) => role && role.toLowerCase() === "admin"),
        [user?.roles]
    );

    const isProjectOwner = useMemo(() => {
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

    const canManageStatuses = useMemo(
        () => isAdmin || isProjectOwner,
        [isAdmin, isProjectOwner]
    );

    const canManageMembers = useMemo(
        () => isAdmin || isProjectOwner,
        [isAdmin, isProjectOwner]
    );

    const ownerUserId = useMemo(() => {
        const directOwner =
            project?.owner?.user_id ??
            project?.owner?.id ??
            project?.created_by ??
            project?.createdBy ??
            project?.owner_id ??
            project?.ownerId;
        return directOwner != null ? String(directOwner) : null;
    }, [
        project?.createdBy,
        project?.created_by,
        project?.owner?.id,
        project?.owner?.user_id,
        project?.ownerId,
        project?.owner_id,
    ]);

    const taskCount = taskList.length;
    const taskRowHeight = isEditMode ? 150 : 130;
    const taskListHeight = Math.min(
        520,
        Math.max(taskRowHeight * Math.min(taskCount || 1, 5), 260)
    );


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
    const normalizedProjectStatus = String(project?.status ?? project?.project_status ?? "")
        .toLowerCase()
        .trim();
    const isDraftStatus = normalizedProjectStatus === "draft";
    const isCancelledStatus = normalizedProjectStatus === "cancelled";
    const isCompletedStatus = normalizedProjectStatus === "completed";
    const canShowBoardLink = taskCount > 0 && !isDraftStatus;
    const boardLinkLabel = isCompletedStatus
        ? t("project.view_project_history")
        : isCancelledStatus
            ? t("project.view_project_history")
            : t("project.start_planning");
    const BoardLinkIcon = (isCompletedStatus || isCancelledStatus) ? FiClipboard : FiPlay;
    const shouldShowDraftNotice = taskCount > 0 && isDraftStatus && canManageStatuses;
    const canInviteMembers = canManageMembers && !isCancelledStatus && !isCompletedStatus;
    const canRemoveMembers = canManageMembers && !isCancelledStatus && !isCompletedStatus;
    const ownerDisplayName = useMemo(() => {
        const candidates = [
            project?.owner?.full_name,
            project?.owner?.name,
            project?.owner?.display_name,
            project?.owner?.username,
            project?.owner?.email,
        ];
        const fromMembers = Array.isArray(project?.employees)
            ? project?.employees.find(
                (member: any) =>
                    member?.is_owner ||
                    member?.isOwner ||
                    (typeof member?.role === "string" && member.role.toLowerCase() === "owner")
            )
            : null;
        const memberName =
            fromMembers?.user_account?.full_name ||
            fromMembers?.user_account?.username ||
            fromMembers?.user_account?.email;
        return (
            candidates.find((value) => typeof value === "string" && value.trim().length > 0) ||
            memberName ||
            "-"
        );
    }, [project?.employees, project?.owner]);

    const formattedCreatedAt = useMemo(() => {
        if (!project?.created_at) return "-";
        try {
            const date = new Date(project.created_at);
            const locale = lang === "TH" ? "th-TH" : "en-US";
            return date.toLocaleString(locale, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return project?.created_at;
        }
    }, [lang, project?.created_at]);

    const resolvedOwnerLabel = t("project.owner_label");
    const ownerMetricLabel =
        resolvedOwnerLabel && resolvedOwnerLabel !== "project.owner_label"
            ? resolvedOwnerLabel
            : "Owner";

    const quickActionsRaw = t("project.quick_actions");
    const quickActionsLabelText =
        quickActionsRaw && quickActionsRaw !== "project.quick_actions"
            ? quickActionsRaw
            : "การจัดการด่วน";

    const quickSummaryRaw = t("project.quick_summary");
    const quickSummaryLabel =
        quickSummaryRaw && quickSummaryRaw !== "project.quick_summary"
            ? quickSummaryRaw
            : "ภาพรวมล่าสุด";

    const quickSummaryTitleRaw = t("project.quick_summary_title");
    const quickSummaryTitle =
        quickSummaryTitleRaw && quickSummaryTitleRaw !== "project.quick_summary_title"
            ? quickSummaryTitleRaw
            : "ภาพรวมทีม";

    const projectDisplayName = project?.projectName || project?.name || t("project.project_name");
    const projectDescription = project?.description || t("project.detail_project_desc");

    const snapshotMetrics = useMemo(
        () => [
            { label: t("project.task_status_title"), value: taskCount },
            { label: t("project.list_of_employees"), value: members.length },
            { label: ownerMetricLabel, value: ownerDisplayName },
        ],
        [members.length, ownerDisplayName, ownerMetricLabel, t, taskCount]
    );
    const heroHighlights = useMemo(
        () => [
            { label: t("project.table_created_at"), value: formattedCreatedAt },
            { label: t("project.join_code"), value: project?.join_code || "-" },
            { label: t("project.table_priority"), value: priorityMeta.label },
        ],
        [formattedCreatedAt, priorityMeta.label, project?.join_code, t]
    );
    const taskSectionDescriptionRaw = t("project.task_section_description");
    const taskSectionDescription =
        taskSectionDescriptionRaw && taskSectionDescriptionRaw !== "project.task_section_description"
            ? taskSectionDescriptionRaw
            : "จัดการลำดับและสีกำกับของหัวข้องานอย่างรวดเร็วในมุมมองเดียว";
    const memberSectionDescriptionRaw = t("project.member_section_description");
    const memberSectionDescription =
        memberSectionDescriptionRaw && memberSectionDescriptionRaw !== "project.member_section_description"
            ? memberSectionDescriptionRaw
            : "ควบคุมสิทธิ์และติดตามสถานะการเข้าร่วมของสมาชิกในโปรเจกต์นี้";

    const memberStatusJoinedRaw = t("project.member_status_joined");
    const memberStatusJoinedText =
        memberStatusJoinedRaw && memberStatusJoinedRaw !== "project.member_status_joined"
            ? memberStatusJoinedRaw
            : "เข้าร่วมแล้ว";
    const memberStatusInvitedRaw = t("project.member_status_invited");
    const memberStatusInvitedText =
        memberStatusInvitedRaw && memberStatusInvitedRaw !== "project.member_status_invited"
            ? memberStatusInvitedRaw
            : "รอเข้าร่วม";
    const memberStatusJoinedBadgeRaw = t("project.member_status_joined_badge");
    const memberStatusJoinedBadgeText =
        memberStatusJoinedBadgeRaw && memberStatusJoinedBadgeRaw !== "project.member_status_joined_badge"
            ? memberStatusJoinedBadgeRaw
            : "เข้าร่วมแล้ว";
    const memberStatusInvitedBadgeRaw = t("project.member_status_invited_badge");
    const memberStatusInvitedBadgeText =
        memberStatusInvitedBadgeRaw && memberStatusInvitedBadgeRaw !== "project.member_status_invited_badge"
            ? memberStatusInvitedBadgeRaw
            : "รอเข้าร่วม";

    const handleMoveTask = useCallback(
        (id: any, direction: -1 | 1) => {
            if (!isEditMode || !canManageStatuses) return;

            setTaskList((items) => {
                const index = items.findIndex((item) => String(item.id) === String(id));
                if (index === -1) return items;

                const nextIndex = index + direction;
                if (nextIndex < 0 || nextIndex >= items.length) return items;

                const next = items.slice();
                const [moved] = next.splice(index, 1);
                next.splice(nextIndex, 0, moved);

                return next.map((item: any, idx: number) => ({
                    ...item,
                    order_index: idx + 1,
                }));
            });
        },
        [canManageStatuses, isEditMode]
    );

    const handleAddTask = useCallback(() => {
        if (!isEditMode || !canManageStatuses) return;

        const newOrder = taskList.length + 1;
        const tempId = `temp-${Date.now()}`;
        const defaultNameRaw = t("project.untitled_task");
        const defaultName =
            defaultNameRaw && defaultNameRaw !== "project.untitled_task" ? defaultNameRaw : "หัวข้องานใหม่";
        const newTask = {
            id: tempId,
            name: defaultName,
            color: "#3B82F6",
            order_index: newOrder,
            is_default: false,
            is_done: false,
            _isNew: true,
        };

        setTaskList((prev) => [...prev, newTask]);
    }, [canManageStatuses, isEditMode, t, taskList.length]);

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
                    project_id: activeProjectId,
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
            await CustomAlert({
                type: "error",
                title: t("project.save_status_error"),
            });
            await fetchTaskStatus();
            setIsEditMode(false);
            setDeletedIds([]);
        } finally {
            setIsSaving(false);
        }
    }, [canManageStatuses, deletedIds, fetchTaskStatus, isSaving, originalTaskList, t, taskList]);

    const handleInviteMember = useCallback(async () => {
        if (!canInviteMembers || isInvitingMember || !activeProjectId) return;
        const trimmedUsername = newMemberUsername.trim();
        if (!trimmedUsername) return;

        const normalizedUsername = trimmedUsername.toLowerCase();

        const existing = members.some((member: any) => {
            const username = member?.user_account?.username;
            if (username && username.toLowerCase() === normalizedUsername) {
                return true;
            }
            const memberUserId =
                member?.user_id ??
                member?.user_account?.user_id ??
                member?.user_account_id ??
                member?.id;
            return (
                memberUserId != null && String(memberUserId) === trimmedUsername
            );
        });

        if (existing) {
            await CustomAlert({
                type: "info",
                title: t("project.invite_member_existing"),
            });
            return;
        }

        setIsInvitingMember(true);
        try {
            const response = await apiPrivate.post(`/project/${activeProjectId}/members`, {
                username: trimmedUsername,
            });
            const added = response?.data?.data;
            if (added) {
                const addedUserId =
                    added?.user_id ??
                    added?.user_account?.user_id ??
                    added?.id ??
                    null;

                setMembers((prev) => {
                    const filtered = prev.filter((member: any) => {
                        const memberUserId =
                            member?.user_id ??
                            member?.user_account?.user_id ??
                            member?.user_account_id ??
                            member?.id;
                        return (
                            memberUserId == null ||
                            (addedUserId != null &&
                                String(memberUserId) !== String(addedUserId))
                        );
                    });
                    return [...filtered, added];
                });
            }
            setNewMemberUsername("");
            await CustomAlert({
                type: "success",
                title: t("project.invite_member_success"),
            });
        } catch (error) {
            console.error("invite member error", error);
            await CustomAlert({
                type: "error",
                title: t("project.invite_member_error"),
            });
        } finally {
            setIsInvitingMember(false);
        }
    }, [activeProjectId, canInviteMembers, isInvitingMember, members, newMemberUsername, t]);

    const handleRemoveMember = useCallback(
        async (memberId: string) => {
            if (!canRemoveMembers || !activeProjectId) return;
            if (!memberId || memberId === ownerUserId) return;

            const confirm = await CustomAlert({
                type: "warning",
                title: t("project.remove_member_confirm_title"),
                message: t("project.remove_member_confirm_message"),
            });

            if (!confirm) {
                return;
            }

            setRemovingMemberIds((prev) => ({ ...prev, [memberId]: true }));
            try {
                await apiPrivate.delete(`/project/${activeProjectId}/members/${memberId}`);
                setMembers((prev) =>
                    prev.filter((member: any) => {
                        const memberUserId =
                            member?.user_id ??
                            member?.user_account?.user_id ??
                            member?.user_account_id ??
                            member?.id;
                        return memberUserId == null || String(memberUserId) !== memberId;
                    })
                );

                await CustomAlert({
                    type: "success",
                    title: t("project.remove_member_success"),
                });
            } catch (error) {
                console.error("remove member error", error);
                await CustomAlert({
                    type: "error",
                    title: t("project.remove_member_error"),
                });
            } finally {
                setRemovingMemberIds((prev) => {
                    const next = { ...prev };
                    delete next[memberId];
                    return next;
                });
            }
        },
        [activeProjectId, canRemoveMembers, ownerUserId, t]
    );

    const handleUpdateProjectStatus = useCallback(
        async (nextStatus: "started" | "cancelled" | "completed") => {
            if (!activeProjectId) return;

            const statusLabel =
                nextStatus === "started"
                    ? t("project.status_started")
                    : nextStatus === "completed"
                        ? t("project.status_completed")
                        : t("project.status_cancelled");

            const confirmTitle = t("project.status_update_confirm_title");
            const confirmMessageTemplate = t("project.status_update_confirm_message");
            const confirmMessage = confirmMessageTemplate.replace("{status}", statusLabel);

            const confirmed = await CustomAlert({
                type: "confirm",
                title: confirmTitle,
                message: confirmMessage,
            });

            if (!confirmed) {
                return;
            }

            setIsUpdatingProjectStatus(true);

            try {
                await apiPrivate.patch(`/project/${activeProjectId}`, { status: nextStatus });

                setProject((prev: any) =>
                    prev
                        ? {
                            ...prev,
                            status: nextStatus,
                            project_status: nextStatus,
                        }
                        : prev
                );

                const successTemplate = t("project.status_update_success");
                const successMessage = successTemplate.replace("{status}", statusLabel);
                await CustomAlert({
                    type: "success",
                    title: successMessage,
                });
            } catch (error) {
                console.error("update project status error", error);
                await CustomAlert({
                    type: "error",
                    title: t("project.status_update_error"),
                });
            } finally {
                setIsUpdatingProjectStatus(false);
            }
        },
        [activeProjectId, t]
    );
    const statusActionButtons = useMemo<StatusActionButton[]>(() => {
        const actions: StatusActionButton[] = [];
        if (isDraftStatus && !isCancelledStatus && !isCompletedStatus) {
            actions.push({
                key: "start",
                label: isUpdatingProjectStatus ? t("project.saving") : t("project.action_start_work"),
                Icon: FiPlay,
                onClick: () => handleUpdateProjectStatus("started"),
                disabled: isUpdatingProjectStatus,
            });
        }
        if (!isDraftStatus && !isCancelledStatus && !isCompletedStatus) {
            actions.push({
                key: "complete",
                label: isUpdatingProjectStatus ? t("project.saving") : t("project.status_completed"),
                Icon: FiCheck,
                onClick: () => handleUpdateProjectStatus("completed"),
                disabled: isUpdatingProjectStatus,
            });
        }
        if (!isCancelledStatus && !isCompletedStatus) {
            actions.push({
                key: "cancel",
                label: isUpdatingProjectStatus ? t("project.saving") : t("project.action_cancel_project"),
                Icon: FiX,
                onClick: () => handleUpdateProjectStatus("cancelled"),
                disabled: isUpdatingProjectStatus,
            });
        }
        return actions;
    }, [
        handleUpdateProjectStatus,
        isCancelledStatus,
        isCompletedStatus,
        isDraftStatus,
        isUpdatingProjectStatus,
        t,
    ]);

    if (isProjectLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
                {t("project.loading") || "Loading project…"}
            </div>
        );
    }

    if (projectError) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
                <p className="text-base font-medium text-rose-500">{projectError}</p>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                    {t("project.back_to_list") || "กลับไปหน้ารายการ"}
                </button>
            </div>
        );
    }

    if (!project) {
        return null;
    }

    return (
        <div className="space-y-5 pb-12">
            <section className="space-y-4">
                <div className="rounded-[26px] border border-slate-100 bg-white/95 px-3 py-3 shadow-sm shadow-slate-200/60">
                    <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-primary-800 via-primary-900 to-primary-700 p-5 text-white">
                        <div
                            className="pointer-events-none absolute inset-0 opacity-25"
                            style={{
                                backgroundImage:
                                    "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.22), transparent 55%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.35), transparent 45%), linear-gradient(135deg, rgba(255,255,255,0.08) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.08) 75%, transparent 75%, transparent)",
                                backgroundSize: "220px 220px, 260px 260px, 32px 32px",
                            }}
                        />
                        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex-1 space-y-2">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                                        {t("project.detail_project_title")}
                                    </p>
                                    <h2 className="text-3xl font-semibold">{projectDisplayName}</h2>
                                </div>
                                <p className="text-sm text-white/80">{projectDescription}</p>
                                <div className="flex flex-wrap gap-2 text-sm">
                                    <Pill className="border-white/40 bg-white/10 text-white">
                                        {priorityMeta.label}
                                    </Pill>
                                    <Pill className="border-white/40 bg-white/10 text-white">
                                        {statusMeta.label}
                                    </Pill>
                                </div>
                                {shouldShowDraftNotice && (
                                    <div className="w-fit rounded-2xl border border-white/35 bg-white/10 px-4 py-1.5 text-xs font-medium text-white">
                                        {t("project.status_draft_owner_hint")}
                                    </div>
                                )}
                            </div>
                            <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2 lg:max-w-lg">
                                {heroHighlights.map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm"
                                    >
                                        <p className="text-[11px] uppercase tracking-[0.35em] text-white/70">
                                            {item.label}
                                        </p>
                                        <p className="mt-1.5 text-base font-semibold text-white break-words">
                                            {item.value || "-"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-[26px] border border-slate-100 bg-white px-4 py-4 shadow-sm shadow-slate-200/60">
                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                {quickActionsLabelText}
                            </p>
                            {canManageStatuses && statusActionButtons.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    {statusActionButtons.map(({ key, label, Icon, onClick, disabled }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={onClick}
                                            disabled={disabled}
                                            className="inline-flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <Icon size={14} />
                                                {label}
                                            </span>
                                            <FiChevronRight className="text-slate-400" />
                                        </button>
                                    ))}
                                </div>
                            )}
                            {canShowBoardLink && (
                                <Link
                                    href={`/boards/view_board/${encodeSingleHashid(activeProjectId)}`}
                                    className="inline-flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <BoardLinkIcon size={14} />
                                        {boardLinkLabel}
                                    </span>
                                    <FiChevronRight className="text-white/70" />
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="rounded-[26px] border border-slate-100 bg-white px-4 py-4 shadow-sm shadow-slate-200/60 lg:col-span-2">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-3">
                            {quickSummaryLabel}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {snapshotMetrics.map((metric) => (
                                <InfoTile key={metric.label} label={metric.label} value={metric.value} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <div className="space-y-5 pt-4">
                <div className={`grid gap-5 ${canManageMembers ? "lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]" : ""}`}>
                    <SectionCard className="bg-white/95">
                        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-2">
                                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">
                                    {t("project.task_status_title")}
                                </p>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        {t("project.task_status_title")}
                                    </h3>
                                    <Pill className="border-gray-200 bg-gray-50 text-gray-700">{taskCount}</Pill>
                                    {isEditMode && (
                                        <Pill className="border-gray-200 bg-amber-50 text-amber-700">
                                            {t("project.edit")}
                                        </Pill>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">{taskSectionDescription}</p>
                            </div>

                            {canManageStatuses && (
                                <div className="flex flex-wrap items-center gap-2">
                                    {!isEditMode ? (
                                        <button
                                            onClick={startEdit}
                                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
                                        >
                                            <FiEdit2 size={14} />
                                            {t("project.edit")}
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleCancelEdit}
                                                disabled={isSaving}
                                                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <FiX size={14} />
                                                {t("project.cancel")}
                                            </button>
                                            <button
                                                onClick={handleDoneEdit}
                                                disabled={isSaving}
                                                className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <FiCheck size={14} />
                                                {isSaving ? t("project.saving") : t("project.done_status")}
                                            </button>
                                        </>
                                    )}

                                    <button
                                        onClick={handleAddTask}
                                        disabled={!isEditMode || isSaving}
                                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <FiPlus size={14} />
                                        {t("project.add")}
                                    </button>
                                </div>
                            )}
                        </div>

                        {isLoadingStatus ? (
                            <div className="space-y-3 p-5">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <div
                                        key={`skeleton-${idx}`}
                                        className="h-20 animate-pulse rounded-3xl border border-gray-200 bg-gray-100"
                                    />
                                ))}
                            </div>
                        ) : taskCount > 0 ? (
                            <div className="p-5">
                                <VirtualizedList
                                    items={taskList}
                                    height={taskListHeight}
                                    itemHeight={taskRowHeight}
                                    itemKey={(index, data) => String(data[index]?.id ?? index)}
                                    renderRow={(task: any, index: number) => (
                                        <div className="py-1">
                                            <TaskRow
                                                task={task}
                                                index={index}
                                                isEditMode={isEditMode}
                                                disableRemove={taskList.length <= 1}
                                                disableMoveUp={index === 0}
                                                disableMoveDown={index === taskList.length - 1}
                                                focusedTaskId={focusedTaskId}
                                                onFocusTask={setFocusedTaskId}
                                                onChangeName={handleChangeName}
                                                onChangeColor={handleChangeColor}
                                                onToggle={handleToggle}
                                                onRemove={handleRemoveTask}
                                                onMove={handleMoveTask}
                                                t={t}
                                            />
                                        </div>
                                    )}
                                />
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
                                <FiClipboard className="mx-auto mb-3 text-gray-300" size={40} />
                                <p className="mb-4 text-sm text-gray-600">
                                    {t("project.task_logs_empty")}
                                </p>
                                {canManageStatuses && (
                                    <button
                                        onClick={handleAddTask}
                                        className="mx-auto inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={!isEditMode || isSaving}
                                    >
                                        <FiPlus size={14} /> {t("project.add")}
                                    </button>
                                )}
                            </div>
                        )}
                    </SectionCard>

                    {canManageMembers && (
                        <SectionCard className="bg-white/95">
                            <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                                <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-[0.4em] text-gray-400">
                                        {t("project.list_of_employees")}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold text-slate-900">
                                            {t("project.list_of_employees")}
                                        </h3>
                                        <Pill className="border-gray-200 bg-gray-50 text-gray-700">{members.length}</Pill>
                                    </div>
                                    <p className="text-sm text-gray-500">{memberSectionDescription}</p>
                                </div>
                            </div>

                            <div className="p-5">
                                {canInviteMembers && (
                                    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
                                        <TextField
                                            value={newMemberUsername}
                                            onChange={(e) => setNewMemberUsername(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleInviteMember();
                                                }
                                            }}
                                            placeholder="กรอกชื่อผู้ใช้งาน (username)"
                                            className="md:w-72"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleInviteMember}
                                            disabled={isInvitingMember || !newMemberUsername.trim()}
                                            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <FiUserPlus size={16} />
                                            {isInvitingMember ? t("project.saving") : t("project.add")}
                                        </button>
                                    </div>
                                )}

                                {members.length > 0 ? (
                                    <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
                                        {members.map((member: any) => {
                                            const memberUserIdRaw =
                                                member?.user_id ??
                                                member?.user_account?.user_id ??
                                                member?.user_account_id ??
                                                member?.id ??
                                                "";
                                            const memberUserId = String(memberUserIdRaw);
                                            const key =
                                                member?.id ??
                                                member?.user_id ??
                                                member?.user_account?.user_id ??
                                                memberUserId;
                                            const isOwnerMember =
                                                ownerUserId != null &&
                                                memberUserId &&
                                                ownerUserId === memberUserId;
                                            const isRemoving = Boolean(removingMemberIds[memberUserId]);
                                            const avatarUrl = member.user_account?.image
                                                ? getImageUrl(member.user_account?.image)
                                                : "/user_profile.png";

                                            return (
                                                <div
                                                    key={key}
                                                    className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 shadow-sm"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={avatarUrl || ""}
                                                            alt={member.user_account?.full_name || "User"}
                                                            width={40}
                                                            height={40}
                                                            className="h-10 w-10 rounded-full border border-gray-200 object-cover"
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
                                                                <span className="h-1 w-1 rounded-full bg-gray-400"></span>
                                                                {member.status === "joined"
                                                                    ? memberStatusJoinedText
                                                                    : member.status === "invited"
                                                                        ? memberStatusInvitedText
                                                                        : member.status}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Pill className="border-gray-200 bg-gray-50 text-gray-700">
                                                            {member.status === "joined"
                                                                ? memberStatusJoinedBadgeText
                                                                : memberStatusInvitedBadgeText}
                                                        </Pill>
                                                        {canRemoveMembers && !isOwnerMember && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveMember(memberUserId)}
                                                                disabled={isRemoving}
                                                                className="inline-flex items-center justify-center rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                <FiTrash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
                                        <FiUsers className="mx-auto mb-3 text-gray-300" size={40} />
                                        <p className="text-sm text-gray-600">{t('no_member')}</p>
                                    </div>
                                )}
                            </div>
                        </SectionCard>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ProjectDetailPage;
