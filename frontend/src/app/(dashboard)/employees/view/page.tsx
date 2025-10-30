"use client";
import { ScrollableTable } from "@/app/components/employees/table/ScrollableTable";
import { CustomButton } from "@/app/components/Input/CustomButton";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { getImageUrl } from "@/app/utils/imagePath";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const Page = () => {
    const { t } = useLanguage();
    const router = useRouter();

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchUsers = async (page = 1) => {
        setLoading(true);
        try {
            const response = await apiPrivate.get(`/user-account/users`, {
                params: {
                    page,
                    limit: 10,
                },
            });

            const resData = response.data.data;

            const withIndex = resData.data.map((user: any, index: number) => ({
                num: (page - 1) * 10 + (index + 1),
                ...user,
            }));

            setData(withIndex);
            setCurrentPage(resData.page);
            setTotalPages(resData.totalPages);
        } catch (error) {
            console.error("❌ Fetch users error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage]);

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
    ];

    return (
        <div className="space-y-6">
            {/* ✅ ส่วนหัวของหน้า */}
            <div className="flex flex-col gap-5 rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {t("employee.menu_title")}
                    </span>
                    <h1 className="text-2xl font-semibold text-slate-800">
                        👥 {t("employee.title")}
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
                        ➕ {t("employee.add")}
                    </CustomButton>
                </div>
            </div>

            {/* ✅ ตารางพนักงาน */}
            <div className="mt-6 rounded-3xl border border-slate-100 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                <ScrollableTable
                    columns={columns}
                    data={data}
                    loading={loading}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    onEdit={(row) => console.log("Edit:", row)}
                    onDelete={(row) => console.log("Delete:", row)}
                />
            </div>
        </div>
    );
};

export default Page;
