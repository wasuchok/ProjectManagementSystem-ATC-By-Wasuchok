"use client";

import { useLanguage } from "@/app/contexts/LanguageContext";
import { useUser } from "@/app/contexts/UserContext";
import { apiPrivate } from "@/app/services/apiPrivate";
import { getSocket } from "@/app/utils/socket";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaBell, FaCheckCircle, FaCommentDots, FaExclamationTriangle } from "react-icons/fa";

type NotificationItem = {
    id: number;
    user_id: string;
    type: string;
    title: string;
    message?: string;
    link?: string;
    is_read: boolean;
    created_at: string;
    metadata?: any;
};

export default function NotificationsPage() {
    const { user } = useUser();
    const { t } = useLanguage();
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [serverUnreadCount, setServerUnreadCount] = useState(0);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
    const [connected, setConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // Fetch initial data
    useEffect(() => {
        if (!user?.id) return;

        const fetchData = async () => {
            try {
                const [notifsRes, countRes] = await Promise.all([
                    apiPrivate.get('/notifications'),
                    apiPrivate.get('/notifications/unread-count')
                ]);
                setItems(notifsRes.data);
                setServerUnreadCount(countRes.data.count);
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            }
        };

        fetchData();
    }, [user?.id]);

    useEffect(() => {
        const socket = getSocket();
        socketRef.current = socket;
        if (!socket.connected) socket.connect();

        const onConnect = () => {
            setConnected(true);
            setConnectionError(null);
        };
        const onDisconnect = () => setConnected(false);
        const onConnectError = (err: any) => {
            console.error("Socket connection error:", err);
            setConnected(false);
            setConnectionError(err.message || "Unknown error");
        };

        if (socket.connected) {
            setConnected(true);
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onConnectError);

        // Listen for new notification
        const handleNewNotification = (notification: NotificationItem) => {
            setItems(prev => [notification, ...prev]);
        };

        const handleUnreadCount = (payload: { count: number }) => {
            setServerUnreadCount(payload.count);
        };

        socket.on("notification:new", handleNewNotification);
        socket.on("unreadNotificationCountUpdated", handleUnreadCount);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("connect_error", onConnectError);
            socket.off("notification:new", handleNewNotification);
            socket.off("unreadNotificationCountUpdated", handleUnreadCount);
        };
    }, []);

    const visibleItems = useMemo(
        () => (filter === "unread" ? items.filter((i) => !i.is_read) : items),
        [items, filter]
    );

    const markAllRead = async () => {
        try {
            await apiPrivate.put('/notifications/read-all');
            setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
            setServerUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const markRead = async (id: number) => {
        // Optimistic update
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)));

        try {
            await apiPrivate.put(`/notifications/${id}/read`);
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const iconFor = (type: string) => {
        switch (type) {
            case "invite":
            case "project_invite":
                return <FaCheckCircle className="w-4 h-4 text-emerald-600" />;
            case "task_comment":
            case "comment":
                return <FaCommentDots className="w-4 h-4 text-blue-600" />;
            default:
                return <FaExclamationTriangle className="w-4 h-4 text-amber-600" />;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('th-TH', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    };

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <FaBell className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                ศูนย์แจ้งเตือน
                            </p>
                            <h1 className="text-2xl font-semibold text-slate-900">
                                Notifications Center
                            </h1>
                            <p className={`text-xs font-medium ${connected ? "text-emerald-600" : "text-rose-600"}`}>
                                {connected ? "Realtime Connected" : "Disconnected"}
                                {!connected && connectionError && <span className="ml-2 text-rose-500">({connectionError})</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg border border-slate-200 bg-white p-1">
                            <button
                                type="button"
                                onClick={() => setFilter("all")}
                                className={`rounded px-3 py-1.5 text-sm font-semibold transition ${filter === "all" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"
                                    }`}
                            >
                                ทั้งหมด
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter("unread")}
                                className={`rounded px-3 py-1.5 text-sm font-semibold transition ${filter === "unread" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"
                                    }`}
                            >
                                ยังไม่ได้อ่าน ({serverUnreadCount})
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={markAllRead}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
                {visibleItems.length === 0 ? (
                    <p className="text-sm text-slate-500">ยังไม่มีการแจ้งเตือน</p>
                ) : (
                    <ul className="space-y-3">
                        {visibleItems.map((item) => (
                            <li
                                key={item.id}
                                className={`rounded-2xl border p-4 shadow-sm transition-colors ${item.is_read ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"
                                    }`}
                                onClick={() => !item.is_read && markRead(item.id)}
                            >
                                <div className="flex gap-4">
                                    <div className="mt-1 flex-shrink-0">
                                        {iconFor(item.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-start justify-between gap-4">
                                            <h3 className={`font-semibold ${item.is_read ? "text-slate-700" : "text-slate-900"}`}>
                                                {item.title}
                                            </h3>
                                            <span className="shrink-0 text-xs text-slate-400">
                                                {formatDate(item.created_at)}
                                            </span>
                                        </div>
                                        {item.message && (
                                            <p className="text-sm text-slate-600 line-clamp-2">
                                                {item.message}
                                            </p>
                                        )}
                                        {item.link && (
                                            <div className="pt-2">
                                                <Link
                                                    href={item.link}
                                                    className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markRead(item.id);
                                                    }}
                                                >
                                                    ดูรายละเอียด &rarr;
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
