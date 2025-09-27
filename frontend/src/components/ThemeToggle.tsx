"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const isDark = theme === "dark";
    return (
        <button
            aria-label="Toggle theme"
            className="inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-neutral-900"
            onClick={() => setTheme(isDark ? "light" : "dark")}
        >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
    );
}


