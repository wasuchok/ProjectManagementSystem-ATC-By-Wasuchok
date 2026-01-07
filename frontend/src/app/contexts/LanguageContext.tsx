"use client";

import en from '@/app/locales/en.json';
import th from '@/app/locales/th.json';
import { createContext, useContext, useEffect, useState } from "react";

type LangType = "EN" | "TH";

interface LangContextType {
    lang: LangType;
    t: (key: string, vars?: Record<string, string | number>) => string;
    setLang: (lang: LangType) => void;
}

const LanguageContext = createContext<LangContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [lang, setLang] = useState<LangType>("TH");
    const [dict, setDict] = useState(th);


    useEffect(() => {
        const stored = localStorage.getItem("lang");
        if (stored === "EN") {
            setLang("EN");
            setDict(en);
        }
    }, []);


    const changeLang = (newLang: LangType) => {
        setLang(newLang);
        localStorage.setItem("lang", newLang);
        setDict(newLang === "EN" ? en : th);
    };


    const t = (key: string, vars?: Record<string, string | number>) => {
        const parts = key.split(".");
        const raw = parts.reduce((obj: any, k: string) => (obj != null ? obj[k] : undefined), dict);
        if (typeof raw !== "string") return key;

        if (!vars) return raw;
        return raw.replace(/\{(\w+)\}/g, (match, token) => {
            const replacement = vars[token];
            return replacement !== undefined ? String(replacement) : match;
        });
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
