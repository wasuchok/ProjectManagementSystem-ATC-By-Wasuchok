"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface User {
    id: number;
    username: string;
    full_name?: string;
    email?: string;
    roles?: string[];
}

interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    logout: () => void;
}

const UserContext = createContext<UserContextType>({
    user: null,
    setUser: () => { },
    logout: () => { },
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (err) {
                console.warn("⚠️ Failed to parse user from localStorage");
            }
        }
    }, []);


    useEffect(() => {
        if (typeof window === "undefined") return;
        if (user) {
            localStorage.setItem("user", JSON.stringify(user));
        } else {
            localStorage.removeItem("user");
        }
    }, [user]);

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
    };

    return (
        <UserContext.Provider value={{ user, setUser, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
