"use client";

import { AnimatePresence, motion } from "framer-motion";
import React from "react";
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
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >

                    <motion.div
                        className={`bg-white rounded-2xl shadow-xl ${width} w-full max-h-[90vh] flex flex-col relative overflow-hidden`}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >

                        {title && (
                            <div className="flex justify-between items-center border-b border-gray-100 px-5 py-3 flex-shrink-0">
                                <h2 className="text-lg font-semibold text-gray-800">
                                    {title}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
                                >
                                    <FiX size={18} />
                                </button>
                            </div>
                        )}


                        <div className="flex-1 overflow-y-auto p-5">
                            {children}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MinimalModal;