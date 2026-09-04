"use client";

import { useTheme } from "./ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-10 h-10 rounded-full bg-white/40 border border-white/60 dark:bg-zinc-800/50 dark:border-zinc-700/60 ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
        bg-white/60 hover:bg-white/90 border border-black/10 shadow-sm
        dark:bg-zinc-800/80 dark:hover:bg-zinc-700/90 dark:border-zinc-700/80 dark:shadow-md
        backdrop-blur-xl group hover:scale-105 active:scale-95 cursor-pointer ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="text-amber-300 flex items-center justify-center"
          >
            <Moon className="w-5 h-5 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="text-amber-600 group-hover:text-amber-500 flex items-center justify-center"
          >
            <Sun className="w-5 h-5 drop-shadow-[0_0_6px_rgba(217,119,6,0.3)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
