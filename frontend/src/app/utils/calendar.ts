export type CalendarEventType = "due" | "completed";

export interface CalendarEvent {
    id: string;
    date: Date;
    type: CalendarEventType;
    projectName: string;
    taskTitle: string;
    subtaskTitle?: string | null;
}

export const stripTime = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const formatMonthLabel = (date: Date) =>
    new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(date);

export const formatDateLabel = (date: Date) =>
    new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(date);

export const getDaysInMonth = (monthStart: Date) => {
    const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
    const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const days: Date[] = [];
    for (let d = start.getDate(); d <= end.getDate(); d++) {
        days.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
    }
    return days;
};

export const groupEventsByDay = (events: CalendarEvent[]) => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
        const key = `${ev.date.getFullYear()}-${ev.date.getMonth()}-${ev.date.getDate()}`;
        const list = map.get(key) ?? [];
        list.push(ev);
        map.set(key, list);
    });
    return map;
};

export const countByTypeForDay = (list: CalendarEvent[]) => {
    let due = 0;
    let completed = 0;
    list.forEach((e) => {
        if (e.type === "due") due += 1;
        else if (e.type === "completed") completed += 1;
    });
    return { due, completed };
};

export const getEventAppearance = (type: CalendarEventType) => {
    if (type === "due") {
        return {
            dotClass: "bg-amber-500",
            chipClass: "border-amber-200 bg-amber-50 text-amber-700",
            label: "กำหนดส่ง",
        };
    }
    return {
        dotClass: "bg-emerald-500",
        chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
        label: "เสร็จสิ้น",
    };
};

export const formatICSDate = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}${m}${d}`;
};

export const buildICS = (events: CalendarEvent[]) => {
    const lines: string[] = [];
    lines.push("BEGIN:VCALENDAR");
    lines.push("VERSION:2.0");
    lines.push("PRODID:-//Project Management System//Calendar//TH");
    const now = new Date();
    const dtstamp = `${now.getUTCFullYear()}${(now.getUTCMonth() + 1)
        .toString()
        .padStart(2, "0")}${now.getUTCDate().toString().padStart(2, "0")}T${now
            .getUTCHours()
            .toString()
            .padStart(2, "0")}${now.getUTCMinutes().toString().padStart(2, "0")}${now
                .getUTCSeconds()
                .toString()
                .padStart(2, "0")}Z`;

    events.forEach((ev, idx) => {
        const DTSTART = `DTSTART;VALUE=DATE:${formatICSDate(ev.date)}`;
        const uid = `${ev.id}-${idx}@pms.local`;
        const summary =
            ev.type === "due"
                ? `กำหนดส่ง: ${ev.taskTitle}${ev.subtaskTitle ? ` - ${ev.subtaskTitle}` : ""}`
                : `เสร็จสิ้น: ${ev.taskTitle}${ev.subtaskTitle ? ` - ${ev.subtaskTitle}` : ""}`;
        const description = `${ev.projectName}`;
        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${dtstamp}`);
        lines.push(DTSTART);
        lines.push(`SUMMARY:${summary.replace(/\r?\n/g, " ")}`);
        lines.push(`DESCRIPTION:${description.replace(/\r?\n/g, " ")}`);
        lines.push("END:VEVENT");
    });

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
};
