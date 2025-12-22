"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaChevronDown, FaLaptop, FaUser } from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";
import { useUser } from "../contexts/UserContext";
import { apiPrivate } from "../services/apiPrivate";

interface HeaderProps {
    onToggle?: () => void;
}

const Header = ({ onToggle }: HeaderProps) => {
    const router = useRouter();
    const { user, logout: clearUser } = useUser();
    const { lang, setLang } = useLanguage();
    const [showLang, setShowLang] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const [isClient, setIsClient] = useState(false);


    useEffect(() => {
        setIsClient(true);
    }, []);


    const handleLangChange = (newLang: "TH" | "EN") => {
        setLang(newLang);
        setShowLang(false);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest(".lang-dropdown")) setShowLang(false);
            if (!target.closest(".user-dropdown")) setShowUserMenu(false);
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    const handleLogout = useCallback(async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await apiPrivate.post("/user-account/logout");
        } catch (error) {
            console.error("logout error", error);
        } finally {
            clearUser();
            setShowUserMenu(false);
            setIsLoggingOut(false);
            router.push("/login");
        }
    }, [clearUser, isLoggingOut, router]);


    if (!isClient) {
        return <header className="bg-white border border-gray-100 shadow-sm h-14" />;
    }

    return (
        <header className="bg-white border border-slate-100 shadow-sm lg:rounded-xl">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-1.5">


                <div className="relative lang-dropdown">
                    <button
                        onClick={() => setShowLang(!showLang)}
                        className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] transition hover:border-slate-300"
                    >
                        <img
                            src={
                                lang === "TH"
                                    ? "https://flagcdn.com/w20/th.png"
                                    : "https://flagcdn.com/w20/gb.png"
                            }
                            alt={lang === "TH" ? "Thai" : "English"}
                            className="h-4 w-5 rounded-sm object-cover"
                        />
                        {lang === "TH" ? "ไทย" : "EN"}
                    </button>
                    {showLang && (
                        <div className="absolute right-0 mt-2 w-32 rounded-xl border border-gray-100 bg-white shadow-xl z-50">
                            <button
                                onClick={() => handleLangChange("TH")}
                                className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition ${lang === "TH"
                                    ? "bg-gray-100 text-slate-900"
                                    : "text-gray-500 hover:bg-gray-50"
                                    }`}
                            >
                                <img src="https://flagcdn.com/w20/th.png" className="w-5 h-3" />
                                ไทย
                            </button>
                            <button
                                onClick={() => handleLangChange("EN")}
                                className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition ${lang === "EN"
                                    ? "bg-gray-100 text-slate-900"
                                    : "text-gray-500 hover:bg-gray-50"
                                    }`}
                            >
                                <img src="https://flagcdn.com/w20/gb.png" className="w-5 h-3" />
                                English
                            </button>
                        </div>
                    )}
                </div>

                <div className="relative user-dropdown">
                    <button
                        onClick={() => setShowUserMenu((prev) => !prev)}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs transition hover:border-slate-300"
                    >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white">
                            <FaUser className="h-3.5 w-3.5" />
                        </div>
                        <span>{user?.username || "ผู้ใช้งาน"}</span>
                        <FaChevronDown className="h-3 w-3 text-gray-500" />
                    </button>

                    {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-100 bg-white shadow-md z-50 overflow-hidden">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                {user?.full_name ?? user?.username ?? "User"}
                            </div>
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <FaLaptop className="w-4 h-4" />
                                {isLoggingOut ? "กำลังออก..." : "ออกจากระบบ"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
