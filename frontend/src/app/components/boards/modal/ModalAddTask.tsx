"use client"

import { priorityTypes } from "@/app/config/data"
import { useLanguage } from "@/app/contexts/LanguageContext"
import { useUser } from "@/app/contexts/UserContext"
import { apiPrivate } from "@/app/services/apiPrivate"
import { Controller, useForm } from "react-hook-form"
import OptionList from "../../Input/OptionList"
import TextArea from "../../Input/TextArea"
import TextField from "../../Input/TextField"
import MinimalModal from "../../MinimalModal"

const ModalAddTask = ({ open, setOpen, project_id, boards }: any) => {
    const { user }: any = useUser()
    const { t } = useLanguage();
    const {
        control,
        handleSubmit,
        formState: { errors },
    }: any = useForm({
        defaultValues: {
            title: "",
            description: "",
            priority: "",
        },
    });

    const onSubmit = async (data: any) => {
        try {

            const findIsDefault = boards.find((item: any) => item.isDefault == true)
            const sendData = {
                "project_id": project_id,
                "title": data.title,
                "description": data.description,
                "status_id": Number(findIsDefault.id),
                "assigned_to": user.id,
                "priority": data.priority
            }

            const response = await apiPrivate.post("/project/task/add", sendData)

            console.log(response.data)

        } catch (error) {
            console.log(error)
        }
    }

    return (
        <>
            <MinimalModal
                isOpen={open}
                onClose={() => setOpen(false)}
                title="สร้าง Task"
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    <div className="w-full">
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
                    </div>

                    <div className="w-full">
                        <Controller
                            name="title"
                            control={control}
                            rules={{ required: t("please_fill_in_information") }}
                            render={({ field }) => (
                                <TextField
                                    required
                                    label="ชื่อหัวข้อ"
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
                                    label="รายละเอียด"
                                    placeholder={t("please_fill_in_information")}
                                    error={errors.description?.message}
                                    {...field}
                                    className="w-full"

                                />
                            )}
                        />
                    </div>


                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            สร้าง Task
                        </button>
                    </div>
                </form>
            </MinimalModal>
        </>
    )
}

export default ModalAddTask