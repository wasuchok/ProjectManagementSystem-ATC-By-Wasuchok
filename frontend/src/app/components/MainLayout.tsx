"use client";

import { useState } from "react";
import BottomNav from "./BottomNav";
import Header from "./Header";
import ScrollToTopButton from "./ScrollToTopButton";
import Sidebar from "./Sidebar";



export default function MainLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => !prev);
    };

    return (
        <>
            <div className="flex min-h-screen bg-slate-50">
                <Sidebar isOpen={isSidebarOpen} />

                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                        onClick={toggleSidebar}
                    />
                )}

                <div className="flex flex-1 flex-col xl:ml-16 xl:px-10 xl:pt-5">
                    <Header onToggle={toggleSidebar} />
                    <main className="mt-4 flex-1 pb-16 xl:pb-0">
                        {children}
                    </main>
                </div>
            </div>
            <BottomNav />
            <ScrollToTopButton />
        </>
    );
}
