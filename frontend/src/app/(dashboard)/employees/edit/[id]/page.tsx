"use client";

import { CustomAlert } from "@/app/components/CustomAlertModal";
import { CustomButton } from "@/app/components/Input/CustomButton";
import CustomRadioGroup from "@/app/components/Input/CustomRadioGroup";
import CustomUploadImage from "@/app/components/Input/CustomUploadImage";
import TextField from "@/app/components/Input/TextField";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { getImageUrl } from "@/app/utils/imagePath";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const deriveRole = (user: any) => {
    if (!user) return "Employee";
    if (user.role) return user.role;
    if (user.v_admin) return "Admin";
    if (user.v_create) return "Staff";
    return "Employee";
};

const Page = () => {
    const { t } = useLanguage();
    const router = useRouter();
    const params = useParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [serverImage, setServerImage] = useState<string | null>(null);
    const [removeImage, setRemoveImage] = useState(false);

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

    const previewValues = watch();

    const options = useMemo(
        () => [
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
        ],
        [t]
    );

    const handleFileChange = (newFile: File | null) => {
        if (newFile) {
            setRemoveImage(false);
        }
        setFile(newFile);

        setImagePreview((prev) => {
            if (prev && prev !== serverImage) {
                URL.revokeObjectURL(prev);
            }
            if (newFile) {
                return URL.createObjectURL(newFile);
            }
            if (removeImage) {
                return null;
            }
            return serverImage;
        });
    };

    const handleRemoveCurrentImage = () => {
        if (!serverImage && !imagePreview) return;
        setRemoveImage(true);
        setFile(null);
        setImagePreview((prev) => {
            if (prev && prev !== serverImage) {
                URL.revokeObjectURL(prev);
            }
            return null;
        });
    };

    const handleRestoreImage = () => {
        if (!serverImage) return;
        setRemoveImage(false);
        setImagePreview(serverImage);
    };

    const fetchUserById = useCallback(async () => {
        if (!params?.id) return;
        setLoading(true);
        try {
            const response = await apiPrivate.get(`/user-account/user/${params.id}`);

            if (response.status === 200 || response.status === 201) {
                const user = response.data.data;
                reset({
                    role: deriveRole(user),
                    username: user.username || "",
                    password: "",
                    email: user.email || "",
                    full_name: user.full_name || "",
                    department: user.department || "",
                    position: user.position || "",
                });
                const imgUrl = getImageUrl(user.image);
                setServerImage(imgUrl);
                setImagePreview(imgUrl);
                setFile(null);
                setRemoveImage(false);
            }
        } catch (error) {
            console.error("❌ Fetch user error:", error);
            await CustomAlert({
                type: "error",
                title: t("alert.error"),
                message: t("alert.alert_error"),
            });
        } finally {
            setLoading(false);
        }
    }, [params?.id, reset, t]);

    useEffect(() => {
        fetchUserById();
    }, [fetchUserById]);

    useEffect(() => {
        return () => {
            if (imagePreview && imagePreview !== serverImage) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview, serverImage]);

    const onSubmit = async (data: FormValues) => {
        if (!params?.id) return;

        const confirm = await CustomAlert({
            type: "confirm",
            title: t("modal.are_you_sure"),
            message: t("modal.do_you_want_to_save_information"),
        });

        if (!confirm) return;

        setSaving(true);
        try {
            const formDataAPI = new FormData();
            if (file) {
                formDataAPI.append("profile", file);
            }

            formDataAPI.append("email", data.email);
            formDataAPI.append("username", data.username);
            if (data.password) {
                formDataAPI.append("password", data.password);
            }
            formDataAPI.append("full_name", data.full_name);
            formDataAPI.append("department", data.department);
            formDataAPI.append("position", data.position);
            formDataAPI.append("role", data.role);
            if (removeImage && !file) {
                formDataAPI.append("remove_image", "true");
            }

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

            formDataAPI.append("update_by", userId);

            const response = await apiPrivate.put(
                `/user-account/update/${params.id}`,
                formDataAPI,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            if (response.status === 200 || response.status === 201) {
                await CustomAlert({
                    type: "success",
                    title: t("alert.success"),
                    message: t("alert.alert_success"),
                });

                router.push("/employees/view");
            }
        } catch (error) {
            console.error("❌ Update user error:", error);
            await CustomAlert({
                type: "error",
                title: t("alert.error"),
                message: t("alert.alert_error"),
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="">
            <section className="">
                <header className="mb-8 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                                {t("employee.menu_title")}
                            </p>
                            <h1 className="text-2xl font-semibold text-slate-800 md:text-3xl">
                                {t("employee.title")}
                            </h1>
                            <p className="text-sm text-slate-500">
                                {t("employee.subtitle")}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-inner">
                            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                                ID
                            </span>
                            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                                {params?.id?.toString().slice(0, 8) ?? "---"}
                            </span>
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                        {[1, 2].map((item) => (
                            <div
                                key={item}
                                className="animate-pulse rounded-3xl border border-slate-200 bg-white/70 p-6"
                            >
                                <div className="h-6 w-40 rounded bg-slate-200" />
                                <div className="mt-4 space-y-3">
                                    {[...Array(4)].map((_, idx) => (
                                        <div key={idx} className="h-12 rounded-xl bg-slate-100" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
                    >
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
                            <div className="mb-8 flex flex-col items-start gap-6 border-b border-dashed border-slate-200 pb-8 lg:flex-row lg:items-center lg:justify-between">
                                <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                                            {t("employee.profile_picture")}
                                        </p>
                                        {serverImage && !removeImage && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveCurrentImage}
                                                className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                                            >
                                                {t("employee.remove_photo")}
                                            </button>
                                        )}
                                        {serverImage && removeImage && (
                                            <button
                                                type="button"
                                                onClick={handleRestoreImage}
                                                className="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700"
                                            >
                                                {t("employee.restore_photo")}
                                            </button>
                                        )}
                                    </div>
                                    <CustomUploadImage
                                        onFileChange={handleFileChange}
                                        variant="primary"
                                        defaultImageUrl={
                                            !removeImage && serverImage ? serverImage : undefined
                                        }
                                    />
                                    <p className="mt-2 text-xs text-slate-500">
                                        {t("employee.image_helper_text")}
                                    </p>
                                    {removeImage && serverImage && (
                                        <p className="mt-2 text-xs font-semibold text-rose-600">
                                            {t("employee.image_removed_notice")}
                                        </p>
                                    )}
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
                                            render={({ field }) => (
                                                <TextField
                                                    label={t("employee.password")}
                                                    type="password"
                                                    placeholder={t("employee.password")}
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
                                    onClick={() => router.back()}
                                    className="w-full sm:w-auto"
                                >
                                    {t("actions.cancel")}
                                </CustomButton>
                                <CustomButton
                                    type="submit"
                                    className="w-full sm:w-auto"
                                    disabled={saving}
                                >
                                    {saving ? `${t("actions.save")}...` : t("actions.save")}
                                </CustomButton>
                            </div>
                        </div>

                        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                    {imagePreview ? (
                                        <img
                                            src={imagePreview}
                                            alt="Preview avatar"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400">
                                            {previewValues.full_name?.charAt(0) || "👤"}
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
                )}
            </section>
        </main>
    );
};

export default Page;
