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
import Lottie from "lottie-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import ProjectManagement from "../../../../../public/Comacon - planning.json";
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
                    label: `${item.username} ${item.sect}`,
                    value: item.user_id,
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
            <div className="flex lg:flex-row flex-col-reverse gap-5">
                <div className="flex flex-col">
                    <div className="mb-5">
                        <h1 className="text-2xl font-semibold">
                            {t("project.create_title")}
                        </h1>
                        <p className="text-lg">{t("project.create_content")}</p>
                        <hr />
                    </div>

                    <div className="flex flex-col gap-3">
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
                    </div>

                    <div className="my-2 flex justify-end">
                        <CustomButton>{t("project.create")}</CustomButton>
                    </div>
                </div>

                <div className="lg:w-1/2">
                    <Lottie animationData={ProjectManagement} loop autoplay />
                </div>
            </div>
        </form>
    );
};

export default Page;
