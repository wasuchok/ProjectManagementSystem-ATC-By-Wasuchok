"use client";
import { ScrollableTable } from "@/app/components/employees/table/ScrollableTable";
import { CustomAlert } from "@/app/components/CustomAlertModal";
import { CustomButton } from "@/app/components/Input/CustomButton";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { getImageUrl } from "@/app/utils/imagePath";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEye, FiRefreshCcw, FiPower, FiUser } from "react-icons/fi";

const Page = () => {
    const { t } = useLanguage();

    const router = useRouter();

    const { user } = useUser();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);
    const currentUserId = useMemo(() => (user?.id != null ? String(user.id) : null), [user]);

    const fetchUsers = useCallback(
        async (page = 1) => {
            setLoading(true);
            try {
                const response = await apiPrivate.get(`/user-account/users`, {
                    params: {
                        page,
                        limit: 10,
                    },
                });

                const resData = response.data.data;

                const withIndex = resData.data.map((userRow: any, index: number) => ({
                    num: (page - 1) * 10 + (index + 1),
                    isSelf: currentUserId != null && String(userRow.user_id) === currentUserId,
                    ...userRow,
                }));

                setData(withIndex);
                setCurrentPage(resData.page);
                setTotalPages(resData.totalPages);
            } catch (error) {
                console.error("❌ Fetch users error:", error);
            } finally {
                setLoading(false);
            }
        },
        [currentUserId]
    );

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage, fetchUsers]);

    const handleToggleStatus = async (row: any) => {
        const isSuspended = Number(row?.status) === 1;
        const targetStatus = isSuspended ? 0 : 1;
        const userName = row.full_name ?? row.username ?? "";
        const confirmMessage = isSuspended
            ? t("employee.restore_confirm", { name: userName })
            : t("employee.delete_confirm", { name: userName });
        const currentUserId = user?.id != null ? String(user.id) : null;
        if (currentUserId && String(row.user_id) === currentUserId && targetStatus === 1) {
            await CustomAlert({
                type: "error",
                title: t("employee.cannot_suspend_self_title"),
                message: t("employee.cannot_suspend_self"),
            });
            return;
        }

        const confirmed = await CustomAlert({
            type: "confirm",
            title: t("modal.are_you_sure"),
            message: confirmMessage,
        });
        if (!confirmed) {
            return;
        }

        setStatusTogglingId(row.user_id);
        try {
            await apiPrivate.put(`/user-account/update/${row.user_id}`, {
                status: targetStatus,
            });

            await fetchUsers(currentPage);

            await CustomAlert({
                type: "success",
                title: t("alert.success"),
                message: isSuspended
                    ? t("employee.restore_success")
                    : t("employee.delete_success"),
            });
        } catch (error) {
            console.error("❌ Toggle status error:", error);
            await CustomAlert({
                type: "error",
                title: t("alert.error"),
                message: isSuspended
                    ? t("employee.restore_error")
                    : t("employee.delete_error"),
            });
        } finally {
            setStatusTogglingId(null);
        }
    };

    const selfRow = useMemo(() => data.find((item) => item.isSelf), [data]);
    const selfImageUrl = useMemo(() => getImageUrl(selfRow?.image), [selfRow]);
    const tableRows = useMemo(() => data.filter((item) => !item.isSelf), [data]);

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage]);

    const createStatusBadge = (isSuspended: boolean) => {
        const badgeLabel = isSuspended ? t("employee.status_suspended") : t("employee.status_active");
        const badgeColor = isSuspended
            ? "bg-rose-50 text-rose-700 border-rose-100"
            : "bg-emerald-50 text-emerald-700 border-emerald-100";

        return (
            <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeColor}`}
            >
                <span className={`h-2 w-2 rounded-full ${isSuspended ? "bg-rose-500" : "bg-emerald-500"}`} />
                {badgeLabel}
            </span>
        );
    };

    const columns: any = [
        { header: t("employee.table_no"), accessor: "num" },
        {
            header: t("employee.fullname"),
            accessor: "full_name",
            render: (_: any, row: any) => {
                const imageUrl = getImageUrl(row?.image);

                return (
                    <div className="flex items-center gap-3">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={row.full_name || "profile"}
                                width={40}
                                height={40}
                                className="rounded-full object-cover border border-gray-200 shadow-sm"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                                {row.full_name ? row.full_name[0] : "?"}
                            </div>
                        )}
                        <div>
                            <p className="font-medium text-gray-900">{row.full_name}</p>
                            <p className="text-sm text-gray-500">
                                {t("employee.department")} {row.department}
                            </p>
                        </div>
                    </div>
                );
            },
        },
        { header: t("employee.username"), accessor: "username" },
        { header: t("employee.email"), accessor: "email" },
        {
            header: t("employee.status"),
            accessor: "status",
            render: (value: any) => createStatusBadge(Number(value) === 1),
        },
    ];

    return (
        <div className="space-y-6">

            <div className="flex flex-col gap-5 rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {t("employee.menu_title")}
                    </span>
                    <h1 className="text-2xl font-semibold text-slate-800">
                        {t("employee.title")}
                    </h1>
                    <p className="max-w-xl text-sm text-slate-500">
                        {t("employee.subtitle")}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <CustomButton
                        onClick={() => router.push("/employees/create")}
                        className="inline-flex items-center rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-primary-600 hover:to-primary-700"
                    >
                        {t("employee.add")}
                    </CustomButton>
                </div>
            </div>

            {selfRow && (
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white p-5 shadow-[0_20px_40px_rgba(15,23,42,0.12)]">
                    <div className="grid items-center gap-4 md:grid-cols-[auto_1fr_auto]">
                        <div className="flex items-center gap-4">
                            {selfImageUrl ? (
                                <img
                                    src={selfImageUrl}
                                    alt={selfRow.full_name || "profile"}
                                    width={52}
                                    height={52}
                                    className="rounded-full border border-slate-200 object-cover shadow-sm"
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-inner">
                                    {selfRow.full_name ? selfRow.full_name[0] : "?"}
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    {selfRow.full_name ?? selfRow.username}
                                </p>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                    {t("employee.self_section_title")}
                                </p>
                                <p className="text-xs text-slate-500">{selfRow.username}</p>
                            </div>
                        </div>
                        <div className="text-sm text-slate-500 md:text-xs">
                            {t("employee.self_section_note")}
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            {createStatusBadge(Number(selfRow.status) === 1)}
                            <button
                                type="button"
                                onClick={() => router.push(`/employees/edit/${selfRow.user_id}`)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                aria-label={t("employee.self_view_button")}
                            >
                                <FiUser size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-6 rounded-3xl border border-slate-100 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                <ScrollableTable
                columns={columns}
                data={tableRows}
                    loading={loading}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    renderActions={(row: any) => {
                        const isSuspended = Number(row.status) === 1;
                        const toggleLabel = isSuspended ? t("employee.restore") : t("employee.delete");
                        const isCurrentUser =
                            user?.id != null && String(row.user_id) === String(user.id);

                        return (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => router.push(`/employees/edit/${row.user_id}`)}
                                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center w-8 h-8 shadow-sm hover:shadow-md"
                                    title={t("employee.edit")}
                                >
                                    <FiEye size={16} className="font-bold" />
                                </button>
                                <button
                                    onClick={() => handleToggleStatus(row)}
                                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center w-8 h-8 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                                    title={isCurrentUser ? t("employee.cannot_suspend_self") : toggleLabel}
                                    disabled={statusTogglingId === row.user_id || isCurrentUser}
                                >
                                    {isSuspended ? (
                                        <FiRefreshCcw size={16} className="font-bold" />
                                    ) : (
                                        <FiPower size={16} className="font-bold" />
                                    )}
                                </button>
                            </div>
                        );
                    }}
                />
            </div>
        </div>
    );
};

export default Page;
