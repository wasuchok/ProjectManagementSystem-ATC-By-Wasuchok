"use client";
import { CustomAlert } from "@/app/components/CustomAlertModal";
import { CustomButton } from "@/app/components/Input/CustomButton";
import TextField from "@/app/components/Input/TextField";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";
import { apiPublic } from "@/app/services/apiPublic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

type FormValues = {
    username: string;
    password: string;
};

const LoginPage = () => {
    const router = useRouter();
    const { setUser } = useUser();

    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>();

    const { lang, setLang, t } = useLanguage();
    const [showLang, setShowLang] = useState(false);

    const handleLangChange = (newLang: "TH" | "EN") => {
        setLang(newLang);
        setShowLang(false);
    };

    const onSubmit = async (data: FormValues) => {
        try {
            setIsLoading(true)
            const response = await apiPublic.post("/user-account/login", data);
            if (response.status == 200 || response.status == 201) {
                await CustomAlert({
                    type: "success",
                    title: t('alert.success'),
                    message: t('alert.alert_success')
                })

                localStorage.setItem("user", JSON.stringify(response.data))
                setUser({
                    id: response.data.id,
                    username: response.data.username,
                    full_name: response.data.full_name ?? undefined,
                    email: response.data.email,
                    roles: response.data.roles ?? [],
                })
                router.push("/home/view")
            }
        } catch (error) {
            await CustomAlert({
                type: "error",
                title: t("alert.error"),
                message: t("alert.alert_error"),
            });
            console.log(error);
        } finally {
            setIsLoading(false)
        }
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen w-full relative">

            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={() => setShowLang(!showLang)}
                    className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border text-gray-700 hover:bg-gray-50 transition"
                >

                    {lang === "TH" ? <img
                        src="https://flagcdn.com/w20/th.png"
                        className="w-5 h-3"
                        alt="TH"
                    /> : <img
                        src="https://flagcdn.com/w20/gb.png"
                        className="w-5 h-3"
                        alt="EN"
                    />}
                    <span>{lang === "TH" ? "ไทย" : "English"}</span>

                </button>

                {showLang && (
                    <div className="absolute right-0 mt-2 w-36 bg-white border rounded-lg shadow-lg overflow-hidden z-50">
                        <button
                            onClick={() => handleLangChange("TH")}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition ${lang === "TH" ? "bg-gray-50 text-blue-600" : "text-gray-700"
                                }`}
                        >
                            <img
                                src="https://flagcdn.com/w20/th.png"
                                className="w-5 h-3"
                                alt="TH"
                            />
                            ไทย
                        </button>
                        <button
                            onClick={() => handleLangChange("EN")}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition ${lang === "EN" ? "bg-gray-50 text-blue-600" : "text-gray-700"
                                }`}
                        >
                            <img
                                src="https://flagcdn.com/w20/gb.png"
                                className="w-5 h-3"
                                alt="EN"
                            />
                            English
                        </button>
                    </div>
                )}
            </div>


            <div className="flex-1 flex items-center justify-center bg-primary-500 p-4">
                <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-white text-sm">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="opacity-80">
                        <path d="M10 2h4v2h-4V2zm-7 9h18v2H3v-2zm3 7h12v2H6v-2z" />
                    </svg>
                    Project Management System
                </div>
            </div>


            <div className="flex-1 flex items-center justify-center bg-white p-8">
                <div className="w-full max-w-md">
                    <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
                        {t("auth.login")}
                    </h1>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="mb-4">
                            <TextField
                                label={t("employee.username")}
                                placeholder={t('please_fill_in_information')}
                                {...register("username", {
                                    required: t('please_fill_in_information'),
                                })}
                                error={errors.username?.message}
                            />
                        </div>

                        <div className="mb-6">
                            <TextField
                                type="password"
                                label={t("employee.password")}
                                placeholder={t('please_fill_in_information')}
                                {...register("password", {
                                    required: t('please_fill_in_information'),
                                })}
                                error={errors.password?.message}
                            />
                        </div>

                        <div>
                            <CustomButton
                                disabled={isLoading}
                                type="submit"
                                variant="primary"
                                className="w-full flex justify-center items-center px-4 py-2 text-center font-semibold rounded-lg shadow-sm bg-primary-600 hover:bg-primary-700 transition-colors text-white"
                            >
                                {t("auth.btn_login")}
                            </CustomButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
