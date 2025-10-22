"use client";

import { AnimatePresence, motion } from "framer-motion";
import ReactDOM from "react-dom/client";
import {
    FaCheck,
    FaExclamation,
    FaInfo,
    FaTimes,
} from "react-icons/fa";

type AlertType = "info" | "success" | "error" | "confirm" | "loading";

interface AlertOptions {
    type?: AlertType;
    title: string;
    message?: string;
}

export function CustomAlert({ type = "info", title, message }: AlertOptions): Promise<boolean> {
    return new Promise((resolve) => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const root = ReactDOM.createRoot(container);

        const handleClose = (result: boolean) => {
            root.unmount();
            container.remove();
            resolve(result);
        };

        const colors = {
            info: "from-blue-100 to-blue-200 text-blue-600",
            success: "from-green-100 to-green-200 text-green-600",
            error: "from-red-100 to-red-200 text-red-600",
            confirm: "from-yellow-100 to-yellow-200 text-yellow-600",
            loading: "from-gray-100 to-gray-200 text-gray-500",
        };

        const icons = {
            info: <FaInfo className="w-10 h-10" />,
            success: <FaCheck className="w-10 h-10" />,
            error: <FaTimes className="w-10 h-10" />,
            confirm: <FaExclamation className="w-10 h-10" />,
            loading: (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                    }}
                    className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full"
                />
            ),
        };

        root.render(
            <AnimatePresence>
                <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="bg-white rounded-2xl shadow-xl w-[90%] max-w-md p-10 text-center relative"
                    >
                        <motion.div
                            animate={
                                type === "loading"
                                    ? undefined
                                    : {
                                        scale: [1, 1.08, 1],
                                        rotate: [0, 3, -3, 0],
                                    }
                            }
                            transition={{
                                duration: 2.2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            className={`w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-b ${colors[type]} flex items-center justify-center shadow-inner`}
                        >
                            {icons[type]}
                        </motion.div>

                        <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
                        {message && (
                            <p className="text-gray-500 mt-3 text-base leading-relaxed">
                                {message}
                            </p>
                        )}

                        {type !== "loading" && (
                            <div className="mt-8 flex justify-center gap-3">
                                {type === "confirm" ? (
                                    <>
                                        <button
                                            onClick={() => handleClose(false)}
                                            className="px-6 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all duration-200"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            onClick={() => handleClose(true)}
                                            className="px-6 py-2.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-medium shadow-sm transition-all duration-200"
                                        >
                                            ยืนยัน
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleClose(true)}
                                        className={`px-8 py-2.5 rounded-lg text-white font-medium shadow-sm transition-all duration-200 ${type === "success"
                                            ? "bg-green-500 hover:bg-green-600"
                                            : type === "error"
                                                ? "bg-red-500 hover:bg-red-600"
                                                : "bg-blue-500 hover:bg-blue-600"
                                            }`}
                                    >
                                        ตกลง
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            </AnimatePresence>
        );
    });
}
