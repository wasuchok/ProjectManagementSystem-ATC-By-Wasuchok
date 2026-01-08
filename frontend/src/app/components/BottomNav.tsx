"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaClipboardList, FaHome, FaSlidersH, FaUsers, FaCalendar } from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";
import { useUser } from "../contexts/UserContext";

const BottomNav = () => {
    const pathname = usePathname();
    const { t } = useLanguage();
    const { user } = useUser();

    const isAdmin =
        Array.isArray(user?.roles) &&
        user!.roles!.some((role) => typeof role === "string" && role.toLowerCase() === "admin");

    const items = [
        { key: "home", label: t("main_menu.home"), icon: <FaHome className="w-5 h-5" />, href: "/home/view", match: "/home" },
        { key: "boards", label: t("main_menu.boards"), icon: <FaClipboardList className="w-5 h-5" />, href: "/boards/view", match: "/boards" },
        { key: "calendar", label: t("main_menu.calendar"), icon: <FaCalendar className="w-5 h-5" />, href: "/calendar/view", match: "/calendar" },
        { key: "employees", label: t("main_menu.employees"), icon: <FaUsers className="w-5 h-5" />, href: "/employees/view", match: "/employees" },
        { key: "setting", label: t("main_menu.setting"), icon: <FaSlidersH className="w-5 h-5" />, href: "/setting", match: "/setting", onlyAdmin: true },
    ];

    return (
        <nav className="fixed inset-x-0 bottom-0 z-[60] xl:hidden">
            <div className="mx-auto max-w-5xl">
                <div className="rounded-t-2xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur px-2 py-1.5 pb-[env(safe-area-inset-bottom)]">
                    <div className="grid grid-cols-4 gap-1">
                        {items
                            .filter((item: any) => !item.onlyAdmin || isAdmin)
                            .map((item) => {
                                const active = pathname.startsWith(item.match);
                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        aria-label={item.label}
                                        className={`flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition ${active ? "text-emerald-700 bg-emerald-50" : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"}`}
                                    >
                                        {item.icon}
                                        <span className="mt-1">{item.label}</span>
                                    </Link>
                                );
                            })}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default BottomNav;
