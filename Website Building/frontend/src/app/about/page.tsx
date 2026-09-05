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
          </p>
          <p>
            Our platform harnesses edge AI computer vision—<strong className="text-black dark:text-white">specifically fine-tuned YOLO bounding configurations stacked atop deep MobileNetV2 classification fibers</strong>—to detect produce boundaries, evaluate visible surface features, and grade uploaded produce into clearly defined categories such as <span className="italic">Good</span>, <span className="italic">Acceptable</span>, or <span className="italic">Damaged</span> accompanied by calibrated confidence scores.
          </p>
          <p>
            Equipped with rejected-image handling to safeguard against unrelated or unusable uploads, the system provides instant batch and single-item grading summaries for sellers and distributors.
          </p>
          <div className="p-3.5 sm:p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold text-black dark:text-white">Notice &amp; Scope: </span>
            The system judges visible appearance and exterior condition only. It does not certify internal freshness, taste, chemical safety, or fitness for consumption.
          </div>
        </div>

        {/* Creators / Built By Section */}
        <section className="mt-16 sm:mt-24 w-full max-w-5xl animate-fade-rise-delay">
          <div className="flex flex-col items-center mb-8 sm:mb-12">
            <span className="text-[11px] sm:text-xs uppercase tracking-widest font-semibold px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-black/70 dark:text-zinc-300 border border-black/10 dark:border-white/10 font-inter mb-3 sm:mb-4">
              The Creators
            </span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-instrument font-normal text-black dark:text-white tracking-tight">
              Created by the <span className="italic text-[#6F6F6F] dark:text-zinc-400">Team</span>
            </h2>
            <p className="text-xs sm:text-base text-gray-500 dark:text-zinc-400 font-inter mt-2 sm:mt-3 max-w-lg px-2">
              The builders and minds who conceptualized and developed this project.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left">
            {[
              {
                name: "Bashdar Rzgar",
                initials: "BR",
                role: "Project Creator",
              },
              {
                name: "Nairiti Dutta",
                initials: "ND",
                role: "Project Creator",
              },
              {
                name: "Manashita Baruah",
                initials: "MB",
                role: "Project Creator",
              },
              {
                name: "Diksha Borah",
                initials: "DB",
                role: "Project Creator",
              },
            ].map((member) => (
              <div
                key={member.name}
                className="group relative flex flex-col items-start p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-black/10 dark:border-zinc-800/80 backdrop-blur-xl shadow-lg shadow-black/[0.03] dark:shadow-black/20 hover:border-black/30 dark:hover:border-zinc-600 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 border border-black/5 dark:border-white/10 flex items-center justify-center font-instrument text-base sm:text-lg font-semibold text-black dark:text-white shadow-sm mb-4 sm:mb-5 group-hover:scale-105 transition-transform duration-300">
                  {member.initials}
                </div>
                <h3 className="text-lg sm:text-xl font-instrument font-medium text-black dark:text-white tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {member.name}
                </h3>
                <span className="text-[11px] sm:text-xs font-inter font-medium text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-20 border-t border-black/10 dark:border-white/10 py-8 sm:py-12 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 font-inter text-xs sm:text-sm text-gray-500 dark:text-zinc-400 text-center sm:text-left">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <BrandLogo size={24} className="sm:w-[32px] sm:h-[32px]" />
          <span className="font-instrument text-lg sm:text-xl text-black dark:text-white font-semibold tracking-tight">
            CipherCrew<sup>®</sup>
          </span>
        </div>
        <p>© {new Date().getFullYear()} CipherCrew.</p>
      </footer>
    </div>
  );
}
