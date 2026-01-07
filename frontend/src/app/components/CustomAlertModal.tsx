"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import {
    FaCheck,
    FaExclamation,
    FaInfo,
    FaTimes,
} from "react-icons/fa";
import { FiX } from "react-icons/fi";

type AlertType = "info" | "success" | "error" | "confirm" | "loading" | "warning";

interface AlertOptions {
    type?: AlertType;
    title: string;
    message?: string;
    showCancelButton?: boolean;
    confirmButtonText?: string;
    cancelButtonText?: string;
}

const themeMap: Record<AlertType, { accent: string; icon: ReactNode; header: string }> = {
    info: {
        accent: "border-blue-400 bg-blue-50 text-blue-900",
        icon: <FaInfo className="w-6 h-6" />,
        header: "ประกาศ",
    },
    success: {
        accent: "border-emerald-400 bg-emerald-50 text-emerald-900",
        icon: <FaCheck className="w-6 h-6" />,
        header: "เสร็จสิ้น",
    },
    error: {
        accent: "border-rose-400 bg-rose-50 text-rose-900",
        icon: <FaTimes className="w-6 h-6" />,
        header: "ข้อผิดพลาด",
    },
    confirm: {
        accent: "border-amber-400 bg-amber-50 text-amber-900",
        icon: <FaExclamation className="w-6 h-6" />,
        header: "โปรดยืนยัน",
    },
    warning: {
        accent: "border-orange-400 bg-orange-50 text-orange-900",
        icon: <FaExclamation className="w-6 h-6" />,
        header: "คำเตือน",
    },
    loading: {
        accent: "border-slate-300 bg-white text-slate-700",
        icon: (
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        ),
        header: "กำลังดำเนินการ",
    },
};

export function CustomAlert({
    type = "info",
    title,
    message,
    showCancelButton,
    confirmButtonText,
    cancelButtonText
}: AlertOptions): Promise<boolean> {
    return new Promise((resolve) => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const root = ReactDOM.createRoot(container);

        const handleClose = (result: boolean) => {
            root.unmount();
            container.remove();
            resolve(result);
        };

        const currentTheme = themeMap[type] ?? themeMap.info;

        if (!themeMap[type]) {
            console.warn(`[CustomAlert] Warning: Unknown alert type "${type}". Falling back to "info".`);
        }

        root.render(
            <AnimatePresence>
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="relative w-[min(92vw,420px)] rounded-[30px] border border-slate-200 bg-white shadow-[0_25px_40px_rgba(15,23,42,0.12)]"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ type: "spring", stiffness: 210, damping: 20 }}
                    >
                        <button
                            onClick={() => handleClose(type === "confirm" || type === "warning" || showCancelButton ? false : true)}
                            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                            aria-label="Close alert"
                        >
                            <FiX className="h-5 w-5" />
                        </button>
                        <div className={`flex items-center gap-4 border-b border-slate-200 px-6 py-5 ${currentTheme.accent}`}>
                            <span className="rounded-full bg-white p-2 text-lg shadow-sm">
                                {currentTheme.icon}
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.5em] text-slate-500">
                                    PMS
                                </p>
                                <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em]">
                                    {currentTheme.header}
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-6 text-left">
                            <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
                            {message && (
                                <p className="text-slate-600 mt-3 leading-relaxed">
                                    {message}
                                </p>
                            )}
                            <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                        </div>
                        {type !== "loading" && (
                            <div className="flex flex-col gap-3 px-6 pb-6">
                                {type === "confirm" || type === "warning" || showCancelButton ? (
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => handleClose(false)}
                                            className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-none"
                                        >
                                            {cancelButtonText || "ย้อนกลับ"}
                                        </button>
                                        <button
                                            onClick={() => handleClose(true)}
                                            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-none ${type === "warning" || type === "error" ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800"}`}
                                        >
                                            {confirmButtonText || "ยืนยัน"}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleClose(true)}
                                        className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-none"
                                    >
                                        {confirmButtonText || "ปิดข้อความ"}
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    });
}
