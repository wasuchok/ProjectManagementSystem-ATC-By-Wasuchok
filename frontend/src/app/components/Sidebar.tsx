"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaClipboardList, FaHome, FaSlidersH, FaUsers } from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";

const Sidebar = ({ isOpen }: any) => {
    const pathname = usePathname();
    const { t } = useLanguage()

    const menuItems = [
        {
            key: "home",
            label: t("main_menu.home"),
            icon: <FaHome className="w-5 h-5" />,
            href: "/home/view",
        },
        {
            key: "boards",
            label: t("main_menu.boards"),
            icon: <FaClipboardList className="w-5 h-5" />,
            href: "/boards/view",
        },
        {
            key: "employees",
            label: t("main_menu.employees"),
            icon: <FaUsers className="w-5 h-5" />,
            href: "/employees/view",
        },
        {
            key: "setting",
            label: t("main_menu.setting"),
            icon: <FaSlidersH className="w-5 h-5" />,
            href: "/setting",
        },
    ];

    return (
        <div
            className={`fixed inset-y-0 left-0 z-50 w-16 border-r border-white/10 bg-gradient-to-b from-emerald-600 to-teal-800 lg:rounded-r-[2rem] transform
            ${isOpen ? "translate-x-0" : "-translate-x-full"}
            lg:translate-x-0 transition-transform duration-300 ease-in-out shadow-[4px_0_24px_rgba(6,78,59,0.2)]`}
        >
            {/* Logo Section */}
            <div className="flex flex-col items-center py-6 gap-4">
                <div className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-lg transition-transform duration-300 hover:scale-110">
                    <img src="/Picture1.jpg" alt="Logo" className="h-7 w-7 rounded-lg object-cover" />
                    {/* Subtle glow behind logo */}
                    <div className="absolute -inset-1 -z-10 rounded-xl bg-white/20 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="h-px w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>

            {/* Navigation Section */}
            <nav className="flex flex-col items-center gap-4 px-2 pb-8">
                {menuItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            aria-label={item.label}
                            className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300
                                ${isActive
                                    ? "bg-white text-emerald-600 shadow-lg scale-110"
                                    : "text-white/70 hover:bg-white/10 hover:text-white hover:scale-105"
                                }`}
                        >
                            <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">
                                {item.icon}
                            </div>

                            {/* Tooltip */}
                            <span
                                className="pointer-events-none absolute left-full ml-4 origin-left translate-x-2 rounded-lg bg-slate-900/95 px-2.5 py-1.5 text-[10px] font-bold text-white opacity-0 shadow-xl backdrop-blur-sm transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                            >
                                {item.label}
                                {/* Tooltip Arrow */}
                                <div className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900/95" />
                            </span>

                            {/* Hover Glow (for non-active) */}
                            {!isActive && (
                                <div className="absolute inset-0 -z-10 rounded-xl bg-white/0 blur-md transition-all duration-300 group-hover:bg-white/10" />
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default Sidebar;
