"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import React, { MouseEvent, useCallback, useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";

interface SlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children?: React.ReactNode;
    width?: string;
}

const SlideOver: React.FC<SlideOverProps> = ({
    isOpen,
    onClose,
    title,
    children,
    width = "max-w-2xl",
}) => {
    const shouldReduceMotion = useReducedMotion();
    const panelRef = useRef<HTMLDivElement | null>(null);

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
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || typeof document === "undefined") return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const timer = window.setTimeout(() => panelRef.current?.focus(), 0);
        return () => window.clearTimeout(timer);
    }, [isOpen]);

    const transition = shouldReduceMotion
        ? { duration: 0 }
        : { duration: 0.18, ease: "easeOut" as const };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                    onMouseDown={handleOverlayClick}
                >
                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        tabIndex={-1}
                        className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-slate-100 bg-white shadow-2xl shadow-slate-900/15 outline-none ${width}`}
                        initial={{ x: 24, opacity: 0.9 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 24, opacity: 0.9 }}
                        transition={transition}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        {title && (
                            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur-sm">
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                                        Details
                                    </span>
                                    <h2 className="text-lg font-semibold text-slate-800">
                                        {title}
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
                                    aria-label="Close"
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

export default SlideOver;

