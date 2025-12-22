import { FiChevronRight, FiClock } from "react-icons/fi";

type TaskLogStatus = {
    id?: string | null;
    name?: string | null;
    color?: string | null;
};

type TaskLogEntry = {
    id: string;
    taskId: string;
    taskTitle?: string | null;
    subtaskId?: string | null;
    subtaskTitle?: string | null;
    changedBy?: string | null;
    changedByName?: string | null;
    changedByDepartment?: string | null;
    oldStatus?: TaskLogStatus | null;
    newStatus?: TaskLogStatus | null;
    oldProgress?: number | null;
    newProgress?: number | null;
    createdAt?: string | null;
};

interface LogsViewProps {
    taskLogs: TaskLogEntry[];
    isLoadingTaskLogs: boolean;
    taskLogsError: string | null;
    t: (key: string) => string;
    formatDateTime: (date: string) => string;
}

export default function LogsView({
    taskLogs,
    isLoadingTaskLogs,
    taskLogsError,
    t,
    formatDateTime,
}: LogsViewProps) {
    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-slate-700">{t('project.task_logs_heading')}</h2>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.4)]">
                {isLoadingTaskLogs ? (
                    <p className="text-sm text-slate-500">{t('project.task_logs_loading')}</p>
                ) : taskLogsError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-600">
                        {taskLogsError}
                    </div>
                ) : taskLogs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        {t('project.task_logs_empty')}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {taskLogs.map((log) => {
                            const actorName = log.changedByName ?? log.changedBy ?? t('project.task_logs_unknown_user');
                            const timestamp = log.createdAt ? formatDateTime(log.createdAt) : null;
                            const statusInfo = (status: TaskLogStatus | null | undefined) => ({
                                label: status?.name ?? t('project.task_logs_status_unknown'),
                                color: status?.color ?? "#94a3b8",
                            });
                            const oldStatusInfo = statusInfo(log.oldStatus);
                            const newStatusInfo = statusInfo(log.newStatus);
                            const showStatus = Boolean(log.oldStatus || log.newStatus);
                            const showProgress =
                                log.oldProgress != null &&
                                log.newProgress != null &&
                                Number(log.oldProgress) !== Number(log.newProgress);

                            return (
                                <div
                                    key={log.id}
                                    className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)]"
                                >
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                {log.taskTitle ?? t('project.task_logs_untitled_task')}
                                            </p>
                                            <p className="text-xs text-slate-400">#{log.taskId}</p>
                                        </div>
                                        {log.subtaskTitle && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                                {t('project.task_logs_subtask')}
                                                <span className="font-semibold text-slate-600">{log.subtaskTitle}</span>
                                            </span>
                                        )}
                                        {timestamp && (
                                            <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                                                <FiClock size={12} />
                                                {timestamp}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex flex-wrap items-center gap-2 text-slate-500">
                                            <span className="font-semibold text-slate-600">
                                                {t('project.task_logs_changed_by_label')}
                                            </span>
                                            <span className="text-slate-700">
                                                {actorName}
                                                {log.changedByDepartment ? ` • ${log.changedByDepartment}` : ""}
                                            </span>
                                        </div>
                                        {showStatus && (
                                            <div className="flex flex-wrap items-center gap-2 text-slate-600">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                    {t('project.task_logs_status')}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                                                    <span
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: oldStatusInfo.color ?? "#94a3b8" }}
                                                    />
                                                    {oldStatusInfo.label}
                                                </span>
                                                <FiChevronRight className="text-slate-300" size={12} />
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                                                    <span
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: newStatusInfo.color ?? "#94a3b8" }}
                                                    />
                                                    {newStatusInfo.label}
                                                </span>
                                            </div>
                                        )}
                                        {showProgress && (
                                            <div className="flex flex-wrap items-center gap-2 text-slate-600">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                    {t('project.task_logs_progress')}
                                                </span>
                                                <span className="font-semibold text-slate-600">
                                                    {Math.round(Number(log.oldProgress ?? 0))}%
                                                </span>
                                                <FiChevronRight className="text-slate-300" size={12} />
                                                <span className="font-semibold text-slate-600">
                                                    {Math.round(Number(log.newProgress ?? 0))}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
