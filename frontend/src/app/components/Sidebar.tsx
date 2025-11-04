"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaClipboardList, FaHome, FaSlidersH, FaUsers } from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";

const Sidebar = ({ isOpen, onToggle }: any) => {
    const pathname = usePathname();
    const { t } = useLanguage()

    const menuItems = [
        {
            key: "home",
            label: t("main_menu.home"),
            icon: <FaHome className="w-5 h-5 mr-3" />,
            href: "/home/view",
        },
        {
            key: "boards",
            label: t("main_menu.boards"),
            icon: <FaClipboardList className="w-5 h-5 mr-3" />,
            href: "/boards/view",
        },
        {
            key: "employees",
            label: t("main_menu.employees"),
            icon: <FaUsers className="w-5 h-5 mr-3" />,
            href: "/employees/view",
        },
        {
            key: "setting",
            label: t("main_menu.setting"),
            icon: <FaSlidersH className="w-5 h-5 mr-3" />,
            href: "/setting",
        },
    ];

    return (
        <div
            className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border border-gray-100 lg:rounded-xl transform
            ${isOpen ? "translate-x-0" : "-translate-x-full"}
            lg:translate-x-0 transition-transform duration-200 ease-in-out shadow-md`}
        >

            <div className="flex items-center justify-center h-16 px-5 bg-white border lg:rounded-xl border-gray-100">
                <img src="/Picture1.jpg" alt="Logo" className="p-16 rounded-full" />
            </div>


            <nav className="mt-8 px-3 space-y-3">
                <div className="text-gray-400 text-sm font-semibold">{t('main_menu.head')}</div>
                <hr />

                {menuItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`flex items-center px-3 py-3 text-base rounded-md
                                transition-all duration-200 group
                                ${isActive
                                    ? "bg-primary-50 text-primary-600 border-r-2 border-primary-600 shadow-sm"
                                    : "text-gray-600 hover:bg-primary-50 hover:text-primary-600 hover:shadow-md"
                                }`}
                        >
                            <div
                                className={`flex-shrink-0 transition-colors ${isActive
                                    ? "text-primary-500"
                                    : "text-gray-400 group-hover:text-primary-500"
                                    }`}
                            >
                                {item.icon}
                            </div>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>


        </div>
    );
};

export default Sidebar;
