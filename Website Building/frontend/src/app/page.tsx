"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { DetectionInterface } from "@/components/DetectionInterface";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-black dark:text-white flex flex-col transition-colors duration-300">

      {/* Navigation Header (z-10) */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-4 sm:py-6 max-w-7xl mx-auto flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <BrandLogo size={36} className="sm:w-[42px] sm:h-[42px]" priority />
          <span className="text-2xl sm:text-3xl tracking-tight font-instrument text-[#000000] dark:text-white font-medium transition-colors">
            CipherCrew<sup>®</sup>
          </span>
        </Link>

        {/* Navigation & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-6">
          <nav className="flex items-center text-xs sm:text-sm font-medium font-inter">
            <Link
              href="/about"
              className="px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 sm:bg-transparent sm:hover:bg-transparent sm:dark:bg-transparent sm:dark:hover:bg-transparent text-black/80 hover:text-black dark:text-zinc-300 dark:hover:text-white transition-all"
            >
              About
            </Link>
          </nav>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Detection Studio Section */}
      <main className="relative z-10 flex-grow max-w-7xl mx-auto w-full px-3 sm:px-6 md:px-8 py-6 sm:py-10 flex flex-col gap-6 sm:gap-10">
        <div className="text-center flex flex-col items-center gap-2 sm:gap-3 px-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-instrument text-black dark:text-white tracking-tight transition-colors">
            Fruit Quality Grading
          </h1>
          <p className="text-gray-600 dark:text-zinc-400 max-w-2xl font-inter text-sm sm:text-base md:text-lg transition-colors">
            Upload an image of a fruit and our vision models will classify whether it is good, bad, or unknown.
          </p>
        </div>

        <DetectionInterface />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-black/10 dark:border-white/10 py-6 sm:py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 font-inter text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-auto transition-colors text-center sm:text-left">
        <div className="flex items-center gap-2 sm:gap-3">
          <BrandLogo size={24} className="sm:w-[28px] sm:h-[28px]" />
          <span className="font-instrument text-base sm:text-lg text-black dark:text-white font-semibold tracking-tight transition-colors">
            CipherCrew<sup>®</sup>
          </span>
        </div>
        <p>© {new Date().getFullYear()} CipherCrew.</p>
      </footer>
    </div>
  );
}
