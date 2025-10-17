"use client";

import { useEffect, useState } from "react";
import { FaBell, FaChevronDown, FaUser } from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";
import { useUser } from "../contexts/UserContext";

interface HeaderProps {
    onToggle?: () => void;
}

const Header = ({ onToggle }: HeaderProps) => {
    const { user } = useUser();
    const { lang, setLang } = useLanguage();
    const [showLang, setShowLang] = useState(false);

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
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);


    if (!isClient) {
        return <header className="bg-white border border-gray-100 shadow-sm h-14" />;
    }

    return (
        <header className="bg-white border lg:rounded-xl border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">

                <button
                    className="lg:hidden p-1.5 rounded text-gray-500 hover:bg-gray-50"
                    onClick={onToggle}
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                </button>

                <div className="flex items-center space-x-3 relative">

                    <div className="relative lang-dropdown">
                        <button
                            onClick={() => setShowLang(!showLang)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                        >
                            <img
                                src={
                                    lang === "TH"
                                        ? "https://flagcdn.com/w20/th.png"
                                        : "https://flagcdn.com/w20/gb.png"
                                }
                                alt={lang === "TH" ? "Thai" : "English"}
                                className="w-5 h-3 rounded-sm object-cover"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                {lang === "TH" ? "ไทย" : "English"}
                            </span>
                            <FaChevronDown
                                className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${showLang ? "rotate-180" : ""
                                    }`}
                            />
                        </button>

                        {showLang && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-lg shadow-md overflow-hidden animate-fadeIn z-50">
                                <button
                                    onClick={() => handleLangChange("TH")}
                                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition ${lang === "TH"
                                        ? "bg-gray-50 text-blue-600"
                                        : "text-gray-700"
                                        }`}
                                >
                                    <img src="https://flagcdn.com/w20/th.png" className="w-5 h-3" />
                                    ไทย
                                </button>
                                <button
                                    onClick={() => handleLangChange("EN")}
                                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition ${lang === "EN"
                                        ? "bg-gray-50 text-blue-600"
                                        : "text-gray-700"
                                        }`}
                                >
                                    <img src="https://flagcdn.com/w20/gb.png" className="w-5 h-3" />
                                    English
                                </button>
                            </div>
                        )}
                    </div>


                    <button className="relative p-1.5 text-gray-500 hover:bg-gray-50 rounded">
                        <FaBell className="w-4 h-4" />
                        <span className="absolute top-0 right-0 block h-2 w-2 bg-red-400 rounded-full ring-1 ring-white"></span>
                    </button>


                    <div className="flex items-center gap-1.5 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                        <div className="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center">
                            <FaUser className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 hidden sm:block">
                            รหัสพนักงาน {user?.username || "-"}
                        </span>
                        <FaChevronDown className="w-3 h-3 text-gray-500" />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
