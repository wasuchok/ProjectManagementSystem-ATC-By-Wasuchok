import { FiCalendar, FiFlag, FiHash, FiUser } from "react-icons/fi";
import MinimalModal from "../../MinimalModal";

const ModalDetailTask = ({ isTaskModalOpen, handleCloseTaskModal, selectedTask, priorityConfig, getProgressValue, getProgressAppearance, formatDateTime }: any) => {
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
                            รายละเอียด
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
                                ผู้รับผิดชอบ
                            </div>
                            <p className="text-sm font-medium text-slate-700">
                                {selectedTask.assignedTo ?? "ยังไม่มอบหมาย"}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">
                                <FiFlag size={14} />
                                ความคืบหน้า
                            </div>
                            {selectedTask.progressPercent != null && selectedTask.progressPercent !== "" ? (
                                <div className="space-y-2">
                                    {(() => {
                                        const progressValue = getProgressValue(selectedTask.progressPercent);
                                        const appearance = getProgressAppearance(progressValue);
                                        return (
                                            <>
                                                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                                                    <span>สถานะ</span>
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
                                สร้างเมื่อ
                            </div>
                            <p className="text-sm font-medium text-slate-700">
                                {formatDateTime(selectedTask.createdAt)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5">
                                <FiCalendar size={14} />
                                อัปเดตล่าสุด
                            </div>
                            <p className="text-sm font-medium text-slate-700">
                                {formatDateTime(selectedTask.updatedAt)}
                            </p>
                        </div>
                    </div>
                </div>
            </MinimalModal>
        </>
    )
}

export default ModalDetailTask