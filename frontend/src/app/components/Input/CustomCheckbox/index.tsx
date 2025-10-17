"use client";

import React, { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export interface InputCheckboxProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    required?: boolean;
}

const CustomCheckbox = forwardRef<HTMLInputElement, InputCheckboxProps>(
    ({ label, error, required = false, className, ...props }, ref) => {

        const colors = {
            50: "#fafafa",
            100: "#f4f4f5",
            200: "#e4e4e7",
            300: "#d4d4d8",
            400: "#a1a1aa",
            500: "#71717a",
            600: "#52525b",
            700: "#3f3f46",
            800: "#27272a",
            900: "#18181b",
        };

        return (
            <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 cursor-pointer group">

                    <div className="relative flex items-center">
                        <input
                            ref={ref}
                            type="checkbox"
                            className={twMerge(
                                "peer appearance-none w-5 h-5 border rounded-md transition-all duration-200",
                                "border-gray-300 bg-white checked:bg-gray-700 checked:border-gray-700",
                                "hover:border-gray-500 focus:ring-2 focus:ring-gray-200 focus:outline-none",
                                "disabled:bg-gray-100 disabled:border-gray-200 disabled:cursor-not-allowed",
                                className
                            )}
                            {...props}
                        />
                        {/* Checkmark */}
                        <svg
                            className="absolute hidden w-3 h-3 text-white pointer-events-none left-1 top-1 peer-checked:block"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="3"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>

                    {/* Label */}
                    {label && (
                        <span
                            className={twMerge(
                                "text-gray-700 select-none",
                                props.disabled && "text-gray-400"
                            )}
                        >
                            {label}
                            {required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                    )}
                </label>

                {/* Error */}
                {error && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                        </svg>
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

CustomCheckbox.displayName = "CustomCheckbox";
export default CustomCheckbox;
