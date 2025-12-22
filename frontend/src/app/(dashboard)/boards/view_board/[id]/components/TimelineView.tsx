import { FiClock, FiPlay } from "react-icons/fi";

type TimelineEntry = {
    id: string;
    date: Date;
    type: "created" | "updated" | "completed" | "comment" | "subtask";
    title: string;
    description?: string;
    user?: string;
    meta?: any;
};

interface TimelineGroup {
    key: string;
    label: string;
    items: TimelineEntry[];
}

interface TimelineViewProps {
    timelineGroups: TimelineGroup[];
    isLoadingTaskLogs: boolean;
    taskLogsError: string | null;
    t: (key: string) => string;
    formatDateTime: (date: string) => string;
    describeTimelineEvent: (entry: TimelineEntry) => string;
}

export default function TimelineView({
    timelineGroups,
    isLoadingTaskLogs,
    taskLogsError,
    t,
    formatDateTime,
    describeTimelineEvent,
}: TimelineViewProps) {
    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-slate-700">{t('project.timeline_heading')}</h2>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.4)]">
                {isLoadingTaskLogs ? (
                    <p className="text-sm text-slate-500">{t('project.timeline_loading')}</p>
                ) : taskLogsError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-600">
                        {taskLogsError}
                    </div>
                ) : timelineGroups.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        {t('project.timeline_empty')}
                    </div>
                ) : (
                    <div className="relative space-y-8 pl-4 before:absolute before:bottom-0 before:left-[19px] before:top-2 before:w-0.5 before:bg-slate-200">
                        {timelineGroups.map((group) => (
                            <div key={group.key} className="relative">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow-sm">
                                        <FiClock size={16} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800">
                                        {group.label}
                                    </h3>
                                </div>
                                <div className="ml-10 space-y-4">
                                    {group.items.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_-12px_rgba(15,23,42,0.1)] transition-all hover:border-primary-200 hover:shadow-[0_8px_24px_-12px_rgba(59,130,246,0.2)]"
                                        >
                                            <div className="absolute -left-[25px] top-5 h-2 w-2 rounded-full border-2 border-white bg-slate-300 ring-4 ring-slate-50 transition-colors group-hover:bg-primary-400 group-hover:ring-primary-50" />
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold text-slate-700">
                                                        {entry.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {describeTimelineEvent(entry)}
                                                    </p>
                                                    {entry.user && (
                                                        <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                                                            <span className="font-medium text-slate-500">
                                                                {t('project.timeline_by')} {entry.user}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                                    <FiPlay size={10} className="text-slate-300" />
                                                    {formatDateTime(entry.date.toISOString()).split(" ")[1]}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
