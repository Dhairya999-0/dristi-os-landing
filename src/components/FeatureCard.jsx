import React from "react";
import { motion } from "framer-motion";

export default function FeatureCard({ icon: Icon, title, description, index, theme }) {
  const isHighContrast = theme === "high-contrast";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
      className={`relative rounded-2xl p-6 transition-all duration-300 border flex flex-col items-start text-left
        ${isHighContrast
          ? "bg-black border-2 border-white hover:border-yellow-400"
          : theme === "light"
          ? "bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200"
          : "bg-white/3 border-white/8 hover:border-white/18 hover:bg-white/5"}
      `}
    >
      {/* Icon Frame */}
      <div className={`p-3 rounded-xl mb-5 flex items-center justify-center border
        ${isHighContrast
          ? "bg-black border-yellow-400 text-yellow-400"
          : theme === "light"
          ? "bg-slate-50 border-slate-200 text-slate-700"
          : "bg-white/5 border-white/10 text-yellow-400"}
      `}>
        <Icon className="w-5 h-5" />
      </div>

      <h3 className={`text-lg font-bold tracking-tight mb-2
        ${isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}
      `}>
        {title}
      </h3>

      <p className={`text-sm leading-relaxed
        ${isHighContrast ? "text-white/70" : theme === "light" ? "text-slate-500" : "text-slate-400"}
      `}>
        {description}
      </p>
    </motion.div>
  );
}
