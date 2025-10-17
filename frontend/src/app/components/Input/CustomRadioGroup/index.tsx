import React from "react";
import { twMerge } from "tailwind-merge";

interface Option {
    label: string;
    value: string;
    icon?: React.ReactNode;
}

interface CustomRadioGroupProps {
    name: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    variant?: "primary" | "secondary" | "danger";
    className?: string;
    direction?: "row" | "column";
    required?: boolean;
    register?: ReturnType<any> | undefined;
    isLoading?: boolean;
}

const CustomRadioGroup: React.FC<CustomRadioGroupProps> = ({
    name,
    options,
    value,
    onChange,
    variant = "primary",
    className = "",
    direction = "column",
    required = false,
    register,
    isLoading = false,
}) => {
    const accentClass = {
        primary: "accent-primary-600",
        secondary: "accent-secondary-600",
        danger: "accent-red-600",
    }[variant];

    return (
        <div
            className={twMerge(
                direction === "row"
                    ? "flex flex-row gap-3"
                    : "flex flex-col gap-2",
                className
            )}
        >
            {isLoading ? (
                <div className="flex items-center gap-2 text-primary-600">
                    <svg
                        className="animate-spin h-5 w-5 text-primary-500"
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
                    <p className="text-sm font-medium">กำลังโหลด...</p>
                </div>
            ) : (
                options.map((option) => (
                    <label
                        key={option.value}
                        className="flex items-center gap-2 rounded-md border border-gray-200 p-2 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={value === option.value}
                            onChange={() => onChange(option.value)}
                            required={required}
                            {...(register ? register(name, { required }) : {})}
                            className={twMerge(
                                "form-radio h-5 w-5 transition-colors duration-150",
                                accentClass
                            )}
                        />
                        {option.icon && (
                            <span className="text-xl">{option.icon}</span>
                        )}
                        <span className="text-sm font-medium text-gray-700">
                            {option.label}
                        </span>
                    </label>
                ))
            )}
        </div>
    );
};

export default CustomRadioGroup;