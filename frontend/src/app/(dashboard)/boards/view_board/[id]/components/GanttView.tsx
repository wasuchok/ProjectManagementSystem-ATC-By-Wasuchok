import { FiChevronRight, FiX } from "react-icons/fi";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type GanttItem = {
    id: string;
    taskId: string;
    taskTitle: string;
    subtaskId: string;
    subtaskTitle: string;
    owner: string;
    progress: number;
    start: Date;
    plannedEnd: Date;
    actualEnd: Date;
    displayEnd: Date;
    durationLabel: string;
    statusLabel?: string | null;
    statusColor?: string | null;
    isLate: boolean;
    isEarly: boolean;
    updates: Array<{ timestamp: Date; progress: number | null }>;
    completedDate?: Date | null;
    dueDate?: Date | null;
};

type GanttGroup = {
    taskId: string;
    taskTitle: string;
    items: GanttItem[];
};

interface GanttViewProps {
    ganttItems: GanttItem[];
    ganttRange: { start: Date; end: Date } | null;
    ganttColumns: { key: string; date: Date; label: string }[];
    ganttScale: "day" | "week" | "month";
    setGanttScale: (scale: "day" | "week" | "month") => void;
    ganttScaleOptions: { value: string; label: string }[];
    ganttScaleLabels: { startLabel: string; midLabel: string; endLabel: string } | null;
    ganttStatusLegend: { label: string; color: string }[];
    ganttGroups: GanttGroup[];
    t: (key: string) => string;
    dateFormatter: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
}

const getTaskStatus = (item: GanttItem) => {
    const stripTime = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const now = stripTime(new Date());
    const isCompleted = item.progress === 100;
    const hasDueDate = !!item.dueDate;
    const dueDate = item.dueDate ? stripTime(new Date(item.dueDate)) : null;
    const completedDate = item.completedDate ? stripTime(new Date(item.completedDate)) : null;

    const baseLabel = item.statusLabel || "Unknown";
    const baseColor = item.statusColor || "bg-blue-500";
    const getStyle = (color: string) =>
        color.startsWith("#") || color.startsWith("rgb") ? { backgroundColor: color } : undefined;

    if (isCompleted) {
        if (hasDueDate && dueDate && completedDate) {
            if (completedDate < dueDate) {
                return {
                    label: baseLabel,
                    color: "bg-emerald-500",
                    textColor: "text-white",
                    ring: "ring-emerald-200",
                    isCustom: false,
                };
            }
            if (completedDate > dueDate) {
                return {
                    label: baseLabel,
                    color: "bg-orange-500",
                    textColor: "text-white",
                    ring: "ring-orange-200",
                    isCustom: false,
                };
            }
        }
        return {
            label: baseLabel,
            color: baseColor,
            style: getStyle(baseColor),
            textColor: "text-white",
            ring: "ring-blue-200",
            isCustom: true,
        };
    }

    if (hasDueDate && dueDate && now > dueDate) {
        return {
            label: baseLabel,
            color: "bg-rose-500",
            textColor: "text-white",
            ring: "ring-rose-200",
            isCustom: false,
        };
    }

    return {
        label: baseLabel,
        color: baseColor,
        style: getStyle(baseColor),
        textColor: "text-white",
        ring: "ring-slate-200",
        isCustom: true,
    };
};

