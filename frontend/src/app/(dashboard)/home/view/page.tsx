"use client"

import { useEffect, useMemo, useState } from "react";
import { apiPrivate } from "@/app/services/apiPrivate";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";

const STATUS_PRESETS = [
    {
        key: "draft",
        label: "ร่าง",
        description: "เตรียมแผนงานและรวบรวมไอเดีย",
        accent: "from-indigo-400 to-indigo-600",
    },
    {
        key: "started",
        label: "กำลังดำเนินการ",
        description: "ทีมกำลังทำงานและอัปเดตความคืบหน้า",
        accent: "from-blue-400 to-cyan-500",
    },
    {
        key: "completed",
        label: "เสร็จสิ้น",
        description: "พร้อมส่งมอบหรือรอการตรวจสอบสุดท้าย",
        accent: "from-emerald-400 to-emerald-600",
    },
    {
        key: "cancelled",
        label: "ยกเลิก",
        description: "หยุดโปรเจกต์ชั่วคราวหรือเลิกแล้ว",
        accent: "from-rose-400 to-rose-600",
    },
];

const PRIORITY_BADGES: Record<string, { label: string; className: string }> = {
    low: { label: "ระดับต่ำ", className: "border-emerald-100 bg-emerald-50 text-emerald-600" },
    normal: { label: "ปกติ", className: "border-sky-100 bg-sky-50 text-sky-600" },
    high: { label: "ระดับสูง", className: "border-amber-100 bg-amber-50 text-amber-600" },
    urgent: { label: "ด่วนมาก", className: "border-rose-100 bg-rose-50 text-rose-600" },
};

const formatDateString = (value?: string) => {
    if (!value) return null;
    try {
        return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value));
    } catch {
        return null;
    }
};

interface ProjectSummary {
    id: number;
    name: string;
    status: string;
    priority: string;
    progress_percent: number;
}

interface TaskCard {
    id: number;
    title: string;
    projectName: string;
    statusLabel: string;
    statusColor: string;
    progress: number;
    updatedAt: string;
    dueLabel: string | null;
    priority: string;
}

