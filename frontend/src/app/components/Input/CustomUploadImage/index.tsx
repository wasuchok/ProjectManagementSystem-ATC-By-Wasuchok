import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FiTrash2, FiUpload } from "react-icons/fi";
import { twMerge } from "tailwind-merge";

interface CustomUploadImageProps {
    onFileChange: (file: File | null) => void;
    className?: string;
    variant?: "primary" | "secondary" | "danger";
    error?: string;
    defaultImageUrl?: string;
    isLoading?: boolean;
}

const CustomUploadImage: React.FC<CustomUploadImageProps> = ({
    onFileChange,
    className = "",
    variant = "primary",
    error,
    defaultImageUrl,
    isLoading = false,
}) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (defaultImageUrl) {
            setPreviewUrl(defaultImageUrl);
        }
    }, [defaultImageUrl]);

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles && acceptedFiles.length > 0) {
                const file = acceptedFiles[0];
                setPreviewUrl(URL.createObjectURL(file));
                onFileChange(file);
            }
        },
        [onFileChange]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "image/*": [] },
        multiple: false,
    });

    const colorClass = {
        primary: "border-primary-600 hover:bg-primary-50",
        secondary: "border-secondary-600 hover:bg-secondary-50",
        danger: "border-red-600 hover:bg-red-50",
    }[variant];

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreviewUrl(null);
        onFileChange(null);
    };

    return (
        <div className="flex flex-col gap-1">
            <div
                {...getRootProps()}
                className={twMerge(
                    "relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors",
                    isDragActive ? colorClass : "border-gray-300 hover:bg-gray-50",
                    error ? "border-red-500" : "",
                    className
                )}
            >
                <input {...getInputProps()} />


                {isLoading ? (
                    <div className="flex flex-col items-center gap-2 text-primary-600">
                        <svg
                            className="animate-spin h-8 w-8 text-primary-500"
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
                ) : previewUrl ? (
                    <div className="relative group">
                        <img
                            src={previewUrl}
                            alt="รูปภาพตัวอย่าง"
                            className="max-h-40 rounded-md object-contain"
                        />
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-1 right-1 rounded-full bg-red-600 p-1 text-white hover:bg-red-700 transition-opacity opacity-0 group-hover:opacity-100"
                        >
                            <FiTrash2 size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                        <div className="bg-gray-100 p-3 rounded-full">
                            <FiUpload size={24} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">
                            ลากไฟล์รูปภาพมาวางที่นี่
                        </p>
                        <span className="text-xs text-gray-400">หรือ</span>
                        <button
                            type="button"
                            className={twMerge(
                                "mt-1 inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                variant === "primary"
                                    ? "bg-primary-100 text-primary-700 hover:bg-primary-200"
                                    : variant === "secondary"
                                        ? "bg-secondary-100 text-secondary-700 hover:bg-secondary-200"
                                        : "bg-red-100 text-red-700 hover:bg-red-200"
                            )}
                        >
                            เลือกรูปภาพ
                        </button>
                    </div>
                )}
            </div>
            {error && (
                <p className="text-xs text-red-500 font-medium mt-1">{error}</p>
            )}
        </div>
    );
};

export default CustomUploadImage;