"use client";

import type { CalendarEvent } from "@/app/utils/calendar";
import { stripTime } from "@/app/utils/calendar";

interface WeekCalendarProps {
    anchorDate: Date;
    selectedDate: Date | null;
    events: CalendarEvent[];
    onPrev: () => void;
    onNext: () => void;
    onSelectDate: (date: Date) => void;
}

const startOfWeekSunday = (date: Date) => {
    const d = new Date(stripTime(date));
    const day = d.getDay(); // 0..6, Sunday=0
    d.setDate(d.getDate() - day);
    return d;
};

export default function WeekCalendar({
    anchorDate,
    selectedDate,
    events,
    onPrev,
    onNext,
    onSelectDate,
}: WeekCalendarProps) {
    const start = startOfWeekSunday(anchorDate);
    const days: Date[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {/* Header controls */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800">
                    {start.toLocaleDateString("en-US", { month: "short" })} {start.getDate()} - {new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000).getDate()}
                </h2>
                <div className="flex items-center gap-1">
                    <button onClick={onPrev} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={onNext} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>

            {/* Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {days.map((day) => {
                    const isToday = stripTime(day).getTime() === stripTime(new Date()).getTime();
                    return (
                        <div key={day.toString()} className="py-2 flex flex-col items-center border-r border-slate-200 last:border-r-0">
                            <span className={`text-xs font-semibold uppercase ${isToday ? "text-blue-600" : "text-slate-500"}`}>
                                {day.toLocaleDateString("en-US", { weekday: "short" })}
                            </span>
                            <span className={`
                                mt-1 text-xl font-medium w-8 h-8 flex items-center justify-center rounded-full
                                ${isToday ? "bg-blue-600 text-white" : "text-slate-700"}
                             `}>
                                {day.getDate()}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Week Grid (Columns) */}
            <div className="grid grid-cols-7 h-full overflow-y-auto">
                {days.map((day) => {
                    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                    const list = events
                        .filter((ev) => stripTime(ev.date).getTime() === stripTime(day).getTime())
                        .sort((a, b) => (a.type === b.type ? 0 : a.type === "due" ? -1 : 1));
                    const isSelected = selectedDate && stripTime(selectedDate).getTime() === stripTime(day).getTime();

                    return (
                        <div
                            key={key}
                            onClick={() => onSelectDate(day)}
                            className={`
                                flex flex-col border-r border-slate-100 last:border-r-0 min-h-[400px] p-2 transition cursor-pointer
                                ${isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/30"}
                            `}
                        >
                            <div className="space-y-2">
                                {list.map((ev) => {
                                    const title = ev.subtaskTitle ? `${ev.taskTitle} · ${ev.subtaskTitle}` : ev.taskTitle;
                                    const blockClass = ev.type === "due"
                                        ? "bg-amber-100 text-amber-800 border-l-2 border-amber-500"
                                        : "bg-emerald-100 text-emerald-800 border-l-2 border-emerald-500";

                                    return (
                                        <div
                                            key={ev.id}
                                            className={`p-2 rounded text-xs font-medium shadow-sm ${blockClass}`}
                                            title={title}
                                        >
                                            <div className="truncate font-semibold">{title}</div>
                                            <div className="text-[10px] opacity-75 mt-0.5 truncate">{ev.projectName}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

