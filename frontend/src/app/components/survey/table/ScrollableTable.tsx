import LoadingSpinner from '@/app/components/LoadingSpinner';
import React from 'react';
import { FiEye, FiTrash } from 'react-icons/fi';
import { twMerge } from 'tailwind-merge';

interface Column<T> {
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
    height?: string;
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
    height = '500px',
    onEdit,
    onDelete,
    currentPage,
    totalPages,
    onPageChange,
}: ScrollableTableProps<T>) {
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
            <div className="relative overflow-hidden" style={{ height }}>
                <div className="absolute inset-0 overflow-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-white sticky top-0 z-10 border-b border-gray-100">
                            <tr>
                                {columns.map((column, index) => (
                                    <th
                                        key={index}
                                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
                                        style={{ width: column.width }}
                                    >
                                        {column.header}
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-20">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="py-12 text-center">
                                        <LoadingSpinner size={32} color="#3b82f6" />
                                        <p className="mt-2 text-sm text-gray-500">Loading data...</p>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="py-12 text-center">
                                        <div className="text-gray-400">
                                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                            <p className="mt-2 text-sm">No data available</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="transition-colors hover:bg-gray-50">
                                        {columns.map((column, colIndex) => (
                                            <td
                                                key={colIndex}
                                                className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
                                                style={{ width: column.width }}
                                            >
                                                {column.render ? column.render(row[column.accessor], row) : String(row[column.accessor] ?? '')}
                                            </td>
                                        ))}
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                {onEdit && (
                                                    <button
                                                        onClick={() => onEdit(row)}
                                                        className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center w-8 h-8 shadow-sm hover:shadow-md"
                                                        title="View"
                                                    >
                                                        <FiEye size={16} className="font-bold" />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button
                                                        onClick={() => onDelete(row)}
                                                        className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center w-8 h-8 shadow-sm hover:shadow-md"
                                                        title="Delete"
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
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100  flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Showing page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            Previous
                        </button>
                        <div className="flex gap-1">
                            {generatePageNumbers().map((page, index) =>
                                typeof page === 'number' ? (
                                    <button
                                        key={index}
                                        onClick={() => onPageChange(page)}
                                        className={twMerge(
                                            'px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 transition-colors',
                                            page === currentPage
                                                ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                                                : 'hover:bg-gray-100 text-gray-700'
                                        )}
                                    >
                                        {page}
                                    </button>
                                ) : (
                                    <span key={index} className="px-3 py-1.5 text-sm text-gray-400">...</span>
                                )
                            )}
                        </div>
                        <button
                            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}