export default function GanttView({
    ganttGroups,
    ganttRange,
    ganttColumns,
    ganttScale,
    setGanttScale,
    ganttScaleOptions,
    ganttScaleLabels,
    t,
    dateFormatter,
}: GanttViewProps) {
    const [selectedItem, setSelectedItem] = useState<GanttItem | null>(null);
    const [panelPosition, setPanelPosition] = useState({ x: 24, y: 64 });
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
        if (typeof window === "undefined") return;
        const handlePointerMove = (event: PointerEvent) => {
            if (!dragOffset) return;
            const panelRect = panelRef.current?.getBoundingClientRect();
            const maxX = window.innerWidth - (panelRect?.width ?? 320) - 8;
            const maxY = window.innerHeight - (panelRect?.height ?? 200) - 8;
            setPanelPosition({
                x: clamp(event.clientX - dragOffset.x, 8, maxX > 8 ? maxX : 8),
                y: clamp(event.clientY - dragOffset.y, 8, maxY > 8 ? maxY : 8),
            });
        };
        const handlePointerUp = () => setDragOffset(null);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [dragOffset]);

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        const panelRect = panelRef.current?.getBoundingClientRect();
        if (!panelRect) return;
        if ((event.target as HTMLElement).closest("button")) return;
        setDragOffset({
            x: event.clientX - panelRect.left,
            y: event.clientY - panelRect.top,
        });
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    if (ganttGroups.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                {t("project.gantt_no_data")}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center rounded-lg bg-slate-100 p-1">
                        {ganttScaleOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setGanttScale(opt.value as any)}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                                    ganttScale === opt.value
                                        ? "bg-white text-slate-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {ganttScaleLabels && (
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <span className="hidden sm:inline">{ganttScaleLabels.startLabel}</span>
                            <FiChevronRight className="text-slate-300" />
                            <span className="hidden sm:inline">{ganttScaleLabels.endLabel}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative -mx-6 -mb-6 overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[1200px]">
                        <div className="grid grid-cols-[280px_1fr] border-b border-slate-200 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <div className="px-4 py-3">{t("project.gantt_task_name")}</div>
                            <div className="grid" style={{ gridTemplateColumns: `repeat(${ganttColumns.length}, minmax(0, 1fr))` }}>
                                {ganttColumns.map((column, index) => (
                                    <div
                                        key={column.key}
                                        className={`border-l border-slate-100 px-2 py-3 text-center ${
                                            index === ganttColumns.length - 1 ? "border-r" : ""
                                        }`}
                                    >
                                        {ganttScale === "day"
                                            ? dateFormatter(column.date, { day: "numeric" })
                                            : dateFormatter(column.date, { month: "short", year: "numeric" })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="divide-y divide-slate-200">
                            {ganttGroups.map((group) => (
                                <div key={group.taskId}>
                                    <div className="grid grid-cols-[280px_1fr] bg-slate-50/60 text-sm font-semibold text-slate-700">
                                        <div className="px-4 py-3">{group.taskTitle}</div>
                                        <div className="grid" style={{ gridTemplateColumns: `repeat(${ganttColumns.length}, minmax(0, 1fr))` }}>
                                            {ganttColumns.map((column, columnIndex) => {
                                                const shade = columnIndex % 2 === 0 ? "rgba(248,250,252,0.5)" : "rgba(248,250,252,0.8)";
                                                return (
                                                    <div
                                                        key={`${group.taskId}-${column.key}`}
                                                        className={`border-l border-slate-100 ${
                                                            columnIndex === ganttColumns.length - 1 ? "border-r" : ""
                                                        }`}
                                                        style={{ backgroundColor: shade }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {group.items.map((item) => {
                                        if (!ganttRange) return null;
                                        const totalMs = ganttRange.end.getTime() - ganttRange.start.getTime();
                                        const startMs = item.start.getTime() - ganttRange.start.getTime();
                                        const plannedEndMs = item.plannedEnd.getTime() - ganttRange.start.getTime();
                                        const actualStartMs = item.start.getTime() - ganttRange.start.getTime();
                                        const actualEndMs = item.actualEnd.getTime() - ganttRange.start.getTime();

                                        const planStartPercent = (startMs / totalMs) * 100;
                                        const planEndPercent = (plannedEndMs / totalMs) * 100;
                                        const actualStartPercent = (actualStartMs / totalMs) * 100;
                                        const actualEndPercent = (actualEndMs / totalMs) * 100;

                                        const planLeft = Math.max(0, Math.min(100, planStartPercent));
                                        const planWidth = Math.max(0, Math.min(100 - planLeft, planEndPercent - planStartPercent));

                                        const actualLeft = Math.max(0, Math.min(100, actualStartPercent));
                                        const actualWidth = Math.max(0, Math.min(100 - actualLeft, actualEndPercent - actualStartPercent));

                                        const statusInfo = getTaskStatus(item);

                                        return (
                                            <div key={item.id} className="grid grid-cols-[280px_1fr] text-sm text-slate-600">
                                                <div className="flex items-center gap-2 px-4 py-2">
                                                    <span className={`h-2.5 w-2.5 rounded-full ${statusInfo.color}`} />
                                                    <div className="flex flex-col">
                                                        <span className="truncate font-medium text-slate-700">{item.subtaskTitle || item.taskTitle}</span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {dateFormatter(item.start)} - {dateFormatter(item.displayEnd)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div
                                                    className="relative grid items-center py-2"
                                                    style={{ gridTemplateColumns: `repeat(${ganttColumns.length}, minmax(0, 1fr))` }}
                                                >
                                                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${ganttColumns.length}, minmax(0, 1fr))` }}>
                                                        {ganttColumns.map((column, columnIndex) => {
                                                            const shade = columnIndex % 2 === 0 ? "rgba(248,250,252,0.5)" : "rgba(248,250,252,0.8)";
                                                            return (
                                                                <div
                                                                    key={`${item.id}-${column.key}-bg`}
                                                                    className={`border-l border-slate-100 ${
                                                                        columnIndex === ganttColumns.length - 1 ? "border-r" : ""
                                                                    }`}
                                                                    style={{ backgroundColor: shade }}
                                                                />
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-200/80" />

                                                    <div
                                                        className="absolute top-1/2 -translate-y-1/2 rounded-full"
                                                        style={{
                                                            left: `${planLeft}%`,
                                                            width: `${planWidth}%`,
                                                            minWidth: "48px",
                                                            height: "10px",
                                                            backgroundColor: "rgba(148,163,184,0.25)",
                                                            border: "1px dashed rgba(148,163,184,0.6)",
                                                        }}
                                                        aria-hidden="true"
                                                    />

                                                    <div
                                                        className="absolute top-1/2 -translate-y-1/2 group z-10 cursor-pointer"
                                                        style={{
                                                            left: `${actualLeft}%`,
                                                            width: `${actualWidth}%`,
                                                            minWidth: "32px",
                                                        }}
                                                        role="button"
                                                        onClick={() => setSelectedItem(item)}
                                                    >
                                                        <div
                                                            className={`relative flex h-7 w-full items-center overflow-hidden rounded-full shadow-sm transition-all duration-200 hover:brightness-105 hover:shadow-md ${
                                                                item.isLate ? "gantt-late-stripes" : ""
                                                            }`}
                                                            style={{
                                                                ...statusInfo.style,
                                                                boxShadow: `0 2px 8px -2px ${statusInfo.isCustom ? statusInfo.color : "#cbd5e1"}66`,
                                                            }}
                                                        >
                                                            <div className={`absolute inset-0 ${!statusInfo.isCustom ? statusInfo.color : ""}`} />
                                                            <div className="relative flex w-full items-center justify-between px-2.5 z-10">
                                                                <span className="truncate text-[11px] font-semibold text-white drop-shadow-sm">
                                                                    {item.subtaskTitle || item.taskTitle}
                                                                </span>
                                                                <span className="ml-2 rounded-full bg-white/20 px-1.5 py-[1px] text-[9px] font-bold text-white backdrop-blur-sm">
                                                                    {item.progress}%
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 flex items-center z-20">
                                                            <div
                                                                className={`flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold shadow-sm ring-1 ring-slate-100 transition-transform hover:scale-105 ${
                                                                    statusInfo.textColor === "text-white" ? "text-slate-700" : statusInfo.textColor
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`h-1.5 w-1.5 rounded-full ring-1 ring-white ${
                                                                        !statusInfo.isCustom ? statusInfo.color : ""
                                                                    }`}
                                                                    style={statusInfo.isCustom ? { backgroundColor: statusInfo.color } : undefined}
                                                                />
                                                                <span className="whitespace-nowrap">{statusInfo.label}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {item.updates.map((marker) => {
                                                        const mLeft = ((marker.timestamp.getTime() - ganttRange.start.getTime()) / totalMs) * 100;
                                                        const isVisible =
                                                            mLeft >= actualLeft - 0.5 && mLeft <= actualLeft + actualWidth + 0.5;

                                                        return (
                                                            <div
                                                                key={`${item.id}-marker-${marker.timestamp.getTime()}`}
                                                                className="absolute z-10 -translate-x-1/2"
                                                                style={{
                                                                    left: `${mLeft}%`,
                                                                    top: "50%",
                                                                }}
                                                            >
                                                                <div
                                                                    className={`h-3 w-3 rounded-full border-2 border-white ${
                                                                        isVisible ? "bg-white shadow-xl" : "bg-slate-200/80"
                                                                    }`}
                                                                    title={`${marker.progress != null ? `${marker.progress}%` : ""} ${dateFormatter(
                                                                        marker.timestamp
                                                                    )}`.trim()}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {selectedItem && (
                <div
                    ref={panelRef}
                    className="fixed z-50 w-[320px] rounded-2xl border border-slate-200 bg-white/95 px-0 py-0 shadow-[0_20px_40px_rgba(15,23,42,0.25)] backdrop-blur-md"
                    style={{
                        left: panelPosition.x,
                        top: panelPosition.y,
                    }}
                >
                    <div
                        className="flex cursor-move items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 px-4 py-3 text-xs uppercase tracking-[0.3em] text-slate-500"
                        onPointerDown={handlePointerDown}
                    >
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                                {t("project.gantt_detail_title")}
                            </p>
                            <h3 className="text-lg font-semibold text-slate-900">
                                {selectedItem.subtaskTitle || selectedItem.taskTitle}
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setSelectedItem(null);
                            }}
                            className="text-slate-400 hover:text-slate-600"
                            aria-label="Close details"
                        >
                            <FiX className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="px-4 py-3 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                            {t("project.gantt_detail_owner")}: {selectedItem.owner}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            {t("project.gantt_detail_progress")}: {selectedItem.progress}%
                        </div>
                        <div>
                            {t("project.gantt_detail_dates")} {dateFormatter(selectedItem.start)} - {dateFormatter(selectedItem.displayEnd)}
                        </div>
                    </div>
                    <div className="border-t border-slate-100 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                            {t("project.gantt_detail_updates")}
                        </p>
                        <div className="mt-2 flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
                            {selectedItem.updates.map((marker, markerIndex) => (
                                <div
                                    key={`detail-update-${markerIndex}`}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600"
                                >
                                    <div className="font-semibold text-slate-800">
                                        {marker.progress != null ? `${marker.progress}%` : t("project.gantt_detail_unknown_progress")}
                                    </div>
                                    <div className="text-[9px] text-slate-500">
                                        {dateFormatter(marker.timestamp)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
