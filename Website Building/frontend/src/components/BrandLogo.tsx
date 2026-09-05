"use client";

import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";

interface BrandLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ size = 40, className = "" }: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Before hydration, check HTML class directly to avoid any mismatch
  const currentTheme = mounted
    ? resolvedTheme
    : typeof document !== "undefined" && document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";

  const isDark = currentTheme === "dark";

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Light Theme Logo (White Background) */}
      <img
        src="/logo-light.png"
        alt="CipherCrew Logo - Light Mode"
        width={size}
        height={size}
        style={{
          display: isDark ? "none" : "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
        className="drop-shadow-sm select-none transition-all duration-200"
      />

      {/* Dark Theme Logo (Dark Background) */}
      <img
        src="/logo-dark.png"
        alt="CipherCrew Logo - Dark Mode"
        width={size}
        height={size}
        style={{
          display: isDark ? "block" : "none",
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
        className="drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] select-none transition-all duration-200"
      />
    </div>
  );
}
