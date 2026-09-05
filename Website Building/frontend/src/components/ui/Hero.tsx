"use client";

import { motion } from "framer-motion";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden w-full flex flex-col items-center justify-center pt-32 pb-16 px-6">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-green-500/20 blur-[120px] rounded-[100%] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 flex flex-col items-center text-center max-w-4xl"
      >
        <h1 className="font-goothif text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1] text-balance mb-6">
          Scan to Know Whether You Are Eating a Fruit or <span className="text-rotten">Chemicals</span>
        </h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl text-balance"
        >
          Our advanced Computer Vision models analyze your fruit instantly to detect if it&apos;s Good, Bad, or Unknown.
        </motion.p>
      </motion.div>
    </section>
  );
};
