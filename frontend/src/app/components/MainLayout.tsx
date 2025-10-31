"use client";

import { useState } from "react";
import Header from "./Header";
import ScrollToTopButton from "./ScrollToTopButton";
import Sidebar from "./Sidebar";



export default function MainLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState('boards');

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleMenuClick = (menu: any) => {
        setActiveMenu(menu);
    };
    return (
        <>

            <div className="flex h-screen bg-white">
                <Sidebar
                    isOpen={isSidebarOpen}
                    onToggle={toggleSidebar}
                    activeMenu={activeMenu}
                    onMenuClick={handleMenuClick}
                />

                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                        onClick={toggleSidebar}
                    />
                )}

                <div className="flex-1 flex flex-col lg:ml-64 lg:px-16 lg:pt-4">
                    <Header onToggle={toggleSidebar} />
                    <div className="mt-4">
                        {children}
                    </div>
                </div>



            </div>
            <ScrollToTopButton />
        </>
    );
}