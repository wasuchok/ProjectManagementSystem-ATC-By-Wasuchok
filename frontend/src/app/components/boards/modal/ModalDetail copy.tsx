"use client"
import { useLanguage } from "@/app/contexts/LanguageContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import Lottie from "lottie-react";
import { useEffect, useState } from "react";
import { FiCalendar, FiCheck, FiClipboard, FiFlag, FiHash, FiPlus, FiTrash2, FiUsers } from "react-icons/fi";
import projectAnimation from "../../../../../public/Comacon - planning.json";
import { CustomButton } from "../../Input/CustomButton";
import TextArea from "../../Input/TextArea";
import TextField from "../../Input/TextField";
import MinimalModal from "../../MinimalModal";

const ModalDetail = ({ open, setOpen, project }: any) => {
    const { t } = useLanguage();
    const [taskList, setTaskList] = useState<any>([]);

    const getTaskStatus = async () => {
        try {
            const response = await apiPrivate.get(`/project/task-status/get-all-status-by-project/${project.id}`)

            if (response.status == 200) {
                console.log(response.data.data)
                setTaskList(response.data.data)
            }
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        getTaskStatus()
    }, [])


    const handleAddTask = () => {
        setTaskList((prev: any) => [
            ...prev,
            {
                id: Date.now(),
                title: "",
                is_default: false,
                is_done: false,
            },
        ]);
    };



    const handleRemoveTask = (id: number) => {
        setTaskList((prev: any) => prev.filter((task: any) => task.id !== id));
    };

    const handleChangeTitle = (id: number, value: string) => {
        setTaskList((prev: any) =>
            prev.map((task: any) =>
                task.id === id ? { ...task, title: value } : task
            )
        );
    };

    const handleToggle = (id: number, field: "is_default" | "is_done") => {
        setTaskList((prev: any) =>
            prev.map((task: any) => {

                if (field === "is_default") {

                    if (task.id === id) {
                        return { ...task, is_default: true, is_done: false };
                    }

                    return { ...task, is_default: false };
                }

                if (field === "is_done") {

                    if (task.id === id) {
                        return { ...task, is_done: true, is_default: false };
                    }

                    return { ...task, is_done: false };
                }
                return task;
            })
        );
    };





    const handleSubmitAll = async () => {
        const validTasks = taskList.filter((t: any) => t.title.trim() !== "");
        if (validTasks.length === 0) return alert("กรุณากรอกชื่อหัวข้องานก่อนครับ 😅");

        try {
            const payload = {
                project_id: project.id,
                statuses: validTasks.map((task: any, index: any) => ({
                    name: task.title,
                    color: "#3B82F6",
                    order_index: index + 1,
                    is_default: task.is_default,
                    is_done: task.is_done,
                })),
            };

            const response = await apiPrivate.post(`/project/task-status/create`, payload);

            if (response.status === 201) {
                alert("✅ เพิ่มหัวข้องานสำเร็จ!");
                getTaskStatus();
            } else {
                alert("⚠️ เพิ่มหัวข้อไม่สำเร็จ");
            }
        } catch (error) {
            console.error("❌ Error creating task statuses:", error);
            alert("เกิดข้อผิดพลาดขณะบันทึก");
        }
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

    return (
        <MinimalModal
            isOpen={open}
            onClose={() => setOpen(false)}
            title={t("project.detail_project")}
            width="max-w-3xl"
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

                <div className="border border-gray-100 rounded-lg p-4 bg-white space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">
                            หัวข้องาน ({taskList.length})
                        </p>
                        <button
                            onClick={handleAddTask}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium text-primary-600 border border-primary-300 hover:bg-primary-50 transition"
                        >
                            <FiPlus size={14} /> เพิ่มหัวข้อ
                        </button>
                    </div>

                    {/* ✅ ถ้ามีสถานะอยู่แล้วในระบบ */}
                    {taskList.length > 0 && taskList.some((t: any) => t.id && !String(t.id).includes("Date")) ? (
                        <div className="space-y-2">
                            {taskList.map((task: any, index: number) => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md p-3 hover:bg-gray-100 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* แสดงสีของสถานะ */}
                                        <span
                                            className="w-3 h-3 rounded-full border"
                                            style={{ backgroundColor: task.color || "#9CA3AF" }}
                                        ></span>

                                        <div>
                                            <p className="text-sm font-medium text-gray-800">
                                                {task.name}
                                            </p>
                                            <div className="flex gap-2 text-xs mt-1">
                                                {task.is_default && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                                        ค่าเริ่มต้น
                                                    </span>
                                                )}
                                                {task.is_done && (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                                        เสร็จสิ้น
                                                    </span>
                                                )}
                                                {!task.is_default && !task.is_done && (
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                                        ปกติ
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        ลำดับที่ {task.order_index}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* 🆕 ถ้ายังไม่มีสถานะเลย ให้แสดงช่องเพิ่ม */
                        <div className="space-y-2">
                            {taskList.map((task: any, index: number) => (
                                <div key={task.id} className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                                    <TextField
                                        className="flex-1"
                                        fieldSize="sm"
                                        placeholder={`หัวข้อที่ ${index + 1}`}
                                        value={task.title}
                                        onChange={(e) => handleChangeTitle(task.id, e.target.value)}
                                    />

                                    <div className="flex items-center gap-3 text-sm">
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={task.is_default}
                                                onChange={() => handleToggle(task.id, "is_default")}
                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-gray-600">ค่าเริ่มต้น</span>
                                        </label>

                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={task.is_done}
                                                onChange={() => handleToggle(task.id, "is_done")}
                                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            />
                                            <span className="text-gray-600">เสร็จสิ้น</span>
                                        </label>
                                    </div>

                                    {taskList.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveTask(task.id)}
                                            className="bg-red-100 p-2 text-red-500 hover:bg-red-50 rounded-md transition"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ปุ่มยืนยัน */}
                    {taskList.length > 0 &&
                        taskList.every((t: any) => !t.id || String(t.id).includes("Date")) && (
                            <div className="flex justify-end mt-4">
                                <CustomButton size="sm" onClick={handleSubmitAll}>
                                    <FiCheck className="mr-1" /> ยืนยันทั้งหมด
                                </CustomButton>
                            </div>
                        )}
                </div>



                <div className="border border-gray-100 rounded-lg p-4 bg-white space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="text-primary-500 mt-1 flex-shrink-0">
                            <FiClipboard size={16} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-600 mb-2">{t('project.project_name')}</p>
                            <TextField value={project?.projectName || "-"} readOnly />
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

                            />
                        </div>
                    </div>
                </div>


                <div className="border border-gray-100 rounded-lg p-4 bg-white">
                    <div className="flex items-center gap-2 mb-3">
                        <FiUsers className="text-primary-500" size={20} />
                        <p className="text-sm font-semibold text-gray-800">
                            {t('project.list_of_employees')} ({project?.employees?.length || 0})
                        </p>
                    </div>

                    {project?.employees?.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                            {project.employees.map((member: any) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2 hover:bg-gray-100 transition-colors duration-200 border border-gray-100"
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
                                        className={`text-xs px-2 py-0.5 rounded-full ${member.status === "joined"
                                            ? "bg-green-50 text-green-600 border border-green-100"
                                            : "bg-yellow-50 text-yellow-600 border border-yellow-100"
                                            }`}
                                    >
                                        {member.status === "joined" ? "Joined" : "Invited"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <FiUsers className="text-gray-300 mx-auto mb-2" size={32} />
                            <p className="text-sm text-gray-500">{t('no_member')}</p>
                        </div>
                    )}
                </div>



            </div>
        </MinimalModal >
    );
};

export default ModalDetail;