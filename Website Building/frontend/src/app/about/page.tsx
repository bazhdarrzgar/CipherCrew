import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AboutPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white/40 dark:bg-[#090d16]/70 backdrop-blur-md text-black dark:text-white transition-colors duration-300">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white/50 to-white/90 dark:from-[#090d16] dark:via-[#090d16]/80 dark:to-[#090d16] z-0 pointer-events-none transition-colors duration-300" />

      {/* Navigation (z-10) */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 max-w-7xl mx-auto w-full font-inter gap-2">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <BrandLogo size={36} className="sm:w-[42px] sm:h-[42px]" priority />
          <span className="text-2xl sm:text-3xl tracking-tight font-instrument text-[#000000] dark:text-white font-medium transition-colors">
            CipherCrew<sup>®</sup>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-6">
          <div className="flex items-center text-xs sm:text-sm font-medium">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 sm:bg-transparent sm:hover:bg-transparent sm:dark:bg-transparent sm:dark:hover:bg-transparent text-black/80 hover:text-black dark:text-zinc-300 dark:hover:text-white transition-all"
            >
              Studio
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main About Content */}
      <main className="relative z-10 flex flex-col items-center justify-start text-center px-4 sm:px-6 pt-16 sm:pt-28 pb-24 sm:pb-36 min-h-[70vh]">
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl max-w-4xl font-normal font-instrument text-black dark:text-white animate-fade-rise tracking-tight leading-[1.05] sm:leading-[0.95]">
          Our Core <span className="text-[#6F6F6F] dark:text-zinc-400 italic">Mission.</span>
        </h1>
        
        <div className="max-w-3xl mt-8 sm:mt-12 space-y-4 sm:space-y-6 text-sm sm:text-base md:text-lg leading-relaxed text-[#555555] dark:text-zinc-300 font-inter animate-fade-rise-delay text-left">
          <p>
            CipherCrew® was developed to solve a crucial agricultural challenge: <strong className="text-black dark:text-white">Produce Quality Grading</strong>. Farmers and sellers need a simple, reliable method of sorting fruit produce according to visible quality before sale, replacing subjective and time-consuming manual sorting.
</div>
</div>
);
}
