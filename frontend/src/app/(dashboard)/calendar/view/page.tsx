"use client";

import DayCalendar from "@/app/components/Calendar/DayCalendar";
import MonthlyCalendar from "@/app/components/Calendar/MonthlyCalendar";
import WeekCalendar from "@/app/components/Calendar/WeekCalendar";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { buildICS, CalendarEvent, countByTypeForDay, formatICSDate, formatMonthLabel, getDaysInMonth, groupEventsByDay, stripTime } from "@/app/utils/calendar";
import { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";


const Page = () => {
    const { t } = useLanguage();
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [search, setSearch] = useState("");
    const [enableDue, setEnableDue] = useState(true);
    const [enableCompleted, setEnableCompleted] = useState(true);
    const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

    const monthLabel = useMemo(() => formatMonthLabel(currentMonth), [currentMonth]);

    const loadEvents = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const params = {
                page: 1,
                limit: 50,
                status: "",
                priority: "",
                search: "",
                created_by: user.id,
            };
            const resp = await apiPrivate.get("/project/views", { params });
            const projects: any[] = resp?.data?.data?.result ?? [];
            const projectIds = projects
                .map((p) => Number(p.id ?? p.project_id ?? 0))
                .filter((id) => id > 0);

            const taskResponses = await Promise.allSettled(
                projectIds.map((projectId) => apiPrivate.get(`/project/task/project/${projectId}`))
            );

            const allTasks = taskResponses
                .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
                .flatMap((r) => (Array.isArray(r.value?.data?.data) ? r.value.data.data : []));

            const newEvents: CalendarEvent[] = [];
            allTasks.forEach((task: any) => {
                const projectName = task.tb_project_projects?.name ?? `โปรเจกต์ ${task.project_id ?? ""}`;
                const taskTitle = task.title ?? "งานไม่มีชื่อ";
                const subtasks: any[] = Array.isArray(task.tb_project_sub_tasks) ? task.tb_project_sub_tasks : [];

                subtasks.forEach((sub) => {
                    const subTitle = sub.title ?? null;
                    const dueRaw = sub.due_date ?? sub.dueDate ?? null;
                    const completedRaw = sub.completed_date ?? sub.completedDate ?? null;

                    if (dueRaw) {
                        const due = new Date(dueRaw);
                        if (!Number.isNaN(due.getTime())) {
                            const date = stripTime(due);
                            newEvents.push({
                                id: `due-${task.id}-${sub.id}-${formatICSDate(date)}`,
                                date,
                                type: "due",
                                projectName,
                                taskTitle,
                                subtaskTitle: subTitle,
                            });
                        }
                    }

                    if (completedRaw) {
                        const done = new Date(completedRaw);
                        if (!Number.isNaN(done.getTime())) {
                            const date = stripTime(done);
                            newEvents.push({
                                id: `completed-${task.id}-${sub.id}-${formatICSDate(date)}`,
                                date,
                                type: "completed",
                                projectName,
                                taskTitle,
                                subtaskTitle: subTitle,
                            });
                        }
                    }
                });
            });

            setEvents(newEvents);
        } catch (e) {
            console.error("Failed to load calendar events", e);
            setEvents([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        loadEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const goPrevMonth = () => {
        const d = new Date(currentMonth);
        d.setMonth(d.getMonth() - 1);
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
        setSelectedDate(null);
    };
    const goNextMonth = () => {
        const d = new Date(currentMonth);
        d.setMonth(d.getMonth() + 1);
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
        setSelectedDate(null);
    };

    const handleExportICS = () => {
        const content = buildICS(events);
        const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tasks-calendar.ics";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const projectOptions = useMemo(() => {
        const set = new Set<string>();
        events.forEach((ev) => set.add(ev.projectName));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [events]);

    const filteredEvents = useMemo(() => {
        const q = search.trim().toLowerCase();
        return events.filter((ev) => {
            if (!enableDue && ev.type === "due") return false;
            if (!enableCompleted && ev.type === "completed") return false;
            if (selectedProjects.length > 0 && !selectedProjects.includes(ev.projectName)) return false;
            if (!q) return true;
            const base = `${ev.taskTitle} ${ev.subtaskTitle ?? ""} ${ev.projectName}`.toLowerCase();
            return base.includes(q);
        });
    }, [events, search, enableDue, enableCompleted, selectedProjects]);

    const miniMap = useMemo(() => groupEventsByDay(filteredEvents), [filteredEvents]);

    const today = () => {
        const d = new Date();
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
        setSelectedDate(stripTime(d));
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] gap-6">
            <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur-sm shrink-0">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <FaCalendarAlt className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                ปฏิทินงาน
                            </p>
                            <h1 className="text-2xl font-semibold text-slate-900">
                                ดูกำหนดส่งและวันเสร็จสิ้นตามวัน
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setViewMode("day");
                                    if (!selectedDate) {
                                        const d = new Date();
                                        setSelectedDate(stripTime(d));
                                    }
                                }}
                                className={`rounded px-3 py-1.5 text-sm font-semibold transition ${viewMode === "day" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
                            >
                                Day
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setViewMode("week");
                                    if (!selectedDate) {
                                        const d = new Date();
                                        setSelectedDate(stripTime(d));
                                    }
                                }}
                                className={`rounded px-3 py-1.5 text-sm font-semibold transition ${viewMode === "week" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
                            >
                                Week
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("month")}
                                className={`rounded px-3 py-1.5 text-sm font-semibold transition ${viewMode === "month" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
                            >
                                Month
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={today}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={handleExportICS}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                            Export ICS
                        </button>
                    </div>
                </div>
            </section>

            <section className="flex-1 min-h-0 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                {/* Sidebar */}
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    {/* Mini Calendar */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800">
                                {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                            </span>
                            <div className="flex gap-1">
                                <button onClick={goPrevMonth} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button onClick={goNextMonth} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 mb-2">
                            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (<span key={`${d}-${i}`}>{d}</span>))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth(currentMonth).map((day) => {
                                const isSelected = selectedDate && stripTime(selectedDate).getTime() === stripTime(day).getTime();
                                const isToday = stripTime(day).getTime() === stripTime(new Date()).getTime();
                                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                                const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                                const list = miniMap.get(key) ?? [];
                                const { due, completed } = countByTypeForDay(list);

                                return (
                                    <div key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`} className="flex flex-col items-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedDate(day);
                                            }}
                                            className={`
                                                h-7 w-7 rounded-full text-[11px] flex items-center justify-center transition
                                                ${!isCurrentMonth ? "opacity-30" : ""}
                                                ${isSelected
                                                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                                                    : isToday
                                                        ? "bg-blue-50 text-blue-600 font-bold ring-1 ring-blue-200"
                                                        : "text-slate-700 hover:bg-slate-100"}
                                            `}
                                        >
                                            {day.getDate()}
                                        </button>
                                        <div className="h-2 mt-0.5 flex items-center justify-center gap-0.5">
                                            {due > 0 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                            {completed > 0 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search event..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                            />
                            <svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">My Calendars</h3>
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer group">
                                <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${enableDue ? "bg-amber-500 border-amber-500" : "border-slate-300 bg-white"}`}>
                                    {enableDue && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <input type="checkbox" className="hidden" checked={enableDue} onChange={(e) => setEnableDue(e.target.checked)} />
                                <span className="group-hover:text-slate-900">Due Tasks</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer group">
                                <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${enableCompleted ? "bg-emerald-500 border-emerald-500" : "border-slate-300 bg-white"}`}>
                                    {enableCompleted && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <input type="checkbox" className="hidden" checked={enableCompleted} onChange={(e) => setEnableCompleted(e.target.checked)} />
                                <span className="group-hover:text-slate-900">Completed Tasks</span>
                            </label>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Filter by Project</h3>
                                {selectedProjects.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProjects([])}
                                        className="text-[11px] text-blue-700 hover:underline"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="max-h-40 overflow-auto space-y-1">
                                {projectOptions.map((name) => {
                                    const checked = selectedProjects.includes(name);
                                    return (
                                        <label key={name} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    const on = e.target.checked;
                                                    setSelectedProjects((prev) =>
                                                        on ? [...prev, name] : prev.filter((n) => n !== name)
                                                    );
                                                }}
                                            />
                                            <span className="truncate">{name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Calendar Area */}
                <div className="flex-1 min-h-0 min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mr-2"></div>
                            Loading calendar...
                        </div>
                    ) : (
                        <>
                            {viewMode === "month" && (
                                <MonthlyCalendar
                                    currentMonth={currentMonth}
                                    events={filteredEvents}
                                    selectedDate={selectedDate}
                                    onPrev={goPrevMonth}
                                    onNext={goNextMonth}
                                    onSelectDate={setSelectedDate}
                                />
                            )}
                            {viewMode === "week" && (
                                <WeekCalendar
                                    anchorDate={selectedDate ?? new Date()}
                                    selectedDate={selectedDate}
                                    events={filteredEvents}
                                    onPrev={() => {
                                        const d = new Date(selectedDate ?? new Date());
                                        d.setDate(d.getDate() - 7);
                                        setSelectedDate(d);
                                    }}
                                    onNext={() => {
                                        const d = new Date(selectedDate ?? new Date());
                                        d.setDate(d.getDate() + 7);
                                        setSelectedDate(d);
                                    }}
                                    onSelectDate={setSelectedDate}
                                />
                            )}
                            {viewMode === "day" && (
                                <DayCalendar
                                    date={selectedDate ?? new Date()}
                                    events={filteredEvents}
                                    onPrev={() => {
                                        const d = new Date(selectedDate ?? new Date());
                                        d.setDate(d.getDate() - 1);
                                        setSelectedDate(d);
                                    }}
                                    onNext={() => {
                                        const d = new Date(selectedDate ?? new Date());
                                        d.setDate(d.getDate() + 1);
                                        setSelectedDate(d);
                                    }}
                                />
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Page;
