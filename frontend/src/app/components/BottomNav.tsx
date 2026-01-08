"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBell, FaCalendar, FaClipboardList, FaHome, FaSlidersH, FaUsers } from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";
import { useUser } from "../contexts/UserContext";
import { apiPrivate } from "../services/apiPrivate";
import { getSocket } from "../utils/socket";

const BottomNav = () => {
    const pathname = usePathname();
    const { t } = useLanguage();
    const { user } = useUser();
    const [unreadCount, setUnreadCount] = useState<number>(0);

    const isAdmin =
        Array.isArray(user?.roles) &&
        user!.roles!.some((role) => typeof role === "string" && role.toLowerCase() === "admin");

    useEffect(() => {
        apiPrivate
            .get("/notifications/unread-count")
            .then((res) => {
                const count = Number(res?.data?.count ?? 0);
                setUnreadCount(Number.isFinite(count) ? count : 0);
            })
            .catch(() => { });

        const socket = getSocket();
        if (!socket.connected) socket.connect();
        const handler = (payload: any) => {
            const count = Number(payload?.count ?? 0);
            setUnreadCount(Number.isFinite(count) ? count : 0);
        };
        socket.on("unreadNotificationCountUpdated", handler);
        return () => {
            socket.off("unreadNotificationCountUpdated", handler);
        };
    }, []);

    const items = [
        { key: "home", label: t("main_menu.home"), icon: <FaHome className="w-5 h-5" />, href: "/home/view", match: "/home" },
        { key: "boards", label: t("main_menu.boards"), icon: <FaClipboardList className="w-5 h-5" />, href: "/boards/view", match: "/boards" },
        { key: "notifications", label: t("main_menu.notifications"), icon: <FaBell className="w-5 h-5" />, href: "/notifications/view", match: "/notifications" },
        { key: "calendar", label: t("main_menu.calendar"), icon: <FaCalendar className="w-5 h-5" />, href: "/calendar/view", match: "/calendar" },
        { key: "employees", label: t("main_menu.employees"), icon: <FaUsers className="w-5 h-5" />, href: "/employees/view", match: "/employees" },
        { key: "setting", label: t("main_menu.setting"), icon: <FaSlidersH className="w-5 h-5" />, href: "/setting", match: "/setting", onlyAdmin: true },
    ];

    const visibleItems = items.filter((item: any) => !item.onlyAdmin || isAdmin);

    return (
        <nav className="fixed inset-x-0 bottom-0 z-[60] xl:hidden">
            <div className="mx-auto max-w-5xl">
                <div className="rounded-t-2xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur px-2 py-1.5 pb-[env(safe-area-inset-bottom)]">
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}>
                        {visibleItems
                            .map((item) => {
                                const active = pathname.startsWith(item.match);
                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        aria-label={item.label}
                                        className={`flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition ${active ? "text-emerald-700 bg-emerald-50" : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"}`}
                                    >
                                        {item.key === "notifications" ? (
                                            <span className="relative inline-flex">
                                                {item.icon}
                                                {unreadCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white flex items-center justify-center">
                                                        {unreadCount > 99 ? "99+" : unreadCount}
                                                    </span>
                                                )}
                                            </span>
                                        ) : (
                                            item.icon
                                        )}
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
