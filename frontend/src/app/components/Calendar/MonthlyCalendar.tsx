"use client";

import type { CalendarEvent } from "@/app/utils/calendar";
import { getEventAppearance, groupEventsByDay, stripTime } from "@/app/utils/calendar";

interface MonthlyCalendarProps {
    currentMonth: Date;
    events: CalendarEvent[];
    selectedDate: Date | null;
    onPrev: () => void;
    onNext: () => void;
    onSelectDate: (date: Date) => void;
}

export default function MonthlyCalendar({
    currentMonth,
    events,
    selectedDate,
    onPrev,
    onNext,
    onSelectDate,
}: MonthlyCalendarProps) {
    // Generate days for the grid (including padding for previous/next months)
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

    const daysInGrid: Date[] = [];
    // Previous month padding
    for (let i = 0; i < startingDayOfWeek; i++) {
        daysInGrid.push(new Date(year, month, -startingDayOfWeek + 1 + i));
    }
    // Current month days
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        daysInGrid.push(new Date(year, month, i));
    }
    // Next month padding to fill 6 rows (42 days)
    const remainingSlots = 42 - daysInGrid.length;
    for (let i = 1; i <= remainingSlots; i++) {
        daysInGrid.push(new Date(year, month + 1, i));
    }

    const eventMap = groupEventsByDay(events);

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800">
                    {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
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

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {weekDays.map((day) => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-fr h-full">
                {daysInGrid.map((day, index) => {
                    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                    const list = eventMap.get(key) ?? [];

                    const isCurrentMonth = day.getMonth() === month;
                    const isToday = stripTime(day).getTime() === stripTime(new Date()).getTime();
                    const isSelected = selectedDate && stripTime(selectedDate).getTime() === stripTime(day).getTime();

                    return (
                        <div
                            key={`${key}-${index}`}
                            onClick={() => onSelectDate(day)}
                            className={`min-h-[120px] border-b border-r border-slate-100 p-1 transition cursor-pointer
                                ${!isCurrentMonth ? "bg-slate-50/50 text-slate-400" : "bg-white text-slate-700"}
                                ${isSelected ? "bg-blue-50/50" : "hover:bg-slate-50"}
                            `}
                        >
                            <div className="flex justify-center mb-1">
                                <span className={`
                                    text-xs font-medium w-7 h-7 flex items-center justify-center rounded-full
                                    ${isToday
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-slate-500"}
                                `}>
                                    {day.getDate()}
                                </span>
                            </div>

                            <div className="space-y-1 px-1">
                                {list.slice(0, 4).map((ev) => {
                                    const appearance = getEventAppearance(ev.type);
                                    // Google Calendar style: solid colored blocks
                                    const blockClass = ev.type === "due"
                                        ? "bg-amber-100 text-amber-800 border-l-2 border-amber-500"
                                        : "bg-emerald-100 text-emerald-800 border-l-2 border-emerald-500";

                                    const title = ev.subtaskTitle ? `${ev.taskTitle} · ${ev.subtaskTitle}` : ev.taskTitle;

                                    return (
                                        <div
                                            key={ev.id}
                                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm truncate ${blockClass}`}
                                            title={title}
                                        >
                                            {title}
                                        </div>
                                    );
                                })}
                                {list.length > 4 && (
                                    <div className="text-[10px] text-slate-500 font-medium pl-1 hover:text-slate-700">
                                        {list.length - 4} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
