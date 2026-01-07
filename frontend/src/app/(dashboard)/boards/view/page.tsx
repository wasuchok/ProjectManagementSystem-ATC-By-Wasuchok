"use client";

import ModalInviteJoin from "@/app/components/boards/modal/ModalInviteJoin";
import { Column, ScrollableTable } from "@/app/components/boards/table/ScrollableTable";
import { CustomAlert } from "@/app/components/CustomAlertModal";
import { CustomButton } from "@/app/components/Input/CustomButton";
import TextField from "@/app/components/Input/TextField";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { getSocket } from "@/app/utils/socket";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiUserPlus, FiUsers } from "react-icons/fi";

interface ProjectData {
    id: number;
    projectName: string;
    priority: string;
    status: string;
    description: string;
    join_enabled: boolean;
    created_at: string;
    join_code: string;
    num: number;
    employees: any[]; // สามารถกำหนด type ละเอียดเพิ่มได้ถ้าทราบ structure ของ member
    created_by: any;
    owner_id: any;
    isOwner: boolean;
}

const Page = () => {

    const router = useRouter()
    const { user } = useUser();
    const { t } = useLanguage();
    const [data, setData] = useState<ProjectData[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [openModalInviteJoin, setOpenModalInviteJoin] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)
    const [projectInvite, setProjectInvite] = useState([])
    const [searchInput, setSearchInput] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [joinCode, setJoinCode] = useState("")
    const [joining, setJoining] = useState(false)
    const [joinPanelOpen, setJoinPanelOpen] = useState(false)

    const fetchInviteProjectEmployee = async () => {
        try {
            fetchAllProjectsByEmployee()
            fetchAllProjectsByEmployeeStatusInvite()
            setOpenModalInviteJoin(true)
        } catch (error) {
            console.log(error)
        }
    }


    const fetchInviteCountProject = async () => {
        try {
            const response = await apiPrivate.get(`/project/view/invite-count/${user?.id}`)

            if (response.status == 200) {
                setPendingCount(response.data.data)
            }
        } catch (error) {
            console.log(error)
            setPendingCount(0)
        }
    }

    const fetchAllProjectsByEmployeeStatusInvite = async () => {
        try {
            if (!user?.id) return;

            const response = await apiPrivate.get(`/project/view/invite/${user?.id}`)

            if (response.status == 200) {
                console.log(response.data.data)
                setProjectInvite(response.data.data)
            }

        } catch (error) {
            console.log(error)
        }
    }

    const fetchAllProjectsByEmployee = async () => {
        try {
            if (!user?.id) return;
            setLoading(true);

            const params = {
                page: currentPage,
                limit: 10,
                status: "",
                priority: "",
                search: searchTerm,
                created_by: user.id,
            };

            const response = await apiPrivate.get(`/project/views`, { params });

            if (response.status === 200) {
                const { result, pagination } = response.data.data;

                const mappedData = result.map((item: any, index: number) => {
                    const ownerId =
                        item.created_by ??
                        item.createdBy ??
                        item.owner_id ??
                        item.ownerId ??
                        item.owner?.id ??
                        item.owner?.user_id ??
                        item.owner?.userId ??
                        null;

                    return {
                        id: item.id,
                        projectName: item.name,
                        priority: item.priority,
                        status: item.status,
                        description: item.description,
                        join_enabled: item.join_enabled,
                        created_at: new Date(item.created_at).toLocaleDateString("th-TH"),
                        join_code: item.join_code,
                        num: index + 1,
                        employees: item.tb_project_members,
                        created_by: item.created_by ?? item.createdBy ?? null,
                        owner_id: ownerId,
                        isOwner:
                            ownerId != null &&
                            user?.id != null &&
                            String(ownerId) === String(user.id),
                    };
                });

                setData(mappedData);
                setTotalPages(pagination.totalPages);
            }
        } catch (error) {
            console.error("❌ Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const columns: Column<ProjectData>[] = [
        {
            header: t("project.table_no"), accessor: "num",
        },
        { header: t("project.table_name"), accessor: "projectName" },
        {
            header: t("project.table_priority"),
            accessor: "priority",
            render: (value: any) => {
                const palette: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
                    low: {
                        label: t("project.priority_low"),
                        bg: "bg-emerald-50",
                        text: "text-emerald-600",
                        border: "border-emerald-200",
                        dot: "bg-emerald-400",
                    },
                    normal: {
                        label: t("project.priority_normal"),
                        bg: "bg-sky-50",
                        text: "text-sky-600",
                        border: "border-sky-200",
                        dot: "bg-sky-400",
                    },
                    high: {
                        label: t("project.priority_high"),
                        bg: "bg-amber-50",
                        text: "text-amber-600",
                        border: "border-amber-200",
                        dot: "bg-amber-400",
                    },
                    urgent: {
                        label: t("project.priority_urgent"),
                        bg: "bg-rose-50",
                        text: "text-rose-600",
                        border: "border-rose-200",
                        dot: "bg-rose-400",
                    },
                };

                const config = palette[value as keyof typeof palette] ?? {
                    label: value ?? "-",
                    bg: "bg-slate-100",
                    text: "text-slate-600",
                    border: "border-slate-200",
                    dot: "bg-slate-400",
                };

                return (
                    <span
                        className={`${config.bg} ${config.text} inline-flex items-center gap-2 rounded-full border ${config.border} px-3 py-1 text-xs font-semibold`}
                    >
                        <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                        {config.label}
                    </span>
                );
            },
        }
        ,
        {
            header: t("project.table_status"),
            accessor: "status",
            render: (value: any) => {
                let styleClass = "bg-gray-100 text-gray-600 border border-gray-200";
                let text = value;

                switch (value) {
                    case "draft":
                        styleClass = "bg-yellow-50 text-yellow-700 border border-yellow-200";
                        text = t("project.status_draft");
                        break;
                    case "started":
                        styleClass = "bg-blue-50 text-blue-700 border border-blue-200";
                        text = t("project.status_started");
                        break;
                    case "completed":
                        styleClass = "bg-green-50 text-green-700 border border-green-200";
                        text = t("project.status_completed");
                        break;
                    case "cancelled":
                        styleClass = "bg-red-50 text-red-700 border border-red-200";
                        text = t("project.status_cancelled");
                        break;
                }

                return (
                    <span
                        className={`${styleClass} px-3 py-1 text-xs font-semibold rounded-full shadow-sm`}
                    >
                        {text}
                    </span>
                );
            },
        },
        { header: t("project.table_created_at"), accessor: "created_at" },
    ];

    const handleEdit = (row: ProjectData) => {
        router.push(`/boards/detail/${row.id}`);
    };

    const handleDelete = async (row: ProjectData) => {
        const isConfirmed = await CustomAlert({
            type: "warning",
            title: t("alert.are_you_sure"),
            message: `${t("project.delete")}: ${row.projectName}`,
            showCancelButton: true,
            confirmButtonText: t("actions.delete"),
            cancelButtonText: t("actions.cancel"),
        });

        if (isConfirmed) {
            try {
                const response = await apiPrivate.delete(`/project/${row.id}`);
                if (response.status === 200) {
                    await CustomAlert({
                        type: "success",
                        title: t("alert.success"),
                        message: t("alert.alert_success") || "Deleted successfully.",
                    });
                    await fetchAllProjectsByEmployee();
                    if (user) fetchInviteCountProject();
                }
            } catch (error: any) {
                console.error("❌ Delete project error:", error);
                await CustomAlert({
                    type: "error",
                    title: t("alert.error"),
                    message: error?.response?.data?.message || t("alert.alert_error"),
                });
            }
        }
    };

    useEffect(() => {
        if (user) fetchInviteCountProject()

        const socket = getSocket()

        if (!socket.connected) socket.connect()
        socket.emit('registerUser', user?.id)

        const handler = (payload: any) => {
            if (payload?.inviteCount !== undefined) {
                console.log("test payload", payload)
                setPendingCount(payload.inviteCount);
            }
        };
        socket.on('invitedCountUpdated', handler);

        return () => {
            socket.off('invitedCountUpdated', handler);
        };
    }, [user])

    useEffect(() => {
        if (user) fetchAllProjectsByEmployee();
    }, [user, currentPage, searchTerm]);

    const handleSearch = () => {
        setCurrentPage(1);
        setSearchTerm(searchInput.trim());
    };

    const handleJoinByCode = async () => {
        const code = joinCode.trim();
        if (!code) {
            await CustomAlert({
                type: "error",
                title: t("alert.error"),
                message: t("project.join_error"),
            });
            return;
        }

        setJoining(true);
        try {
            const response = await apiPrivate.post("/project/join-code", { code });
            const status = response?.data?.data?.status;
            const apiMessage: string | undefined = response?.data?.message;

            // TODO: Refactor logic checking for "แล้ว" or "already".
            // This relies on backend returning specific strings which is fragile.
            // Backend should return a specific status code for "ALREADY_JOINED".
            const alreadyJoined =
                status === "joined" &&
                (apiMessage?.toLowerCase().includes("แล้ว") || apiMessage?.toLowerCase().includes("already"));

            await CustomAlert({
                type: "success",
                title: t("alert.success"),
                message:
                    alreadyJoined
                        ? t("project.join_already")
                        : apiMessage || t("project.join_success"),
            });
            setJoinCode("");
            await fetchAllProjectsByEmployee();
        } catch (error: any) {
            console.error("❌ Join project error:", error);
            const message =
                error?.response?.data?.message ??
                t("project.join_error") ??
                "Unable to join project.";
            await CustomAlert({
                type: "error",
                title: t("alert.error"),
                message,
            });
        } finally {
            setJoining(false);
        }
    };

    return (
        <>
            <div className="space-y-4">
                <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {t("project.title")}
                        </span>
                        <h1 className="text-2xl font-semibold text-slate-800">
                            📁 {t("project.title")}
                        </h1>
                        <p className="max-w-xl text-sm text-slate-500">
                            {t('project.projects_overview_subtitle')}
                        </p>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
                        <div className="relative">
                            <CustomButton
                                onClick={fetchInviteProjectEmployee}
                                className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600"
                            >
                                <FiUsers size={16} />
                                {t('project.my_invitations')}
                                {pendingCount > 0 && (
                                    <motion.span
                                        className="absolute -top-2 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm"
                                        initial={{ scale: 0.6, opacity: 0 }}
                                        animate={{ scale: [0.9, 1.1, 1], opacity: 1 }}
                                        transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 2.5 }}
                                    >
                                        {pendingCount}
                                    </motion.span>
                                )}
                            </CustomButton>
                        </div>
                        <CustomButton
                            onClick={() => router.push("/boards/create")}
                            className="inline-flex items-center rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-primary-600 hover:to-primary-700"
                        >
                            {t('project.create')}
                        </CustomButton>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-1 md:flex-row md:items-center">
                            <TextField
                                className="w-full md:flex-1 rounded-2xl border-slate-200 bg-slate-50/60 px-5 py-3 text-sm text-slate-700 transition focus:border-primary-300 focus:bg-white"
                                fieldSize="md"
                                placeholder={`${t("project.search_placeholder")}`}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleSearch();
                                    }
                                }}
                            />
                            <CustomButton
                                variant="secondary"
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 md:w-auto"
                                onClick={handleSearch}
                            >
                                {t('project.btn_search')}
                            </CustomButton>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-500">
                                Projects in view: {data.length}
                            </span>
                            <span className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-500 md:inline-flex">
                                Pending invites: {pendingCount}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-100 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                <ScrollableTable
                    columns={columns}
                    data={data}
                    loading={loading}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-3">
                {joinPanelOpen && (
                    <div className="w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/50">
                        <p className="mb-2 text-sm font-semibold text-slate-800">
                            {t("project.join_project")}
                        </p>
                        <TextField
                            className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition focus:border-primary-300 focus:bg-white"
                            fieldSize="md"
                            placeholder={`${t("project.join_with_code_placeholder") || "Enter join code"}`}
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleJoinByCode();
                                }
                            }}
                        />
                        <div className="mt-3 flex items-center justify-end gap-2">
                            <CustomButton
                                variant="secondary"
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                                onClick={() => setJoinPanelOpen(false)}
                                disabled={joining}
                            >
                                {t("actions.cancel")}
                            </CustomButton>
                            <CustomButton
                                variant="primary"
                                className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600"
                                onClick={handleJoinByCode}
                                disabled={joining}
                            >
                                {joining ? `${t("project.join_project")}...` : t("project.join_project")}
                            </CustomButton>
                        </div>
                    </div>
                )}
                <CustomButton
                    variant="primary"
                    className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-600"
                    onClick={() => setJoinPanelOpen((prev) => !prev)}
                    aria-label={joinPanelOpen ? t("actions.cancel") : t("project.join_project")}
                    icon={<FiUserPlus size={18} />}
                >
                    <span className="hidden md:inline">{joinPanelOpen ? t("actions.cancel") : t("project.join_project")}</span>
                </CustomButton>
            </div>

            {openModalInviteJoin && (
                <ModalInviteJoin
                    open={openModalInviteJoin}
                    setOpen={setOpenModalInviteJoin}
                    projectInvite={projectInvite}
                    fetchInviteCountProject={fetchInviteCountProject}
                    fetchAllProjectsByEmployee={fetchAllProjectsByEmployee}
                />
            )}

        </>
    );
};

export default Page;
