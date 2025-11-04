"use client";

import { CustomAlert } from "@/app/components/CustomAlertModal";
import { CustomButton } from "@/app/components/Input/CustomButton";
import CustomRadioGroup from "@/app/components/Input/CustomRadioGroup";
import CustomUploadImage from "@/app/components/Input/CustomUploadImage";
import TextField from "@/app/components/Input/TextField";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FaUser, FaUserNurse, FaUserTie } from "react-icons/fa";

interface FormValues {
    role: string;
    username: string;
    password: string;
    email: string;
    full_name: string;
    department: string;
    position: string;
}

const Page = () => {
    const { t } = useLanguage();
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: {
            role: "",
            username: "",
            password: "",
            email: "",
            full_name: "",
            department: "",
            position: "",
        },
    });

    const handleFileChange = (newFile: File | null) => {
        setFile(newFile);

        setPreviewUrl((prev) => {
            if (prev) {
                URL.revokeObjectURL(prev);
            }
            return newFile ? URL.createObjectURL(newFile) : null;
        });
    };

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const previewValues = watch();

    const options = [
        {
            label: t("employee.admin"),
            value: "Admin",
            icon: <FaUserTie className="text-gray-600 w-5 h-5" />,
        },
        {
            label: t("employee.can_create"),
            value: "Staff",
            icon: <FaUserNurse className="text-orange-600 w-5 h-5" />,
        },
        {
            label: t("employee.employee"),
            value: "Employee",
            icon: <FaUser className="text-green-600 w-5 h-5" />,
        },
    ];

    const onSubmit = async (data: FormValues) => {
        try {
            const formDataAPI = new FormData();

            if (file) {
                formDataAPI.append("profile", file);
            }

            formDataAPI.append("email", data.email);
            formDataAPI.append("username", data.username);
            formDataAPI.append("password", data.password);
            formDataAPI.append("full_name", data.full_name);
            formDataAPI.append("department", data.department);
            formDataAPI.append("position", data.position);
            formDataAPI.append("role", data.role);

            const storedUser = localStorage.getItem("user");
            let userId = "";

            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    userId = user.id || "";
                } catch (error) {
                    console.warn("⚠️ Failed to parse user from localStorage");
                }
            }

            formDataAPI.append("create_by", userId);

            const confirm = await CustomAlert({
                type: "confirm",
                title: t("modal.are_you_sure"),
                message: t("modal.do_you_want_to_save_information"),
            });


            if (confirm) {
                const response = await apiPrivate.post("/user-account/register", formDataAPI, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                if (response.status == 200 || response.status == 201) {
                    await CustomAlert({
                        type: "success",
                        title: t("alert.success"),
                        message: t("alert.alert_success"),
                    });

                    router.push("/home/view");
                }
            }
        } catch (error) {
            await CustomAlert({
                type: "error",
                title: t("alert.error"),
                message: t("alert.alert_error"),
            });
            console.log(error);
        } finally {

        }

    };

    return (
        <main className="">
            <section className="">
                <header className="mb-8 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                                {t("employee.employee_information")}
                            </p>
                            <h1 className="text-2xl font-semibold text-slate-800 md:text-3xl">
                                {t("employee.create_heading")}
                            </h1>
                            <p className="text-sm text-slate-500">
                                {t("employee.create_subheading")}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-inner">
                            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                                {t("employee.status")}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                                {t("employee.new_profile")}
                            </span>
                        </div>
                    </div>
                </header>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
                >
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
                        <div className="mb-8 flex flex-col items-start gap-6 border-b border-dashed border-slate-200 pb-8 lg:flex-row lg:items-center lg:justify-between">
                            <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-slate-50 p-4">

                                <CustomUploadImage onFileChange={handleFileChange} variant="primary" />
                                <p className="mt-2 text-xs text-slate-500">
                                    {t('employee.image_helper_text')}
                                </p>
                            </div>
                            <div className="flex-1 space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                    {t("employee.role")}
                                </p>
                                <Controller
                                    name="role"
                                    control={control}
                                    rules={{ required: t("please_fill_in_information") }}
                                    render={({ field }) => (
                                        <CustomRadioGroup
                                            required
                                            name={field.name}
                                            options={options}
                                            value={field.value}
                                            onChange={field.onChange}
                                            variant="primary"
                                            direction="row"
                                        />
                                    )}
                                />
                                {errors.role && (
                                    <p className="text-sm text-red-500">{errors.role.message}</p>
                                )}
                            </div>
                        </div>

                        <section className="grid gap-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                        {t("employee.account_access")}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {t("employee.account_access_subtitle")}
                                    </p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Controller
                                        name="username"
                                        control={control}
                                        rules={{ required: t("please_fill_in_information") }}
                                        render={({ field }) => (
                                            <TextField
                                                required
                                                label={t("employee.username")}
                                                placeholder={t("please_fill_in_information")}
                                                error={errors.username?.message}
                                                {...field}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="password"
                                        control={control}
                                        rules={{ required: t("please_fill_in_information") }}
                                        render={({ field }) => (
                                            <TextField
                                                required
                                                label={t("employee.password")}
                                                type="password"
                                                placeholder={t("please_fill_in_information")}
                                                error={errors.password?.message}
                                                {...field}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="email"
                                        control={control}
                                        rules={{
                                            required: t("please_fill_in_information"),
                                            pattern: {
                                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                                message: "รูปแบบอีเมลไม่ถูกต้อง",
                                            },
                                        }}
                                        render={({ field }) => (
                                            <TextField
                                                required
                                                label={t("employee.email")}
                                                placeholder={t("please_fill_in_information")}
                                                error={errors.email?.message}
                                                {...field}
                                            />
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                        {t("employee.personal_information")}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {t("employee.personal_information_subtitle")}
                                    </p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Controller
                                        name="full_name"
                                        control={control}
                                        rules={{ required: t("please_fill_in_information") }}
                                        render={({ field }) => (
                                            <TextField
                                                required
                                                label={t("employee.fullname")}
                                                placeholder={t("please_fill_in_information")}
                                                error={errors.full_name?.message}
                                                {...field}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="department"
                                        control={control}
                                        rules={{ required: t("please_fill_in_information") }}
                                        render={({ field }) => (
                                            <TextField
                                                required
                                                label={t("employee.department")}
                                                placeholder={t("please_fill_in_information")}
                                                error={errors.department?.message}
                                                {...field}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="position"
                                        control={control}
                                        rules={{ required: t("please_fill_in_information") }}
                                        render={({ field }) => (
                                            <TextField
                                                required
                                                label={t("employee.position")}
                                                placeholder={t("please_fill_in_information")}
                                                error={errors.position?.message}
                                                {...field}
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="mt-10 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                            <CustomButton
                                variant="secondary"
                                type="button"
                                onClick={() => reset()}
                                className="w-full sm:w-auto"
                            >
                                ยกเลิก
                            </CustomButton>
                            <CustomButton type="submit" className="w-full sm:w-auto">
                                บันทึก
                            </CustomButton>
                        </div>
                    </div>

                    <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                {previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt="Preview avatar"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400">
                                        {previewValues.full_name?.charAt(0) || "?"}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                    {t("employee.employee_information")}
                                </p>
                                <p className="truncate text-lg font-semibold text-slate-900">
                                    {previewValues.full_name || t("employee.fullname")}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {previewValues.position || t("employee.position")}
                                </p>
                                <p className="text-sm font-medium text-slate-700">
                                    {previewValues.department || t("employee.department")}
                                </p>
                            </div>
                        </div>

                        <dl className="mt-6 space-y-3 text-sm text-slate-600">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <dt className="text-slate-400">{t("employee.role")}</dt>
                                <dd className="font-semibold text-slate-900">
                                    {previewValues.role || "Select role"}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <dt className="text-slate-400">{t("employee.email")}</dt>
                                <dd className="truncate font-medium text-slate-900">
                                    {previewValues.email || "name@example.com"}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-slate-400">{t("employee.username")}</dt>
                                <dd className="font-medium text-slate-900">
                                    {previewValues.username || t("employee.username")}
                                </dd>
                            </div>
                        </dl>

                        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                            {t("employee.preview_helper_text")}
                        </div>
                    </aside>
                </form>
            </section>
        </main>
    );
};

export default Page;
