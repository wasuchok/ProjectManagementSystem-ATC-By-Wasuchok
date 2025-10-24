"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { MouseEvent, useCallback, useEffect } from "react";
import { FiX } from "react-icons/fi";

interface MinimalModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children?: React.ReactNode;
    width?: string;
}

const MinimalModal: React.FC<MinimalModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    width = "max-w-md",
}) => {
    const handleOverlayClick = useCallback(
        (event: MouseEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget) {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
        } else {
            window.removeEventListener("keydown", handleKeyDown);
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onMouseDown={handleOverlayClick}
                >

                    <motion.div
                        className={`relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-900/10 ${width}`}
                        initial={{ y: 12, opacity: 0.85, scale: 0.97 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 12, opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        onMouseDown={(event) => event.stopPropagation()}
                    >

                        {title && (
                            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                        Modal
                                    </span>
                                    <h2 className="text-lg font-semibold text-slate-800">
                                    {title}
                                </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
                                >
                                    <FiX size={18} />
                                </button>
                            </div>
                        )}


                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {children}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MinimalModal;
