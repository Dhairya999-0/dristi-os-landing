import React from "react";
import { Sun, Moon, Eye } from "lucide-react";

export default function ThemeToggle({ theme, cycleTheme }) {
  const getThemeDetails = () => {
    switch (theme) {
      case "dark":
        return { icon: <Moon className="w-4 h-4" />, label: "Dark Mode", tooltip: "Switch to Light Mode" };
      case "light":
        return { icon: <Sun className="w-4 h-4" />, label: "Light Mode", tooltip: "Switch to High Contrast" };
      case "high-contrast":
        return { icon: <Eye className="w-4 h-4 text-yellow-400" />, label: "High Contrast", tooltip: "Switch to Dark Mode" };
      default:
        return { icon: <Moon className="w-4 h-4" />, label: "Cycle Theme", tooltip: "Cycle Theme" };
    }
  };

  const details = getThemeDetails();

  return (
    <div className="relative group">
      <button
        onClick={cycleTheme}
        aria-label={details.label}
        title={details.tooltip}
        className={`flex items-center justify-center p-2.5 rounded-lg border transition-all duration-200
          ${theme === "dark"
            ? "bg-white/5 border-white/10 text-slate-300 hover:border-white/20 hover:text-white"
            : theme === "light"
            ? "bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
            : "bg-black border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"}
        `}
      >
        {details.icon}
      </button>
      <span className="pointer-events-none absolute -bottom-9 right-0 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-slate-950 text-white text-[10px] px-2 py-1 rounded-md shadow-lg z-[60] border border-white/10">
        {details.tooltip} <kbd className="ml-1 px-1 py-0.5 bg-white/10 rounded text-[9px]">T</kbd>
      </span>
    </div>
  );
}
