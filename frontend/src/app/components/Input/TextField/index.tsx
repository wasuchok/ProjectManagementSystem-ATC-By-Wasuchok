import React, { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export interface TextFieldProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fieldSize?: "sm" | "md" | "lg";
    isLoading?: boolean;
    required?: boolean;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
    (
        {
            label,
            error,
            fieldSize = "md",
            className,
            isLoading = false,
            required = false,
            ...props
        },
        ref
    ) => {
        const sizeClass =
            fieldSize === "sm"
                ? "text-sm px-3 py-2"
                : fieldSize === "lg"
                    ? "text-lg px-6 py-4"
                    : "text-base px-4 py-3";

        // 🎨 ใช้ชุดสีเดียวกับ OptionList / TextArea
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
            <div className="flex flex-col gap-2 w-full relative group">
                {/* Label */}
                {label && (
                    <label
                        className={twMerge(
                            "text-primary-700 font-medium text-sm transition-all duration-200 group-focus-within:text-gray-800 group-focus-within:translate-y-[-2px]",
                            fieldSize === "sm" && "text-xs"
                        )}
                    >
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}

                {/* Input */}
                <div className="relative w-full">
                    <input
                        ref={ref}
                        className={twMerge(
                            "w-full rounded-xl border outline-none transition-all duration-200 placeholder:text-gray-400",
                            "bg-white text-gray-800",
                            "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
                            error
                                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-100"
                                : "border-gray-200 hover:border-gray-400 focus:border-gray-600 focus:ring-2 focus:ring-gray-200",
                            sizeClass,
                            className,
                            isLoading ? "pr-12" : ""
                        )}
                        {...props}
                        disabled={props.disabled || isLoading}
                    />

                    {/* Loading Spinner */}
                    {isLoading && (
                        <div className="absolute inset-y-0 right-3 flex items-center">
                            <svg
                                className="animate-spin h-4 w-4 text-gray-600"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                ></path>
                            </svg>
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <span className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                        </svg>
                        {error}
                    </span>
                )}
            </div>
        );
    }
);

TextField.displayName = "TextField";
export default TextField;
