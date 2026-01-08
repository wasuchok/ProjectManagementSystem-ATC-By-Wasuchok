"use client";

import type { CalendarEvent } from "@/app/utils/calendar";
import { stripTime } from "@/app/utils/calendar";

interface DayCalendarProps {
    date: Date;
    events: CalendarEvent[];
    onPrev: () => void;
    onNext: () => void;
}

export default function DayCalendar({ date, events, onPrev, onNext }: DayCalendarProps) {
    const dayEvents = events
        .filter((ev) => stripTime(ev.date).getTime() === stripTime(date).getTime())
        .sort((a, b) => (a.type === b.type ? 0 : a.type === "due" ? -1 : 1));
    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-slate-800">{date.getDate()}</span>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                            {date.toLocaleDateString("en-US", { weekday: "long" })}
                        </span>
                        <span className="text-xs text-slate-500">
                            {date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onPrev} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={onNext} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>

            {/* Content - Agenda Style */}
            <div className="flex-1 overflow-y-auto p-4 bg-white">
                {dayEvents.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p>No events scheduled for today</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-w-3xl mx-auto">
                        {dayEvents.map((ev) => {
                            const blockClass = ev.type === "due"
                                ? "border-amber-500 bg-amber-50"
                                : "border-emerald-500 bg-emerald-50";
                            const textClass = ev.type === "due" ? "text-amber-900" : "text-emerald-900";
                            const label = ev.type === "due" ? "Due Date" : "Completed";

                            return (
                                <div key={ev.id} className={`flex rounded-lg border-l-4 p-4 shadow-sm hover:shadow-md transition ${blockClass}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] uppercase font-bold tracking-wider opacity-70 ${textClass}`}>
                                                {label}
                                            </span>
                                            <span className="text-[10px] text-slate-400">•</span>
                                            <span className="text-[10px] font-medium text-slate-500">
                                                {ev.projectName}
                                            </span>
                                        </div>
                                        <h4 className={`font-semibold text-lg ${textClass}`}>
                                            {ev.taskTitle}
                                        </h4>
                                        {ev.subtaskTitle && (
                                            <p className={`text-sm mt-1 opacity-80 ${textClass}`}>
                                                ↳ {ev.subtaskTitle}
                                            </p>
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