const Page = () => {
    const { user } = useUser();
    const { t } = useLanguage();
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [activeProjectIds, setActiveProjectIds] = useState<number[]>([]);
    const [personalTasks, setPersonalTasks] = useState<TaskCard[]>([]);

    const statusSummary = useMemo(() => {
        const counts = STATUS_PRESETS.reduce<Record<string, number>>((acc, status) => {
            acc[status.key] = 0;
            return acc;
        }, {});

        let totalProgress = 0;

        projects.forEach((project) => {
            const key = (project.status ?? "").toLowerCase();
            if (counts[key] !== undefined) {
                counts[key] += 1;
            } else {
                counts[key] = (counts[key] ?? 0) + 1;
            }
            totalProgress += project.progress_percent ?? 0;
        });

        const total = projects.length;
        const avgProgress = total ? Number((totalProgress / total).toFixed(2)) : 0;

        return { counts, total, avgProgress };
    }, [projects]);

    const fetchProjects = async () => {
        if (!user?.id) return;

        setIsLoadingProjects(true);
        try {
            const params = {
                page: 1,
                limit: 12,
                status: "",
                priority: "",
                search: "",
                created_by: user.id,
            };

            const response = await apiPrivate.get("/project/views", { params });
            const allProjects: any[] = response?.data?.data?.result ?? [];
            const normalized = allProjects
                .map((project) => {
                    const id = Number(project.id ?? project.project_id ?? 0);
                    if (!id) return null;
                    return {
                        id,
                        name: project.name ?? `โปรเจกต์ ${project.id}`,
                        status: (project.status ?? "draft").toLowerCase(),
                        priority: (project.priority ?? "normal").toLowerCase(),
                        progress_percent: Number(project.progress_percent ?? project.progressPercent ?? 0),
                    } as ProjectSummary;
                })
                .filter((project): project is ProjectSummary => Boolean(project));

            setProjects(normalized);
            setActiveProjectIds(normalized.slice(0, 6).map((project) => project.id));
        } catch (error) {
            console.error("Failed to load projects", error);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchProjects();
    }, [user]);

    useEffect(() => {
        if (!user || activeProjectIds.length === 0) {
            setPersonalTasks([]);
            return;
        }

        let isActive = true;
        const loadTasks = async () => {
            setIsLoadingTasks(true);
            try {
                const responses = await Promise.allSettled(
                    activeProjectIds.map((projectId) =>
                        apiPrivate.get(`/project/task/project/${projectId}`),
                    ),
                );

                const fetchedTasks = responses
                    .filter((resp): resp is PromiseFulfilledResult<any> => resp.status === "fulfilled")
                    .flatMap((resp) => (Array.isArray(resp.value?.data?.data) ? resp.value.data.data : []));

                const userId = user.id?.toString();
                const filtered = fetchedTasks
                    .filter((task: any) => String(task.assigned_to ?? task.assignedTo ?? "") === userId)
                    .map((task: any) => {
                        const dueDates = (task.tb_project_sub_tasks ?? [])
                            .map((sub: any) => new Date(sub.due_date ?? sub.dueDate ?? null))
                            .filter((date: Date) => date instanceof Date && !Number.isNaN(date.getTime()));
                        const soonestDue = dueDates.length
                            ? dueDates.reduce((min, current) => (current < min ? current : min))
                            : null;

                        const progress = Math.min(100, Math.max(0, Number(task.progress_percent ?? task.progressPercent ?? 0)));
                        const updatedAt =
                            task.updated_at ??
                            task.updatedAt ??
                            task.created_at ??
                            task.createdAt ??
                            new Date().toISOString();
                        const statusColor = task.tb_project_task_statuses?.color ?? task.status_color ?? "#CBD5F5";

                        return {
                            id: Number(task.id ?? task.task_id ?? 0),
                            title: task.title ?? "งานไม่มีชื่อ",
                            projectName: task.tb_project_projects?.name ?? `โปรเจกต์ ${task.project_id ?? ""}`,
                            statusLabel:
                                task.tb_project_task_statuses?.name ?? task.status_label ?? "ไม่ระบุตำแหน่ง",
                            statusColor,
                            progress,
                            updatedAt,
                            dueLabel: soonestDue ? formatDateString(soonestDue.toISOString()) : null,
                            priority: (task.priority ?? "normal").toLowerCase(),
                        } as TaskCard;
                    })
                    .sort((a, b) => {
                        const dueA = a.dueLabel ? new Date(a.dueLabel).getTime() : Number.POSITIVE_INFINITY;
                        const dueB = b.dueLabel ? new Date(b.dueLabel).getTime() : Number.POSITIVE_INFINITY;
                        return dueA - dueB;
                    })
                    .slice(0, 6);

                if (isActive) {
                    setPersonalTasks(filtered);
                }
            } catch (error) {
                console.error("Failed to load personal tasks", error);
            } finally {
                if (isActive) {
                    setIsLoadingTasks(false);
                }
            }
        };

        loadTasks();
        return () => {
            isActive = false;
        };
    }, [activeProjectIds, user]);

    const heroStats = [
        {
            label: "โปรเจกต์ทั้งหมด",
            value: projects.length,
            hint: `เฉลี่ยความคืบหน้า ${Math.round(statusSummary.avgProgress)}%`,
        },
        {
            label: "งานของฉัน",
            value: personalTasks.length,
            hint: "งานปัจจุบันที่ตกลงรับผิดชอบ",
        },
    ];

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                            {t("project.title")}
                        </p>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            ภาพรวมโปรเจกต์และงานของฉัน
                        </h1>
                        <p className="text-sm text-slate-500">
                            {t("project.projects_overview_subtitle")}
                        </p>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-500 sm:auto-cols-fr md:mt-0 md:grid-flow-col">
                        {heroStats.map((stat) => (
                            <div
                                key={stat.label}
                                className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-800 shadow-inner"
                            >
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                    {stat.label}
                                </p>
                                <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
                                <p className="text-xs text-slate-500">{stat.hint}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                สถานะโปรเจกต์
                            </p>
                            <h2 className="text-xl font-semibold text-slate-900">แผนภาพโดยรวม</h2>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {statusSummary.total} โปรเจกต์
                        </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {STATUS_PRESETS.map((status) => {
                            const count = statusSummary.counts[status.key] ?? 0;
                            const percent = statusSummary.total
                                ? Math.round((count / statusSummary.total) * 100)
                                : 0;
                            return (
                                <div
                                    key={status.key}
                                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                                {status.label}
                                            </p>
                                            <p className="text-2xl font-semibold text-slate-900">{count}</p>
                                        </div>
                                        <span className="text-xs text-slate-500">{percent}% ของทั้งหมด</span>
                                    </div>
                                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${status.accent}`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-slate-400">{status.description}</p>
                                </div>
                            );
                        })}
                    </div>
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">
                        <p>
                            อัปเดตข้อมูลล่าสุด:{" "}
                            {isLoadingProjects
                                ? "กำลังโหลดข้อมูล..."
                                : projects.length
                                ? "ข้อมูลตัวอย่างอัปเดตล่าสุด"
                                : "ยังไม่มีโปรเจกต์"}
                        </p>
                        <p className="text-xs text-slate-400">
                            ระบบจะดึงสถานะจากข้อมูลล่าสุดในคลาวด์ทุกครั้งที่โหลดหน้า
                        </p>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                งานของฉัน
                            </p>
                            <h2 className="text-lg font-semibold text-slate-900">ติดตามงานส่วนบุคคล</h2>
                        </div>
                        <span className="text-xs text-slate-400">({personalTasks.length} รายการ)</span>
                    </div>

                    <div className="mt-4 space-y-3">
                        {isLoadingTasks ? (
                            <p className="text-sm text-slate-500">กำลังดึงงานที่มอบหมายให้คุณ...</p>
                        ) : personalTasks.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                ยังไม่มีงานใหม่ในโปรเจกต์ที่คุณดูอยู่ ณ ขณะนี้
                            </p>
                        ) : (
                            personalTasks.map((task) => {
                                const priorityBadge =
                                    PRIORITY_BADGES[task.priority] ?? PRIORITY_BADGES.normal;
                                return (
                                    <div
                                        key={task.id}
                                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full" style={{ background: task.statusColor }} />
                                                <span>{task.statusLabel}</span>
                                            </div>
                                            <span>{task.dueLabel ?? "ยังไม่มีกำหนด"}</span>
                                        </div>
                                        <h3 className="mt-3 text-base font-semibold text-slate-900">{task.title}</h3>
                                        <p className="text-xs text-slate-500">{task.projectName}</p>
                                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500"
                                                style={{ width: `${task.progress}%` }}
                                            />
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                            <span>{task.progress}% เสร็จแล้ว</span>
                                            <span>อัปเดต {formatDateString(task.updatedAt)}</span>
                                        </div>
                                        <div
                                            className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${priorityBadge.className}`}
                                        >
                                            <span>{priorityBadge.label}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Page;
