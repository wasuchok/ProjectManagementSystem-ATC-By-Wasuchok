"use client"

import { priorityTypes } from "@/app/config/data"
import { useLanguage } from "@/app/contexts/LanguageContext"
import { useUser } from "@/app/contexts/UserContext"
import { apiPrivate } from "@/app/services/apiPrivate"
import { Controller, useForm } from "react-hook-form"
import { CustomAlert } from "../../CustomAlertModal"
import OptionList from "../../Input/OptionList"
import TextArea from "../../Input/TextArea"
import TextField from "../../Input/TextField"
import MinimalModal from "../../MinimalModal"

const ModalAddTask = ({ open, setOpen, project_id, boards, fetchTaskProject }: any) => {
    const { user }: any = useUser()
    const { t } = useLanguage();
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    }: any = useForm({
        defaultValues: {
            title: "",
            description: "",
            priority: "",
        },
    });

    const onSubmit = async (data: any) => {
        if (!project_id) {
            console.error("Missing project id");
            return;
        }
        try {

            const findIsDefault = boards.find((item: any) => item.isDefault == true)
            const confirm = await CustomAlert({
                type: "confirm",
                title: t("modal.are_you_sure"),
                message: t("modal.do_you_want_to_save_information"),
            });

            if (confirm) {
                const sendData = {
                    "project_id": project_id,
                    "title": data.title,
                    "description": data.description,
                    "status_id": Number(findIsDefault.id),
                    "assigned_to": user.id,
                    "priority": data.priority
                }

                const response = await apiPrivate.post("/project/task/add", sendData)

                if (response.status == 200 || response.status == 201) {
                    await CustomAlert({
                        type: "success",
                        title: t('alert.success'),
                        message: t('alert.alert_success')
                    })
                    reset()
                    fetchTaskProject()
                    setOpen(false)
                }
            }



        } catch (error) {
            console.log(error)
        }
    }

    return (
        <>
            <MinimalModal
                isOpen={open}
                onClose={() => setOpen(false)}
                title={t('project.create_new_task_title')}
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-7 text-sm text-slate-600">
                    <p className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-xs leading-relaxed text-slate-500">
                        {t('project.create_new_task_description')}
                    </p>

                    <div className="w-full rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {t("project.priority")}
                        </span>
                        <Controller
                            name="priority"
                            control={control}
                            rules={{ required: t("please_fill_in_information") }}
                            render={({ field }) => (
                                <OptionList
                                    value={field.value}
                                    onChange={field.onChange}
                                    options={priorityTypes}
                                    error={errors.priority?.message}
                                    required

                                />
                            )}
                        />
                    </div>

                    <div className="grid gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="w-full">
                            <Controller
                                name="title"
                                control={control}
                                rules={{ required: t("please_fill_in_information") }}
                                render={({ field }) => (
                                    <TextField
                                        required
                                        label={t('project.title')}
                                        placeholder={t("please_fill_in_information")}
                                        error={errors.title?.message}
                                        {...field}
                                        className="w-full"
                                    />
                                )}
                            />
                        </div>

                        <div className="w-full">
                            <Controller
                                name="description"
                                control={control}
                                rules={{ required: t("please_fill_in_information") }}
                                render={({ field }) => (
                                    <TextArea
                                        required
                                        label={t('project.description')}
                                        placeholder={t("please_fill_in_information")}
                                        error={errors.description?.message}
                                        {...field}
                                        className="w-full"

                                    />
                                )}
                            />
                        </div>

                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-400">
                            {t('project.create_new_task_note')}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                reset()
                                setOpen(false)
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        >
                            {t('project.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-full border border-primary-500 bg-primary-500 px-5 py-2 text-sm font-semibold text-white transition hover:border-primary-600 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isSubmitting ? "กำลังสร้าง..." : "สร้าง Task"}
                        </button>
                    </div>
                </form>
            </MinimalModal>
        </>
    )
}

export default ModalAddTask
