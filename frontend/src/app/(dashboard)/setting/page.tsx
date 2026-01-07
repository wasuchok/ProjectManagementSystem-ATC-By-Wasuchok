"use client";

import { CustomAlert } from "@/app/components/CustomAlertModal";
import { CustomButton } from "@/app/components/Input/CustomButton";
import MinimalModal from "@/app/components/MinimalModal";
import { CONFIG } from "@/app/config";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { FiSave, FiSettings, FiUpload } from "react-icons/fi";

const SettingPage = () => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    // System Settings State
    const [systemSettings, setSystemSettings] = useState<{ logo_url?: string }>({});
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [cropOpen, setCropOpen] = useState(false);
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const [cropZoom, setCropZoom] = useState(1);
    const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
        width: number;
        height: number;
        x: number;
        y: number;
    } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await apiPrivate.get('/settings');
            if (res.data) {
                setSystemSettings(res.data);
                if (res.data.logo_url) {
                    const url = res.data.logo_url.startsWith('/') ? res.data.logo_url.slice(1) : res.data.logo_url;
                    setPreviewUrl(`${CONFIG.imageApi}${url}`);
                }
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            const url = URL.createObjectURL(file);
            setCropSrc(url);
            setCropZoom(1);
            setCrop({ x: 0, y: 0 });
            setCropOpen(true);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const confirm = await CustomAlert({
                type: "confirm",
                title: t("alert.are_you_sure"),
                message: t("modal.do_you_want_to_save_information"),
            });
            if (!confirm) {
                setLoading(false);
                return;
            }
            // 1. Upload Logo if changed
            if (logoFile) {
                const formData = new FormData();
                formData.append('file', logoFile);
                await apiPrivate.post('/settings/logo', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            // Refresh settings
            await fetchSettings();
            await CustomAlert({
                type: "success",
                title: t("alert.success"),
                message: t("settings.update_success"),
            });
        } catch (error) {
            console.error("Failed to save settings", error);
            await CustomAlert({
                type: "error",
                title: t("alert.error"),
                message: t("alert.alert_error"),
            });
        } finally {
            setLoading(false);
        }
    };

    const confirmCrop = async () => {
        if (!cropSrc) {
            if (logoFile) {
                const obj = URL.createObjectURL(logoFile);
                setPreviewUrl(obj);
            }
            setCropOpen(false);
            return;
        }

        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = (err) => reject(err);
            i.src = cropSrc!;
        });

        const canvasSize = 512;
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingQuality = 'high';
        if (!croppedAreaPixels) return;
        const { x, y, width, height } = croppedAreaPixels;
        ctx.drawImage(image, x, y, width, height, 0, 0, canvasSize, canvasSize);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
        if (!blob) {
            setCropOpen(false);
            return;
        }
        const file = new File([blob], 'logo_cropped.png', { type: 'image/png' });
        setLogoFile(file);
        const objUrl = URL.createObjectURL(blob);
        setPreviewUrl(objUrl);

        if (cropSrc) URL.revokeObjectURL(cropSrc);
        setCropSrc(null);
        setCropOpen(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="mx-auto max-w-5xl space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                >
                    <h1 className="text-3xl font-bold text-slate-800">{t("settings.title")}</h1>
                    <p className="text-slate-500">{t("settings.subtitle")}</p>
                </motion.div>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Left: Preview Card */}
                    <motion.section
                        id="system"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                        <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                                <FiSettings size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">{t("settings.system_config")}</h2>
                                <p className="text-sm text-slate-500">{t("settings.system_config_desc")}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-700">{t("settings.system_logo")}</label>
                            <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Logo Preview" className="h-full w-full object-contain p-4" />
                                ) : (
                                    <span className="text-xs text-slate-400">เลือกรูปเพื่อดูตัวอย่าง</span>
                                )}
                            </div>
                        </div>
                    </motion.section>

                    {/* Right: Actions */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                        <div className="space-y-3">
                            <input
                                type="file"
                                accept="image/*"
                                id="logo-upload"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <label
                                htmlFor="logo-upload"
                                className="inline-flex w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                                {previewUrl || cropSrc ? (
                                    <img src={previewUrl ?? cropSrc ?? undefined} alt="Preview" className="h-6 w-6 rounded-lg object-cover" />
                                ) : null}
                                <FiUpload />
                                {t("settings.upload_logo")}
                            </label>
                            <p className="text-xs text-slate-500">Recommended: 512x512px PNG or JPG</p>

                            <div className="pt-2">
                                <CustomButton
                                    variant="primary"
                                    className="min-w-[140px]"
                                    onClick={handleSave}
                                    disabled={loading || !logoFile}
                                    icon={<FiSave />}
                                >
                                    {loading ? "Saving..." : t("settings.save_changes")}
                                </CustomButton>
                            </div>
                        </div>
                    </motion.section>
                </div>
            </div>

            {/* Crop Modal */}
            <MinimalModal
                isOpen={cropOpen}
                onClose={() => {
                    setCropOpen(false);
                    if (cropSrc) {
                        URL.revokeObjectURL(cropSrc);
                        setCropSrc(null);
                    }
                }}
                title={t("settings.system_logo")}
                width="480px"
            >
                <div className="space-y-4">
                    <div className="relative mx-auto h-64 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        {cropSrc && (
                            <Cropper
                                image={cropSrc}
                                crop={crop}
                                zoom={cropZoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onZoomChange={setCropZoom}
                                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                                restrictPosition
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">Zoom</span>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.01}
                            value={cropZoom}
                            onChange={(e) => setCropZoom(Number(e.target.value))}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <CustomButton variant="outline" onClick={() => setCropOpen(false)}>
                            {t("cancel") ?? "ยกเลิก"}
                        </CustomButton>
                        <CustomButton variant="primary" onClick={confirmCrop}>
                            {t("settings.save_changes")}
                        </CustomButton>
                    </div>
                </div>
            </MinimalModal>
        </div>
    );
};

export default SettingPage;
