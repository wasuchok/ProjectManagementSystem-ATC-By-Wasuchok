"use client";

import ModalDetail from "@/app/components/boards/modal/ModalDetail";
import ModalInviteJoin from "@/app/components/boards/modal/ModalInviteJoin";
import { ScrollableTable } from "@/app/components/boards/table/ScrollableTable";
import { CustomButton } from "@/app/components/Input/CustomButton";
import TextField from "@/app/components/Input/TextField";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { getSocket } from "@/app/utils/socket";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiUsers } from "react-icons/fi";

const Page = () => {

    const router = useRouter()
    const { user } = useUser();
    const { t } = useLanguage();
    const [data, setData] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [openModalDetail, setOpenModalDetail] = useState(false)
    const [openModalInviteJoin, setOpenModalInviteJoin] = useState(false)
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [pendingCount, setPendingCount] = useState(0)
    const [projectInvite, setProjectInvite] = useState([])

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
                search: "",
                created_by: user.id,
            };

            const response = await apiPrivate.get(`/project/views`, { params });

            if (response.status === 200) {
                const { result, pagination } = response.data.data;

                const mappedData = result.map((item: any, index: number) => ({
                    id: item.id,
                    projectName: item.name,
                    priority: item.priority,
                    status: item.status,
                    description: item.description,
                    join_enabled: item.join_enabled,
                    created_at: new Date(item.created_at).toLocaleDateString("th-TH"),
                    join_code: item.join_code,
                    num: (index + 1),
                    employees: item.tb_project_members
                }));

                setData(mappedData);
                setTotalPages(pagination.totalPages);
            }
        } catch (error) {
            console.error("❌ Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const columns: any = [
        {
            header: t("project.table_no"), accessor: "num",
        },
        { header: t("project.table_name"), accessor: "projectName" },
        {
            header: t("project.table_priority"),
            accessor: "priority",
            render: (value: any) => {
                let styleClass = "bg-gray-100 text-gray-600 border border-gray-200";
                let text = value;
                let icon = null;

                switch (value) {
                    case "low":
                        styleClass = "bg-green-50 text-green-700 border border-green-200";
                        text = t("project.priority_low");
                        icon = "🟢";
                        break;
                    case "normal":
                        styleClass = "bg-blue-50 text-blue-700 border border-blue-200";
                        text = t("project.priority_normal");
                        icon = "🔵";
                        break;
                    case "high":
                        styleClass = "bg-orange-50 text-orange-700 border border-orange-200";
                        text = t("project.priority_high");
                        icon = "🟠";
                        break;
                    case "urgent":
                        styleClass = "bg-red-50 text-red-700 border border-red-200";
                        text = t("project.priority_urgent");
                        icon = "🔴";
                        break;
                }

                return (
                    <span
                        className={`${styleClass} inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full shadow-sm`}
                    >
                        <span className="text-base leading-none">{icon}</span>
                        {text}
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

    const handleEdit = (row: any) => {
        console.log(row);
        setSelectedProject(row);
        setOpenModalDetail(true);
    };

    const handleDelete = (row: any) => {
        alert(`${t("project.delete")}: ${row.projectName}`);
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
    }, [user, currentPage]);

    return (
        <>
            <div className="flex flex-col gap-2 mb-3">
                <p className="text-2xl font-semibold">📁 {t("project.title")}</p>
                <div className="flex gap-2 justify-between">
                    <div className="flex gap-2">
                        <TextField
                            className=""
                            fieldSize="sm"
                            placeholder={`${t("project.search_placeholder")}`}
                        />
                        <CustomButton variant="secondary">{t('project.btn_search')}</CustomButton>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative inline-block">
                            {pendingCount > 0 && (
                                <motion.div
                                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-10"
                                    initial={{ scale: 2, rotate: 5 }}
                                    animate={{
                                        scale: [1, 1.1, 0.95, 1.1, 1],
                                        rotate: [-20, 2, -8, 10]
                                    }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 5.5,
                                        ease: "easeInOut"
                                    }}
                                >
                                    {pendingCount}
                                </motion.div>
                            )}

                            <CustomButton
                                onClick={fetchInviteProjectEmployee}
                                className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 min-w-[140px] justify-center"
                            >
                                <FiUsers size={16} />
                                {t('project.my_invitations')}
                            </CustomButton>
                        </div>
                        <CustomButton onClick={() => router.push("/boards/create")}>{t('project.create')}</CustomButton>
                    </div>
                </div>
            </div>

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

            {openModalDetail && (
                <ModalDetail
                    open={openModalDetail}
                    setOpen={setOpenModalDetail}
                    project={selectedProject}
                />
            )}

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
