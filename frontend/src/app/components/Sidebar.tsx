"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBell, FaCalendar, FaClipboardList, FaHome, FaSlidersH, FaUsers } from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";
import { useUser } from "../contexts/UserContext";
import { apiPrivate } from "../services/apiPrivate";
import { getImageUrl } from "../utils/imagePath";
import { getSocket } from "../utils/socket";

const Sidebar = ({ isOpen }: any) => {
    const pathname = usePathname();
    const { t } = useLanguage();
    const { user } = useUser();
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState<number>(0);

    useEffect(() => {
        const loadLogo = async () => {
            try {
                const res = await apiPrivate.get("/settings");
                const raw = res?.data?.logo_url as string | undefined;
                if (raw) {
                    const full = getImageUrl(raw);
                    setLogoUrl(full);
                }
            } catch (e) {
                // ignore and use fallback
            }
        };
        loadLogo();
    }, []);

    useEffect(() => {
        // Fetch initial count
        apiPrivate.get('/notifications/unread-count')
            .then(res => {
                setUnreadCount(res.data.count);
            })
            .catch(err => console.error("Failed to fetch unread count:", err));

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

    const isAdmin =
        Array.isArray(user?.roles) &&
        user!.roles!.some((role) => typeof role === "string" && role.toLowerCase() === "admin");

    const menuItems = [
        {
            key: "home",
            label: t("main_menu.home"),
            icon: <FaHome className="w-5 h-5" />,
            href: "/home/view",
            match: "/home",
        },
        {
            key: "boards",
            label: t("main_menu.boards"),
            icon: <FaClipboardList className="w-5 h-5" />,
            href: "/boards/view",
            match: "/boards",
        },
        {
            key: "notifications",
            label: "Notifications",
            icon: <FaBell className="w-5 h-5" />,
            href: "/notifications/view",
            match: "/notifications",
        },
        {
            key: "calendar",
            label: t("main_menu.calendar"),
            icon: <FaCalendar className="w-5 h-5" />,
            href: "/calendar/view",
            match: "/calendar",
        },
        {
            key: "employees",
            label: t("main_menu.employees"),
            icon: <FaUsers className="w-5 h-5" />,
            href: "/employees/view",
            match: "/employees",
        },
        {
            key: "setting",
            label: t("main_menu.setting"),
            icon: <FaSlidersH className="w-5 h-5" />,
            href: "/setting",
            match: "/setting",
            onlyAdmin: true,
        },
    ];

    return (
        <div
            className={`fixed inset-y-0 left-0 z-50 w-16 border-r border-white/10 bg-gradient-to-b from-emerald-600 to-teal-800 lg:rounded-r-[2rem] transform
            ${isOpen ? "translate-x-0" : "-translate-x-full"}
            xl:translate-x-0 transition-transform duration-300 ease-in-out shadow-[4px_0_24px_rgba(6,78,59,0.2)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}
        >
            {/* Logo Section */}
            <div className="flex flex-col items-center py-6 gap-4">
                <div className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-lg transition-transform duration-300 hover:scale-110">
                    <img src={logoUrl ?? "/Picture1.jpg"} alt="Logo" className="h-7 w-7 rounded-lg object-cover" />
                    {/* Subtle glow behind logo */}
                    <div className="absolute -inset-1 -z-10 rounded-xl bg-white/20 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="h-px w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>

            {/* Navigation Section */}
            <nav className="flex flex-col items-center gap-4 px-2 pb-8">
                {menuItems
                    .filter((item: any) => !item.onlyAdmin || isAdmin)
                    .map((item) => {
                        const isActive = pathname.startsWith(item.match);
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
                                    {item.key === "notifications" && unreadCount > 0 && (
                                        <span
                                            aria-label="unread-count"
                                            className="absolute -top-1 -right-1 min-w-4 px-1 h-4 rounded-full bg-rose-600 text-white text-[10px] leading-4 font-bold text-center shadow"
                                        >
                                            {unreadCount > 99 ? "99+" : unreadCount}
                                        </span>
                                    )}
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
