"use client";

import { CustomAlert } from "@/app/components/CustomAlertModal";
import { CustomButton } from "@/app/components/Input/CustomButton";
import CustomCheckbox from "@/app/components/Input/CustomCheckbox";
import OptionList from "@/app/components/Input/OptionList";
import OptionListMulti from "@/app/components/Input/OptionListMulti";
import TextArea from "@/app/components/Input/TextArea";
import TextField from "@/app/components/Input/TextField";
import { priorityTypes } from "@/app/config/data";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FiFlag } from "react-icons/fi";
const Page = () => {
    const router = useRouter()
    const [users, setUsers] = useState([]);
    const { user }: any = useUser();
    const { t } = useLanguage();

    const {
        control,
        handleSubmit,
        formState: { errors },
        setValue,
    }: any = useForm({
        defaultValues: {
            project_name: "",
            description: "",
            priority: "",
            team: [],
            join: true,
        },
    });



    const fetchUsers = async () => {
        try {
            const response = await apiPrivate.get("/user-account/users?all=true");
            if (response.status === 200 || response.status === 201) {
                const mapUsers = response.data.data.map((item: any) => ({
                    label: item.username,
                    value: item.user_id,
                    username: item.username,
                    branch: item.branch,
                }));
                setUsers(mapUsers);
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);


    const teamWatch = useWatch({ control, name: "team" });

    useEffect(() => {
        if (!user || !user.username) return;


        if (!teamWatch || teamWatch.length === 0) {
            setValue("team", [user.id]);

            return;
        }


        if (!teamWatch.includes(user.id)) {
            setValue("team", [...teamWatch, user.id]);
        }
    }, [teamWatch, user, setValue]);


    const onSubmit = async (data: any) => {
        try {
            const confirm = await CustomAlert({
                type: "confirm",
                title: t("modal.are_you_sure"),
                message: t("modal.do_you_want_to_save_information"),
            });

            if (confirm) {
                const response = await apiPrivate.post("/project/create", { ...data, invited_by: user.id, name: data.project_name, created_by: user.id });
                if (response.status == 200 || response.status == 201) {
                    await CustomAlert({
                        type: "success",
                        title: t('alert.success'),
                        message: t('alert.alert_success')
                    })

                    router.push("/boards/view")
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-primary-50 to-sky-50 p-5 xl:p-6">
                    <div className="flex items-center justify-between gap-6">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-semibold text-primary-700">
                                <FiFlag size={14} />
                                {t("project.title")}
                            </div>
                            <h1 className="mt-3 text-2xl font-bold text-slate-800">
                                {t("project.create_title")}
                            </h1>
                            <p className="mt-2 text-sm text-slate-600">
                                {t("project.create_content")}
                            </p>
                        </div>
                        <img
                            src="/Project Management.jpg"
                            alt="Project overview"
                            className="hidden md:block w-56 xl:w-64 h-auto rounded"
                        />
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                        <Controller
                            name="project_name"
                            control={control}
                            rules={{ required: t("please_fill_in_information") }}
                            render={({ field }) => (
                                <TextField
                                    required
                                    label={t("project.project_name")}
                                    placeholder={t("please_fill_in_information")}
                                    error={errors.project_name?.message}
                                    {...field}
                                />
                            )}
                        />
                        <Controller
                            name="description"
                            control={control}
                            rules={{ required: t("please_fill_in_information") }}
                            render={({ field }) => (
                                <TextArea
                                    required
                                    label={t("project.description")}
                                    placeholder={t("please_fill_in_information")}
                                    error={errors.description?.message}
                                    {...field}
                                />
                            )}
                        />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                        <Controller
                            name="priority"
                            control={control}
                            rules={{ required: t("please_fill_in_information") }}
                            render={({ field }) => (
                                <OptionList
                                    label={t("project.priority")}
                                    value={field.value}
                                    onChange={field.onChange}
                                    options={priorityTypes}
                                    error={errors.priority?.message}
                                    required
                                />
                            )}
                        />
                        <Controller
                            name="team"
                            control={control}
                            rules={{ required: t("please_fill_in_information") }}
                            render={({ field }) => (
                                <OptionListMulti
                                    label={t("project.team")}
                                    values={field.value || []}
                                    onChange={(newValues) => {
                                        if (user && user.id && !newValues.includes(user.id)) {
                                            newValues.push(user.id);
                                        }
                                        field.onChange(newValues);
                                    }}
                                    options={users}
                                    error={errors.team?.message}
                                    required
                                />
                            )}
                        />
                        <Controller
                            name="join"
                            control={control}
                            render={({ field }) => (
                                <CustomCheckbox
                                    label={t("project.join_content")}
                                    checked={field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                            )}
                        />
                        <div className="pt-2 flex justify-end">
                            <CustomButton className="rounded-full px-6">{t("project.create")}</CustomButton>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default Page;
