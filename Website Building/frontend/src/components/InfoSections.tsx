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
              className="bg-white/10 border border-white/20 p-10 rounded-3xl backdrop-blur-md"
            >
              <h3 className="text-3xl font-bold mb-4 font-goothif">YOLO Object Detection</h3>
              <p className="text-gray-300 mb-6 text-lg">
                YOLO rapidly scans the image, identifying multiple fruits in a single pass. It accurately draws bounding boxes around apples, bananas, and other produce, cropping them for further analysis.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-200"><CheckCircle2 className="w-5 h-5 mr-3 text-green-400"/> Micro-second inference times</li>
                <li className="flex items-center text-gray-200"><CheckCircle2 className="w-5 h-5 mr-3 text-green-400"/> Robust multi-object recognition</li>
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white/10 border border-white/20 p-10 rounded-3xl backdrop-blur-md"
            >
              <h3 className="text-3xl font-bold mb-4 font-goothif">MobileNetV2 Classification</h3>
              <p className="text-gray-300 mb-6 text-lg">
                Each detected crop is passed to our fine-tuned MobileNetV2 classifier. It extracts deep visual features to distinguish between natural textures, rotting patterns, and chemical adulterants.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-200"><CheckCircle2 className="w-5 h-5 mr-3 text-green-400"/> High accuracy on adulterant patterns</li>
                <li className="flex items-center text-gray-200"><CheckCircle2 className="w-5 h-5 mr-3 text-green-400"/> Grad-CAM Explainability visualizer</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Use Cases & Contact */}
      <section className="w-full max-w-6xl px-6 flex flex-col items-center text-center pb-24">
        <h2 className="text-4xl md:text-5xl font-black font-goothif mb-12">Who Is This For?</h2>
        <p className="text-xl text-gray-600 max-w-3xl mb-12 text-balance">
          Whether you are a health-conscious consumer, a grocery store QA inspector, or a supply-chain distributor, our tool ensures your fruits are safe, fresh, and strictly organic.
        </p>
        <button className="px-8 py-4 bg-black text-white rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-transform shadow-xl shadow-black/20">
          Contact Us for Enterprise Integration
        </button>
      </section>
    </div>
  );
}
