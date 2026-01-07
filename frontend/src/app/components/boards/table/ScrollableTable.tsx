import LoadingSpinner from '@/app/components/LoadingSpinner';
import { useLanguage } from '@/app/contexts/LanguageContext';
import React from 'react';
import { FiEye, FiInbox, FiTrash } from 'react-icons/fi';
import { twMerge } from 'tailwind-merge';

export interface Column<T> {
    header: string;
    accessor: keyof T;
    width?: string;
    render?: (value: any, row?: T) => React.ReactNode;
}

interface ScrollableTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    className?: string;
    itemsPerPage?: number;
    onEdit?: (row: T) => void;
    onDelete?: (row: T) => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function ScrollableTable<T>({
    columns,
    data,
    loading = false,
    className = '',
    onEdit,
    onDelete,
    currentPage,
    totalPages,
    onPageChange,
}: ScrollableTableProps<T>) {
    const { t } = useLanguage();

    const generatePageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    return (
        <div className={twMerge('w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden', className)}>

            {/* Table Container */}
            <div className="relative overflow-x-auto">
                <table className="min-w-[720px] md:min-w-full divide-y divide-gray-100">
                    <thead className="bg-white sticky top-0 z-10 border-b border-gray-100">
                        <tr>
                            {columns.map((column, index) => (
                                <th
                                    key={index}
                                    className="px-3 md:px-6 py-3 md:py-4 text-left text-[11px] md:text-xs font-semibold text-gray-600 uppercase tracking-wide"
                                    style={{ width: column.width }}
                                >
                                    {column.header}
                                </th>
                            ))}
                            <th className="px-3 md:px-6 py-3 md:py-4 text-center text-[11px] md:text-xs font-semibold text-gray-600 uppercase tracking-wide min-w-[100px]">
                                {t('table.action')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="py-12 text-center">
                                    <LoadingSpinner size={32} color="#3b82f6" />
                                    <p className="mt-2 text-sm text-gray-500">{t('loading_data')}</p>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="py-12 text-center ">
                                    <div className="text-gray-400 flex flex-col items-center">
                                        <FiInbox className="h-10 w-10" />
                                        <p className="mt-2 text-sm">{t('no_data_avaliable')}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="transition-colors hover:bg-gray-50">
                                    {columns.map((column, colIndex) => (
                                        <td
                                            key={colIndex}
                                            className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900 whitespace-normal md:whitespace-nowrap"
                                            style={{ width: column.width }}
                                        >
                                            {column.render
                                                ? column.render(row[column.accessor], row)
                                                : String(row[column.accessor] ?? '')}
                                        </td>
                                    ))}
                                    <td className="px-3 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            {onEdit && (
                                                <button
                                                    onClick={() => onEdit(row)}
                                                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center w-8 h-8 shadow-sm hover:shadow-md"
                                                    title={t('actions.view') || "View"}
                                                >
                                                    <FiEye size={16} className="font-bold" />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    onClick={() => onDelete(row)}
                                                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center w-8 h-8 shadow-sm hover:shadow-md"
                                                    title={t('actions.delete') || "Delete"}
                                                >
                                                    <FiTrash size={16} className="font-bold" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {data.length > 0 && totalPages >= 1 && (
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs md:text-sm text-gray-600">
                        {t('table.showing_page')} {currentPage} {t('table.of')} {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            {t('table.previous')}
                        </button>
                        <div className="flex gap-1">
                            {generatePageNumbers().map((page, index) =>
                                typeof page === 'number' ? (
                                    <button
                                        key={index}
                                        onClick={() => onPageChange(page)}
                                        className={twMerge(
                                            'px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-gray-200 transition-colors',
                                            page === currentPage
                                                ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                                                : 'hover:bg-gray-100 text-gray-700'
                                        )}
                                    >
                                        {page}
                                    </button>
                                ) : (
                                    <span key={index} className="px-3 py-1.5 text-xs md:text-sm text-gray-400">
                                        ...
                                    </span>
                                )
                            )}
                        </div>
                        <button
                            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            {t('table.next')}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
