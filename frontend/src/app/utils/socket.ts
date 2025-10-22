
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5555";

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
