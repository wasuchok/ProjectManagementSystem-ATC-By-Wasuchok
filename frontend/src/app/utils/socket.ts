
import { CONFIG } from "@/app/config";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = CONFIG.socketUrl;

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            autoConnect: true,
            withCredentials: true,
            path: "/socket.io",
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000,
        });

        socket.on("connect", () => {
            console.log("✅ Connected:", socket!.id);
        });

        socket.on("disconnect", () => {
            console.log("❌ Disconnected");
        });
        socket.on("connect_error", (err) => {
            console.error("⚠️ Socket connect_error:", err?.message ?? err);
        });
    }

    return socket;
};

// 👉 ฟังก์ชันสำหรับ register userId แบบ dynamic
export const registerSocketUser = (userId: string) => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit("registerUser", userId);
    console.log("📡 Sent userId to backend:", userId);
};
