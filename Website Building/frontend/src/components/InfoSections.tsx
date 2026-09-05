"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Cpu, ScanSearch, ShieldCheck } from "lucide-react";

export const InfoSections = () => {
  return (
    <div className="w-full flex flex-col items-center mt-32 gap-32">
      
      {/* How It Works */}
      <section className="w-full max-w-6xl px-6 flex flex-col items-center text-center">
        <h2 className="text-4xl md:text-5xl font-black font-goothif mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <ScanSearch className="w-10 h-10 text-white" />, title: "1. Upload", desc: "Upload an image of any fruit you want to test." },
            { icon: <Cpu className="w-10 h-10 text-white" />, title: "2. Analyze", desc: "Our YOLOv8 & MobileNet pipeline identifies and analyzes each object." },
            { icon: <ShieldCheck className="w-10 h-10 text-white" />, title: "3. Result", desc: "Get real-time feedback on freshness and potential adulteration." },
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.2 }}
              className="flex flex-col items-center bg-gray-50 border border-gray-100 p-8 rounded-3xl"
            >
              <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-black/20">
                {item.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
              <p className="text-gray-600 text-balance">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Technology Used */}
      <section className="w-full bg-black text-white py-32 flex flex-col items-center text-center">
        <div className="max-w-6xl px-6 w-full">
          <h2 className="text-4xl md:text-5xl font-black font-goothif mb-16">Powered by State-of-the-Art ML</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
};
export default InfoSections;
