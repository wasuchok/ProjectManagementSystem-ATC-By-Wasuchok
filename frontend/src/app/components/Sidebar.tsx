"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaClipboardList, FaHome, FaSlidersH, FaUser, FaUsers } from "react-icons/fa";

const Sidebar = ({ isOpen, onToggle }: any) => {
    const pathname = usePathname();

    const menuItems = [
        {
            key: "home",
            label: "Home",
            icon: <FaHome className="w-5 h-5 mr-3" />,
            href: "/home/view",
        },
        {
            key: "boards",
            label: "Boards",
            icon: <FaClipboardList className="w-5 h-5 mr-3" />,
            href: "/boards/view",
        },
        {
            key: "employees",
            label: "Employees",
            icon: <FaUsers className="w-5 h-5 mr-3" />,
            href: "/employees/create",
        },
        {
            key: "manage",
            label: "Manage",
            icon: <FaSlidersH className="w-5 h-5 mr-3" />,
            href: "/manage",
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
                <div className="text-gray-400 text-sm font-semibold">MAIN MENU</div>
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

            {/* Footer User Info */}
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center space-x-2 hover:bg-white hover:rounded p-1 transition-colors cursor-pointer">
                    <div className="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <FaUser className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="text-xs min-w-0">
                        <p className="font-medium text-gray-900 truncate">Wasuchok Jainam</p>
                        <p className="text-gray-500">Admin</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
