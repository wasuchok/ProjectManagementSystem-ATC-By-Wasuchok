"use client";

import en from '@/app/locales/en.json';
import th from '@/app/locales/th.json';
import { createContext, useContext, useEffect, useState } from "react";

type LangType = "EN" | "TH";

interface LangContextType {
    lang: LangType;
    t: (key: string) => string;
    setLang: (lang: LangType) => void;
}

const LanguageContext = createContext<LangContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [lang, setLang] = useState<LangType>("TH");
    const [dict, setDict] = useState(th);

    // โหลดจาก localStorage
    useEffect(() => {
        const stored = localStorage.getItem("lang");
        if (stored === "EN") {
            setLang("EN");
            setDict(en);
        }
    }, []);

    // เมื่อเปลี่ยนภาษา → บันทึกลง localStorage
    const changeLang = (newLang: LangType) => {
        setLang(newLang);
        localStorage.setItem("lang", newLang);
        setDict(newLang === "EN" ? en : th);
    };

    // ฟังก์ชันแปลข้อความด้วย path เช่น "header.welcome"
    const t = (key: string) => {
        const parts = key.split(".");
        return parts.reduce((obj: any, k: string) => (obj ? obj[k] : key), dict) || key;
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
    return ctx;
};
