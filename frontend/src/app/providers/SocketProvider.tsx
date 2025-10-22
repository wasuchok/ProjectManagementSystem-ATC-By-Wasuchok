
"use client";
import { getSocket, registerSocketUser } from '@/app/utils/socket';
import { useEffect } from "react";
import { useUser } from "../contexts/UserContext";

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const { user } = useUser();

    useEffect(() => {
        const socket = getSocket();
        if (!socket.connected) socket.connect();

        if (user?.id) {
            registerSocketUser(String(user?.id));
        }

        return () => {
            socket.off("connect");
            socket.off("disconnect");
        };
    }, [user?.id]);

    return <>{children}</>;
}
