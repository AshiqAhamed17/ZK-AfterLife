"use client";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";

export default function MobileMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                closeMenu();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="md:hidden">
            <button
                onClick={toggleMenu}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            >
                <Menu size={20} />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
                    <div ref={menuRef} className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-black border-l shadow-2xl">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-semibold">Menu</h3>
                            <button
                                onClick={closeMenu}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-6 mt-8 p-6">
                            <nav className="flex flex-col gap-4">
                                <Link href="/register" onClick={closeMenu} className="text-lg font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2">
                                    Register
                                </Link>
                                <Link href="/checkin" onClick={closeMenu} className="text-lg font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2">
                                    Check-in
                                </Link>
                                <Link href="/execute" onClick={closeMenu} className="text-lg font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2">
                                    Execute
                                </Link>
                                <Link href="/claims" onClick={closeMenu} className="text-lg font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2">
                                    Claims
                                </Link>
                                <Link href="/withdraw" onClick={closeMenu} className="text-lg font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2">
                                    Withdraw
                                </Link>
                                <Link href="/veto" onClick={closeMenu} className="text-lg font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2">
                                    Veto
                                </Link>
                            </nav>
                            <div className="pt-4 border-t">
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
