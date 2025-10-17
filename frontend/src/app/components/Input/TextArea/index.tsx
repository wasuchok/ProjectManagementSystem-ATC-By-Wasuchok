import React, { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export interface TextAreaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    fieldSize?: "sm" | "md" | "lg";
    isLoading?: boolean;
    required?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
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

        // 🎨 สีธีมเดียวกับ OptionList / OptionListMulti
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
            <div className="flex flex-col gap-1 w-full relative group">
                {/* Label */}
                {label && (
                    <label className="text-primary-700 font-medium mb-1">
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}

                {/* Textarea */}
                <div className="relative w-full">
                    <textarea
                        ref={ref}
                        className={twMerge(
                            "w-full rounded-xl border outline-none transition-all duration-200 resize-none",
                            "bg-white text-gray-800 placeholder-gray-400",
                            "focus:ring-2 focus:ring-offset-0 focus:ring-gray-200 focus:border-gray-500",
                            "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
                            sizeClass,
                            className,
                            error
                                ? "border-red-400 focus:ring-red-100 focus:border-red-500"
                                : "border-gray-200 hover:border-gray-400",
                            isLoading ? "pr-10" : ""
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

                {/* Error */}
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

TextArea.displayName = "TextArea";
export default TextArea;
