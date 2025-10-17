"use client";

import { CustomAlert } from "@/app/components/CustomAlertModal";
import { CustomButton } from "@/app/components/Input/CustomButton";
import CustomRadioGroup from "@/app/components/Input/CustomRadioGroup";
import CustomUploadImage from "@/app/components/Input/CustomUploadImage";
import TextField from "@/app/components/Input/TextField";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null);

    const {
        control,
        handleSubmit,
        reset,
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
    };

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
            const formData = { ...data, file };

            const formDataAPI = new FormData()

            if (file) {
                formDataAPI.append("profile", file);
            }

            formDataAPI.append("email", formData.email)
            formDataAPI.append("username", formData.username)
            formDataAPI.append("password", formData.password)
            formDataAPI.append("full_name", formData.full_name)
            formDataAPI.append("department", formData.department)
            formDataAPI.append("position", formData.position)
            formDataAPI.append("role", formData.role)

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
                })

                if (response.status == 200 || response.status == 201) {
                    await CustomAlert({
                        type: "success",
                        title: t('alert.success'),
                        message: t('alert.alert_success')
                    })

                    router.push("/home/view")
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
        <main className="flex-1 overflow-y-auto">
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
            >
                <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex gap-2 flex-col">
                    <div className="text-lg font-semibold mb-5 uppercase">
                        {t("employee.employee_information")}
                    </div>


                    <CustomUploadImage onFileChange={handleFileChange} variant="primary" />


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
                        <p className="text-red-500 text-sm">
                            {errors.role.message}
                        </p>
                    )}


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


                    <div className="flex justify-between mt-4">
                        <CustomButton
                            variant="secondary"
                            type="button"
                            onClick={() => reset()}
                        >
                            ยกเลิก
                        </CustomButton>
                        <CustomButton type="submit">บันทึก</CustomButton>
                    </div>
                </div>
            </form>
        </main>
    );
};

export default Page;
