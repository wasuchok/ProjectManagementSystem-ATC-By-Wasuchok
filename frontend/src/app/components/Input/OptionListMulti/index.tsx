"use client";

import dynamic from "next/dynamic";

const ReactSelect = dynamic(() => import("react-select"), { ssr: false });

interface OptionListMultiProps {
    label?: string;
    values: string[];
    options: { label: string; value: string }[];
    onChange: (vals: string[]) => void;
    placeholder?: string;
    required?: boolean;
    isLoading?: boolean;
    isEditLoading?: boolean;
    error?: string;
}

export default function OptionListMulti({
    label,
    values,
    options,
    onChange,
    placeholder = "เลือก...",
    required = false,
    isLoading = false,
    isEditLoading = false,
    error,
}: OptionListMultiProps) {
    const selectedOptions = options.filter((opt) => values.includes(opt.value));
    const isActuallyLoading = isLoading || isEditLoading;

    // 🎨 palette อ้างอิงจากสีที่คุณให้มา
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
        <div className="flex flex-col gap-1 relative">
            {/* Label */}
            {label && (
                <label className="text-primary-700 font-medium mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            {/* Select */}
            <div className="relative">
                <ReactSelect
                    isMulti
                    options={options}
                    value={selectedOptions}
                    onChange={(selected: any) =>
                        onChange(selected ? selected.map((s: any) => s.value) : [])
                    }
                    placeholder={placeholder}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                        control: (provided: any, state: any) => ({
                            ...provided,
                            borderRadius: "0.75rem",
                            borderColor: error
                                ? "#f87171" // error red
                                : state.isFocused
                                    ? colors[600] // main accent-gray
                                    : colors[200], // neutral border
                            backgroundColor: state.isDisabled ? colors[100] : "white",
                            minHeight: "2.75rem",
                            padding: "0.1rem 0.25rem",
                            boxShadow: state.isFocused ? `0 0 0 2px ${colors[300]}` : "none",
                            transition: "all 0.2s ease",
                            "&:hover": {
                                borderColor: error ? "#f87171" : colors[600],
                            },
                        }),
                        multiValue: (provided: any) => ({
                            ...provided,
                            backgroundColor: colors[100],
                            borderRadius: "0.4rem",
                        }),
                        multiValueLabel: (provided: any) => ({
                            ...provided,
                            color: colors[700],
                            fontWeight: 500,
                        }),
                        multiValueRemove: (provided: any) => ({
                            ...provided,
                            color: colors[700],
                            "&:hover": {
                                backgroundColor: colors[600],
                                color: "white",
                            },
                        }),
                        placeholder: (provided: any) => ({
                            ...provided,
                            color: colors[400],
                        }),
                        dropdownIndicator: (provided: any, state: any) => ({
                            ...provided,
                            color: state.isFocused ? colors[600] : colors[400],
                            "&:hover": { color: colors[600] },
                        }),
                        indicatorSeparator: (provided: any) => ({
                            ...provided,
                            backgroundColor: colors[200],
                        }),
                        menu: (provided: any) => ({
                            ...provided,
                            backgroundColor: "white",
                            borderRadius: "0.75rem",
                            boxShadow: `0 2px 8px ${colors[200]}`,
                            overflow: "hidden",
                        }),
                        option: (provided: any, state: any) => ({
                            ...provided,
                            backgroundColor: state.isSelected
                                ? colors[200]
                                : state.isFocused
                                    ? colors[100]
                                    : "white",
                            color: colors[800],
                            "&:active": {
                                backgroundColor: colors[300],
                            },
                        }),
                    }}
                    theme={(theme: any) => ({
                        ...theme,
                        colors: {
                            ...theme.colors,
                            primary: colors[600],
                            primary25: colors[200],
                            primary50: colors[300],
                            neutral0: "white",
                            neutral20: colors[200],
                            neutral30: colors[600],
                        },
                    })}
                    isDisabled={isLoading}
                />

                {/* Loading spinner */}
                {isActuallyLoading && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                        <svg
                            className="animate-spin h-4 w-4 text-primary-600"
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
