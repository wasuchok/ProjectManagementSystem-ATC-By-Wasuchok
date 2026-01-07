"use client";

import { useLanguage } from "@/app/contexts/LanguageContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { FaCheckCircle, FaTimesCircle, FaUser, FaUsers } from "react-icons/fa";
import { CustomAlert } from "../../CustomAlertModal";
import MinimalModal from "../../MinimalModal";
const ModalInviteJoin = ({ open, setOpen, projectInvite, fetchInviteCountProject, fetchAllProjectsByEmployee }: any) => {
    const { t } = useLanguage();



    const handleAccept = async (projectId: number) => {
        const confirm = await CustomAlert({
            type: "confirm",
            title: t("modal.are_you_sure"),
            message: t("modal.do_you_want_to_save_information"),
        });
        if (confirm) {
            const response = await apiPrivate.put("/project/update/invite", {
                project_id: projectId,
                status: "joined"
            })

            if (response.status == 200) {
                await CustomAlert({
                    type: "success",
                    title: t('alert.success'),
                    message: t('alert.alert_success')
                })
                fetchInviteCountProject()
                fetchAllProjectsByEmployee()
                setOpen(false)
            }
        }
    };

    const handleReject = async (projectId: number) => {
        const confirm = await CustomAlert({
            type: "confirm",
            title: t("modal.are_you_sure"),
            message: t("modal.do_you_want_to_save_information"),
        });
        if (confirm) {
            const response = await apiPrivate.put("/project/update/invite", {
                project_id: projectId,
                status: "declined"
            })

            if (response.status == 200) {
                await CustomAlert({
                    type: "success",
                    title: t('alert.success'),
                    message: t('alert.alert_success')
                })
                fetchInviteCountProject()
                fetchAllProjectsByEmployee()
                setOpen(false)
            }
        }
    };

    return (
        <MinimalModal
            isOpen={open}
            onClose={() => setOpen(false)}
            title={t("project.my_invitations")}
            width="max-w-2xl"
        >
            <div className=" space-y-3 max-h-[70vh] overflow-y-auto">
                {projectInvite.length > 0 ? (
                    projectInvite.map((project: any) => (
                        <div
                            key={project.id}
                            className="flex items-center justify-between border rounded-xl p-4 bg-gray-50 dark:bg-gray-800 shadow-sm hover:shadow-md transition"
                        >

                            <div className="flex items-start gap-3">
                                <FaUser className="text-blue-500 text-xl mt-1" />
                                <div>
                                    <h3 className="font-semibold text-gray-800 dark:text-white">
                                        {project.tb_project_projects.name}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                        คำเชิญจาก: <span className="font-medium">{project.user_account.full_name}</span>
                                    </p>
                                </div>
                            </div>


                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleReject(project.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-400 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition"
                                >
                                    <FaTimesCircle className="text-red-500" />
                                    <span className="text-sm">ไม่ยอมรับ</span>
                                </button>
                                <button
                                    onClick={() => handleAccept(project.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition"
                                >
                                    <FaCheckCircle />
                                    <span className="text-sm">ยอมรับ</span>
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="w-full flex flex-col items-center py-6 text-gray-500">
                        <FaUsers className="h-10 w-10 mb-3" />
                        <p>ไม่มีคำเชิญในขณะนี้</p>
                    </div>
                )}
            </div>
        </MinimalModal>
    );
};

export default ModalInviteJoin;
