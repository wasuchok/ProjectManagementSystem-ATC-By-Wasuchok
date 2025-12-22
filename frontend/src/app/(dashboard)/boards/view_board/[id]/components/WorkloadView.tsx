type WorkloadItem = {
    userId: string;
    name: string;
    active: number;
    late: number;
    avgProgress: number;
    score: number;
    reason: string;
};

interface WorkloadViewProps {
    workload: WorkloadItem[];
    isLoadingWorkload: boolean;
    workloadError: string | null;
    fetchWorkload: () => void;
    workloadMax: { maxActive: number; maxLate: number };
    t: (key: string) => string;
}

export default function WorkloadView({
    workload,
    isLoadingWorkload,
    workloadError,
    fetchWorkload,
    workloadMax,
    t,
}: WorkloadViewProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-700">ภาพรวมทีม</h2>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.4)]">
                {isLoadingWorkload ? (
                    <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
                ) : workloadError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-600">{workloadError}</div>
                ) : workload.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        ไม่มีข้อมูลคำแนะนำ
                    </div>
                ) : (
                    <>
                        <div className="mb-6 overflow-x-auto">
                            <div className="min-w-[720px] rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                <div className="grid grid-cols-[220px_1fr_120px] items-center gap-3 px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    <span>สมาชิก</span>
                                    <span>งานค้าง + งานช้า (stacked)</span>
                                    <span className="text-center">% เฉลี่ย</span>
                                </div>
                                <div className="divide-y divide-slate-200">
                                    {workload.map((row) => {
                                        const maxTotal = Math.max(1, (workloadMax.maxActive || 1) + (workloadMax.maxLate || 1));
                                        const total = Math.max(0, row.active + row.late);
                                        const activePart = total > 0 ? (row.active / total) * 100 : 0;
                                        const latePart = total > 0 ? (row.late / total) * 100 : 0;
                                        const scaled = Math.min(100, Math.max(8, (total / maxTotal) * 100));
                                        const avg = Math.max(0, Math.min(100, row.avgProgress));
                                        return (
                                            <div key={`chart-${row.userId}`} className="grid grid-cols-[220px_1fr_120px] items-center gap-3 px-2 py-2 text-xs">
                                                <span className="truncate font-semibold text-slate-700">{row.name}</span>
                                                <div className="relative h-4 rounded-full border border-slate-200 bg-white">
                                                    <div className="absolute inset-y-0 left-0 rounded-l-full bg-slate-400/80" style={{ width: `${(scaled * activePart) / 100}%` }} />
                                                    <div className="absolute inset-y-0 right-0 rounded-r-full bg-rose-400/90" style={{ width: `${(scaled * latePart) / 100}%` }} />
                                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-600">
                                                        {row.active} งานค้าง · {row.late} งานช้า
                                                    </div>
                                                </div>
                                                <div className="text-center font-bold text-emerald-600">{avg}%</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {workload.map((row, idx) => (
                                <div key={row.userId} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{idx + 1}</span>
                                            <span className="font-semibold text-slate-800">{row.name}</span>
                                        </div>
                                        <span className="rounded-full bg-slate-100 px-2 py-[2px] text-[10px] font-semibold text-slate-600">score {row.score.toFixed(2)}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div className="rounded-lg bg-slate-50 p-2">
                                            <div className="text-[10px] font-semibold text-slate-500">งานค้าง</div>
                                            <div className="text-base font-bold text-slate-800">{row.active}</div>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-2">
                                            <div className="text-[10px] font-semibold text-slate-500">งานช้า</div>
                                            <div className="text-base font-bold text-rose-600">{row.late}</div>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-2">
                                            <div className="text-[10px] font-semibold text-slate-500">เฉลี่ย %</div>
                                            <div className="text-base font-bold text-emerald-600">{row.avgProgress}</div>
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">{row.reason}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
