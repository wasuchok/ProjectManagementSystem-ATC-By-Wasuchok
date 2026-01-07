"use client"

import { priorityTypes } from "@/app/config/data"
import { useLanguage } from "@/app/contexts/LanguageContext"
import { useUser } from "@/app/contexts/UserContext"
import { apiPrivate } from "@/app/services/apiPrivate"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { CustomAlert } from "../../CustomAlertModal"
import OptionList from "../../Input/OptionList"
import TextArea from "../../Input/TextArea"
import TextField from "../../Input/TextField"
import MinimalModal from "../../MinimalModal"

const ModalAddTask = ({ open, setOpen, project_id, boards, fetchTaskProject }: any) => {
    const { user }: any = useUser()
    const { t, lang } = useLanguage();
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

    const [suggestions, setSuggestions] = useState<Array<{ userId: string; name: string; active: number; late: number; avgProgress: number; score: number; reason: string }>>([])
    const [isLoadingSuggest, setIsLoadingSuggest] = useState(false)
    const [suggestError, setSuggestError] = useState<string | null>(null)
    const [selectedAssignee, setSelectedAssignee] = useState<{ userId: string; name: string } | null>(null)
    const [activeTab, setActiveTab] = useState<'form' | 'suggest'>('form')

    useEffect(() => {
        if (activeTab === 'suggest') {
            fetchSuggestions()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])

    const fetchSuggestions = async () => {
        if (!project_id) return;
        setIsLoadingSuggest(true)
        setSuggestError(null)
        try {
            const res = await apiPrivate.get(`/project/${project_id}/auto-assign`)
            if (res.status === 200 || res.status === 201) {
                const rows = Array.isArray(res.data?.data) ? res.data.data : []
                setSuggestions(rows)
                if (rows.length > 0) setSelectedAssignee({ userId: rows[0].userId, name: rows[0].name })
            } else {
                setSuggestions([])
                setSuggestError('ไม่สามารถแนะนำผู้รับงานได้')
            }
        } catch (e) {
            setSuggestError('ไม่สามารถแนะนำผู้รับงานได้')
            setSuggestions([])
        } finally {
            setIsLoadingSuggest(false)
        }
    }

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
                    "assigned_to": selectedAssignee?.userId ?? user.id,
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
                    setSelectedAssignee(null)
                    setSuggestions([])
                    fetchTaskProject()
                    setOpen(false)
                }
            }



        } catch (error) {
            console.log(error)
        }
    }

    const titleLabel = lang === "TH" ? "หัวข้องาน" : t("project.title")
    const titlePlaceholder =
        lang === "TH"
            ? "เช่น ปรับดีไซน์หน้าแดชบอร์ด, ออกแบบใบเสนอราคาใหม่"
            : t("please_fill_in_information")
    const descriptionPlaceholder =
        lang === "TH"
            ? "สรุปขอบเขต เป้าหมาย และรายละเอียดงานให้ทีมเข้าใจตรงกัน"
            : t("please_fill_in_information")
    const submitLabel = isSubmitting
        ? lang === "TH"
            ? "กำลังสร้าง..."
            : "Creating..."
        : lang === "TH"
            ? "สร้างงาน"
            : "Create task"

    return (
        <>
            <MinimalModal
                isOpen={open}
                onClose={() => {
                    setOpen(false)
                    setActiveTab('form')
                }}
                title={t('project.create_new_task_title')}
            >
                <div className="mb-4 inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm text-xs font-semibold">
                    <button type="button" onClick={() => setActiveTab('form')} className={`rounded-full px-3 py-1 ${activeTab === 'form' ? 'bg-primary-600 text-white shadow' : 'text-slate-600 hover:text-primary-600'}`}>ฟอร์มสร้างงาน</button>
                    <button type="button" onClick={() => setActiveTab('suggest')} className={`rounded-full px-3 py-1 ${activeTab === 'suggest' ? 'bg-primary-600 text-white shadow' : 'text-slate-600 hover:text-primary-600'}`}>แนะนำผู้รับงาน</button>
                </div>

                {activeTab === 'form' && (
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
                            <div className="mt-4 text-xs text-slate-500">ผู้รับผิดชอบปัจจุบัน: <span className="font-semibold text-slate-700">{selectedAssignee?.name ?? 'ตัวเอง'}</span> (ไปที่แท็บ “แนะนำผู้รับงาน” เพื่อเปลี่ยน)</div>
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
                                            label={titleLabel}
                                            placeholder={titlePlaceholder}
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
                                            placeholder={descriptionPlaceholder}
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
                                    setActiveTab('form')
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
                                {submitLabel}
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'suggest' && (
                    <div className="space-y-4 text-sm text-slate-600">
                        <p className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-xs leading-relaxed text-slate-500">ระบบจะประเมินงานค้าง งานช้า และเปอร์เซ็นต์เฉลี่ย เพื่อแนะนำผู้ที่เหมาะสมกับงานใหม่</p>
                        {suggestError && <div className="text-xs font-semibold text-rose-500">{suggestError}</div>}
                        <div className="flex flex-col gap-2">
                            {isLoadingSuggest ? (
                                <div className="text-xs text-slate-500">กำลังโหลดคำแนะนำ...</div>
                            ) : suggestions.length === 0 ? (
                                <div className="text-xs text-slate-500">ยังไม่มีคำแนะนำ</div>
                            ) : (
                                suggestions.map((s, idx) => (
                                    <div key={s.userId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">{idx + 1}</span>
                                            <div className="min-w-0">
                                                <div className="truncate font-semibold text-slate-700">{s.name}</div>
                                                <div className="text-[11px] text-slate-500">{s.reason}</div>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setSelectedAssignee({ userId: s.userId, name: s.name })} className="rounded-full bg-primary-600 px-3 py-1 text-[11px] font-semibold text-white">Assign</button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="flex justify-end">
                            <button type="button" onClick={() => setActiveTab('form')} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">กลับไปฟอร์ม</button>
                        </div>
                    </div>
                )}
            </MinimalModal>
        </>
    )
}

export default ModalAddTask
