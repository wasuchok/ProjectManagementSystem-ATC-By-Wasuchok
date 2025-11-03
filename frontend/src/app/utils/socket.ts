
import { io, Socket } from "socket.io-client";
import { CONFIG } from "@/app/config";

const SOCKET_URL = CONFIG.socketUrl;

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket"],
            autoConnect: false,
        });

        socket.on("connect", () => {
            console.log("✅ Connected:", socket!.id);
        });

        socket.on("disconnect", () => {
            console.log("❌ Disconnected");
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
