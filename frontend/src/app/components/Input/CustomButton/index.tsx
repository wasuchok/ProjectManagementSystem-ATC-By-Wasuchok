import React from "react";
import { twMerge } from "tailwind-merge";

interface CustomButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger";
    size?: "sm" | "md" | "lg";
    icon?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export const CustomButton = ({
    variant = "primary",
    size = "md",
    icon,
    children,
    className = "",
    disabled,
    ...rest
}: CustomButtonProps) => {
    let base =
        "inline-flex items-center justify-center gap-2 px-6 py-2 rounded-xl font-semibold transition-all focus:outline-none shadow";

    let sizeClass = "";
    switch (size) {
        case "sm":
            sizeClass = "px-2 py-1 text-sm";
            break;
        case "md":
            sizeClass = "px-6 py-2";
            break;
        case "lg":
            sizeClass = "px-8 py-3 text-lg";
            break;
    }

    let variantClass = "";
    switch (variant) {
        case "primary":
            variantClass = "bg-primary-600 text-white hover:bg-primary-700";
            break;
        case "secondary":
            variantClass =
                "bg-secondary-100 text-secondary-800 hover:bg-secondary-200 border border-secondary-300";
            break;
        case "danger":
            variantClass = "bg-red-600 text-white hover:bg-red-700";
            break;
    }

    let disabledClass = disabled
        ? "opacity-50 pointer-events-none"
        : "hover:opacity-90";

    return (
        <button
            className={twMerge(
                base,
                variantClass,
                sizeClass,
                className,
                disabledClass
            )}
            {...rest}
        >
            {icon}
            {children}
        </button>
    );
};