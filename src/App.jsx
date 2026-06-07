import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Brain,
  Map,
  Volume2,
  VolumeX,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  Shield,
  Cpu,
  Keyboard,
  Heart,
  HelpCircle,
  Navigation,
  Globe
} from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import FeatureCard from "./components/FeatureCard";

export default function App() {
  const shouldReduceMotion = useReducedMotion();

  const getInitialTheme = () => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const [theme, setTheme] = useState(getInitialTheme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showHotkeyGuide, setShowHotkeyGuide] = useState(true);
  const [lang, setLang] = useState("en");
  const [showGithubPopup, setShowGithubPopup] = useState(false);
  const [onboardingState, setOnboardingState] = useState("completed");

  const simulatorTriggerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playVideo = () => {
      if (video.paused) {
        video.play().catch((err) => {
          console.warn("Video playback was prevented or interrupted: ", err);
        });
      }
    };

    // Try starting playback
    playVideo();

    // Event listeners to force continuous playing/looping
    const handlePause = () => {
      playVideo();
    };

    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", playVideo);

    // Failsafe polling to ensure it keeps playing
    const interval = setInterval(() => {
      if (video.paused) {
        playVideo();
      }
    }, 1000);

    return () => {
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", playVideo);
      clearInterval(interval);
    };
  }, []);

  // Helper to play Google Translate TTS
  const playGoogleTTS = (text, langCode = "ne") => {
    return new Promise((resolve, reject) => {
      try {
        window.speechSynthesis.cancel();
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${langCode}&client=tw-ob`;
        const audio = new Audio(url);
        audio.onended = () => resolve();
        audio.onerror = (e) => reject(e);
        audio.play().catch((err) => reject(err));
      } catch (e) {
        reject(e);
      }
    });
  };

  // Web Speech Synthesis handler
  const speak = (text, utteranceLang = "en") => {
    if (!audioEnabled) return Promise.resolve();

    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    const hasNativeNepali = voices.some(v => v.lang.toLowerCase().startsWith("ne"));

    if (utteranceLang === "ne") {
      if (hasNativeNepali) {
        return new Promise((resolve) => {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.lang = "ne-NP";
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();
            window.speechSynthesis.speak(utterance);
          } catch (e) { resolve(); }
        });
      } else {
        return playGoogleTTS(text, "ne").catch(() => {
          return new Promise((resolve) => {
            try {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.rate = 0.95;
              utterance.lang = "hi-IN";
              utterance.onend = () => resolve();
              utterance.onerror = () => resolve();
              window.speechSynthesis.speak(utterance);
            } catch (e) { resolve(); }
          });
        }).then(() => {}).catch(() => {});
      }
    } else {
      return new Promise((resolve) => {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          utterance.lang = "en-US";
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        } catch (e) { resolve(); }
      });
    }
  };

  // Welcome onboarding — triggers on first interaction
  useEffect(() => {
    let triggered = false;

    const runWelcomeOnboarding = async () => {
      if (triggered) return;
      triggered = true;

      try {
        await speak("Welcome to Dristi OS. Voice guidance is active.", "en");
      } catch (e) {
        console.error("Onboarding speech failed:", e);
      }
    };

    const handleFirstInteraction = () => {
      runWelcomeOnboarding();
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);
    window.addEventListener("touchstart", handleFirstInteraction);

    return cleanup;
  }, [audioEnabled]);

  // Tutorial speech after language selected
  useEffect(() => {
    if (onboardingState === "teaching") {
      const runTutorialSpeech = async () => {
        try {
          if (lang === "en") {
            await speak(
              "English selected. Welcome to Dristi OS. You can navigate sections by scrolling, or use the command terminal to control the page. Try typing: Turn on High Contrast, or Go to Nepal Vision. Let us begin!",
              "en"
            );
          } else {
            await speak(
              "नेपाली भाषा चयन गरियो। दृष्टि ओएसमा स्वागत छ। तपाईं स्क्रोल गरेर खण्डहरूमा जान सक्नुहुन्छ। टर्मिनलमा टाइप गर्नुहोस्: हाई कन्ट्रास्ट अन गर, वा नेपाल भिजन छान। सुरु गरौँ!",
              "ne"
            );
          }
          setOnboardingState("completed");
        } catch (e) {
          console.error("Tutorial speak failed:", e);
          setOnboardingState("completed");
        }
      };
      runTutorialSpeech();
    }
  }, [onboardingState, lang]);

  // Voice command execution
  const handleVoiceAction = (payload) => {
    const { action, target, state } = payload;

    if (action === "TOGGLE_SWITCH") {
      const normalizedTarget = target.toLowerCase();
      if (normalizedTarget.includes("high contrast") || normalizedTarget.includes("हाई कन्ट्रास्ट")) {
        if (state === "ON") setTheme("high-contrast");
        else if (state === "OFF") setTheme("dark");
        else cycleTheme();
      } else if (
        normalizedTarget.includes("screen reader") ||
        normalizedTarget.includes("voice guidance") ||
        normalizedTarget.includes("भ्वाइस") ||
        normalizedTarget.includes("audio")
      ) {
        if (state === "ON") setAudioEnabled(true);
        else if (state === "OFF") { setAudioEnabled(false); window.speechSynthesis.cancel(); }
        else toggleAudio();
      }
    } else if (action === "SELECT_OPTION") {
      const normalizedTarget = target.toLowerCase();
      let sectionId = "";
      if (normalizedTarget.includes("home") || normalizedTarget.includes("hero")) sectionId = "hero";
      else if (normalizedTarget.includes("capabilities") || normalizedTarget.includes("features") || normalizedTarget.includes("क्षमता")) sectionId = "features";
      else if (normalizedTarget.includes("core engine") || normalizedTarget.includes("technology") || normalizedTarget.includes("इन्जिन")) sectionId = "technology";
      else if (normalizedTarget.includes("tutorial") || normalizedTarget.includes("how to use")) sectionId = "tutorial";
      else if (normalizedTarget.includes("nepal vision") || normalizedTarget.includes("vision") || normalizedTarget.includes("नेपाल")) sectionId = "vision";

      if (sectionId) {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
        setActiveSection(sectionId);
      }
    }
  };

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "high-contrast") {
      document.documentElement.classList.add("theme-high-contrast");
    } else {
      document.documentElement.classList.remove("theme-high-contrast");
    }
  }, [theme]);

  // Section scroll → auto-narrate
  useEffect(() => {
    if (!audioEnabled || !activeSection) return;

    const playTutorial = (tutorialLang) => {
      try {
        const text = tutorialLang === "ne"
          ? "ट्यूटोरियलमा स्वागत छ। दृष्टि ओएस सेटअप गर्नको लागि हाम्रो गिटहब रिपोजिटरीमा जानुहोस्।"
          : "Welcome to the tutorial. To set up Dristi OS, access our repository which is currently under construction.";
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.lang = tutorialLang === "ne" ? "ne-NP" : "en-US";
        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    };

    try {
      window.speechSynthesis.cancel();

      let navText = "";
      if (lang === "ne") {
        const sectionNamesNe = {
          hero: "गृह खण्डमा नेभिगेट गरियो",
          features: "कार्य क्षमता खण्डमा नेभिगेट गरियो",
          technology: "मुख्य इन्जिन खण्डमा नेभिगेट गरियो",
          tutorial: "वेबसाइट प्रयोग गर्ने तरिका खण्डमा नेभिगेट गरियो",
          vision: "नेपाल दृष्टिकोण खण्डमा नेभिगेट गरियो"
        };
        navText = sectionNamesNe[activeSection] || "नयाँ खण्डमा नेभिगेट गरियो";
      } else {
        const sectionNamesEn = {
          hero: "Navigated to Home section",
          features: "Navigated to Capabilities section",
          technology: "Navigated to Core Engine section",
          tutorial: "Navigated to How to Use section",
          vision: "Navigated to Nepal Vision section"
        };
        navText = sectionNamesEn[activeSection] || `Navigated to ${activeSection} section`;
      }

      const navUtterance = new SpeechSynthesisUtterance(navText);
      navUtterance.rate = 1.0;
      navUtterance.lang = lang === "ne" ? "ne-NP" : "en-US";
      if (activeSection === "tutorial") {
        navUtterance.onend = () => playTutorial(lang);
      }
      window.speechSynthesis.speak(navUtterance);
    } catch (e) {}
  }, [activeSection, lang, audioEnabled]);

  const toggleAudio = () => {
    const nextState = !audioEnabled;
    setAudioEnabled(nextState);
    if (nextState) {
      setTimeout(() => {
        speak(lang === "ne" ? "भ्वाइस गाइड सक्षम भयो।" : "Voice guidance enabled.", lang);
      }, 100);
    } else {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [mobileMenuOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const keyHandler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const key = e.key.toLowerCase();
      if (key === "t") cycleTheme();
      else if (key === "a" || key === "m") toggleAudio();
      else if (key === "?") setShowHotkeyGuide(v => !v);
      else if (key === " " || key === "s") {
        if (e.key === " ") e.preventDefault();
        if (simulatorTriggerRef.current) simulatorTriggerRef.current();
      }
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [theme, audioEnabled]);

  // Scroll section spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(entry => { if (entry.isIntersecting) setActiveSection(entry.target.id); }),
      { threshold: 0.3 }
    );
    document.querySelectorAll("section").forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const cycleTheme = () => {
    setTheme(t => t === "dark" ? "light" : t === "light" ? "high-contrast" : "dark");
  };

  const isHighContrast = theme === "high-contrast";

  const navigationItems = [
    { id: "hero", label: "Home" },
    { id: "features", label: "Capabilities" },
    { id: "technology", label: "Core Engine" },
    { id: "tutorial", label: "How to Use" },
    { id: "vision", label: "Nepal Vision" }
  ];

  const featuresList = [
    {
      icon: Volume2,
      title: "Natural Voice Conversation",
      description: "Real-time speech recognition and voice response powered by Cartesia and Deepgram APIs."
    },
    {
      icon: Globe,
      title: "Vision-Based Web Agents",
      description: "AI agents see and interact with web pages using vision-based understanding and Stagehand API automation to complete multi-step tasks."
    },
    {
      icon: Cpu,
      title: "System Control",
      description: "Beyond the browser, controls desktop applications like Spotify and VSCode using custom system-level API integrations."
    },
    {
      icon: Brain,
      title: "Electron & LLM Core",
      description: "Always-on-top transparent desktop interface built on Electron 33, featuring liquid glass refraction and custom Anthropic Claude agent tooling."
    }
  ];

  return (
    <div
      className={`min-h-screen relative overflow-x-hidden font-sans transition-colors duration-300 pb-12
        ${isHighContrast
          ? "bg-black text-white"
          : theme === "light"
          ? "bg-white text-slate-900"
          : "bg-[#080914] text-slate-200"
        }
      `}
    >
      {/* Launch/Onboarding Click Overlay removed to allow direct page load */}

      {/* Subtle background accent — dark only */}
      {!isHighContrast && theme === "dark" && (
        <div className="absolute top-0 inset-x-0 h-[600px] pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-32 left-1/3 w-[400px] h-[400px] rounded-full blur-[140px] opacity-20 bg-white" />
          <div className="absolute top-40 right-1/4 w-[300px] h-[300px] rounded-full blur-[120px] opacity-10 bg-yellow-400" />
        </div>
      )}

      {/* HEADER */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b
          ${isHighContrast
            ? "bg-black border-2 border-white"
            : theme === "light"
            ? "bg-white/90 border-slate-200/80 backdrop-blur-md shadow-sm"
            : "bg-[#080914]/85 border-white/5 backdrop-blur-md"}
        `}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-2.5 font-bold tracking-tight text-xl focus:ring-2 focus:ring-offset-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border
              ${isHighContrast ? "border-yellow-400 bg-black" : theme === "light" ? "border-slate-200 bg-black" : "border-white/10 bg-white/5"}
            `}>
              <Sparkles className={`w-3.5 h-3.5 ${isHighContrast ? "text-yellow-400" : "text-white"}`} />
            </div>
            <span className={isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}>
              Dristi<span className={isHighContrast ? "text-yellow-400" : "text-yellow-400"}>‑OS</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navigationItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`text-sm font-medium tracking-wide transition-all duration-200 relative py-1.5 focus:outline-none
                  ${isHighContrast
                    ? activeSection === item.id ? "text-yellow-400 font-extrabold underline" : "text-white hover:text-yellow-400"
                    : activeSection === item.id
                    ? theme === "light" ? "text-slate-900 font-bold" : "text-white font-bold"
                    : theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"}
                `}
              >
                {item.label}
                {activeSection === item.id && !isHighContrast && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className={`absolute bottom-0 inset-x-0 h-0.5 rounded-full ${theme === "light" ? "bg-slate-900" : "bg-yellow-400"}`}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </a>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2.5">
            {/* Audio toggle */}
            <button
              onClick={toggleAudio}
              aria-label={audioEnabled ? "Disable Voice Guidance" : "Enable Voice Guidance"}
              title={audioEnabled ? "Mute Voice Guide" : "Unmute Voice Guide"}
              className={`p-2.5 rounded-lg border transition-all duration-200
                ${isHighContrast
                  ? audioEnabled ? "bg-yellow-400 border-yellow-400 text-black" : "bg-black border-white text-white"
                  : audioEnabled
                  ? theme === "light" ? "bg-black border-black text-white" : "bg-white/10 border-white/10 text-white"
                  : theme === "light" ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-white/5 border-white/5 text-slate-400"}
              `}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <ThemeToggle theme={theme} cycleTheme={cycleTheme} />

            {/* GitHub button */}
            <button
              onClick={() => setShowGithubPopup(true)}
              aria-label="GitHub Repository"
              title="GitHub Repository"
              className={`p-2.5 rounded-lg border transition-all duration-200
                ${isHighContrast
                  ? "bg-black border-white text-white hover:border-yellow-400"
                  : theme === "light"
                  ? "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300"
                  : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:border-white/10"}
              `}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </button>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label="Toggle menu"
              className={`md:hidden p-2 rounded-lg border transition-colors
                ${isHighContrast
                  ? "bg-black border-white text-white hover:border-yellow-400"
                  : theme === "light"
                  ? "bg-slate-100 border-slate-200 text-slate-700"
                  : "bg-white/5 border-white/5 text-slate-400 hover:text-white"}
              `}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className={`fixed top-0 right-0 bottom-0 w-3/4 max-w-sm z-40 p-6 pt-24 flex flex-col justify-between shadow-2xl border-l
                ${isHighContrast ? "bg-black border-white text-white" : theme === "light" ? "bg-white border-slate-200" : "bg-[#0d0e18] border-white/5"}
              `}
            >
              <nav className="flex flex-col gap-6">
                {navigationItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-lg font-semibold border-b pb-2 transition-all
                      ${isHighContrast
                        ? activeSection === item.id ? "text-yellow-400 border-white underline" : "text-white border-white/20 hover:text-yellow-400"
                        : activeSection === item.id
                        ? "text-yellow-400 border-yellow-400/20 font-bold"
                        : theme === "light" ? "text-slate-700 border-slate-200 hover:text-slate-900" : "text-slate-400 border-white/5 hover:text-white"}
                    `}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <button
                onClick={toggleAudio}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all
                  ${isHighContrast
                    ? "bg-black border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                    : theme === "light"
                    ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                    : "bg-white/5 border-white/10 text-white hover:bg-white/10"}
                `}
              >
                {audioEnabled ? "Disable Voice Guidance" : "Enable Voice Guidance"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── HERO SECTION ─── */}
      <section
        id="hero"
        className="min-h-screen pt-28 pb-12 px-6 flex items-center justify-center max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center w-full">
          {/* Hero content */}
          <div className="lg:col-span-6 text-left space-y-7 select-none z-10">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold
              ${isHighContrast ? "border-yellow-400 text-yellow-400 bg-black" : theme === "light" ? "border-slate-200 text-slate-600 bg-slate-50" : "border-white/10 text-slate-400 bg-white/5"}
            `}>
              <Cpu className="w-3.5 h-3.5" />
              <span>Voice-First Desktop Overlay</span>
            </div>

            <h1 className={`text-4xl sm:text-5xl lg:text-[52px] font-extrabold leading-[1.12] tracking-tight
              ${isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}
            `}>
              A Conversational,{" "}
              <span className={isHighContrast ? "text-yellow-400" : "text-yellow-400"}>Agentic OS</span> Built for{" "}
              <span className={isHighContrast ? "text-yellow-400" : "text-yellow-400"}>Independence</span>
            </h1>

            <div className="space-y-6">
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isHighContrast ? "text-yellow-400" : "text-yellow-400"}`}>Our Inspiration</h3>
                <p className={`text-sm sm:text-base leading-relaxed
                  ${isHighContrast ? "text-white/80" : theme === "light" ? "text-slate-600" : "text-slate-400"}
                `}>
                  Our childhood best friend is legally blind. Growing up and navigating the increasingly technology-dependent world was tedious and profoundly boring. Screen readers haven't changed in 15 years. They read pages linearly, break on inaccessible websites, and require dozens of memorized keyboard shortcuts just to do what a sighted person does with a glance. A sighted person doesn't read every element on Amazon, but a screen reader forces it. Why should it work like that? A visually impaired user should get the same experience. For what has become one of the most overlooked issues in modern day society, posing a $7 billion loss to companies every year, we hope to bridge the gap between visual impairment and the growth of technology.
                </p>
              </div>

              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isHighContrast ? "text-yellow-400" : "text-yellow-400"}`}>What Dristi-OS Does</h3>
                <p className={`text-sm sm:text-base leading-relaxed
                  ${isHighContrast ? "text-white/80" : theme === "light" ? "text-slate-600" : "text-slate-400"}
                `}>
                  Dristi-OS is a fully conversational agentic operating system for visually-impaired users. Instead of simply listing every element on the screen, it speaks to you to learn and take the best possible action on your behalf. This allows a seamless shopping experience—including the purchase of medically-aware items with complete context—and even allows users to code programs with just their voice. We architected a multi-agent, multi-turn system with complete context and several voice-controlled agents capable of controlling your browser and computer.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <a
                href="#features"
                className={`px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 group hover:scale-[1.01] active:scale-[0.99]
                  ${isHighContrast
                    ? "bg-yellow-400 text-black border-2 border-yellow-400 hover:bg-yellow-300"
                    : theme === "light"
                    ? "bg-black text-white hover:bg-slate-800"
                    : "bg-white text-black hover:bg-slate-100"}
                `}
              >
                <span>Explore Capabilities</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>

              <a
                href="#technology"
                className={`px-6 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all duration-200
                  ${isHighContrast
                    ? "bg-black border-white text-white hover:border-yellow-400 hover:text-yellow-400"
                    : theme === "light"
                    ? "bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:text-slate-900"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"}
                `}
              >
                Core Engine
              </a>

              <button
                onClick={() => setShowGithubPopup(true)}
                className={`px-6 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all duration-200
                  ${isHighContrast
                    ? "bg-black border-white text-white hover:border-yellow-400 hover:text-yellow-400"
                    : theme === "light"
                    ? "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"}
                `}
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Setup Guide
              </button>
            </div>

            {/* Keyboard hint */}
            <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono pt-4 border-t
              ${isHighContrast ? "border-white/20" : theme === "light" ? "border-slate-200" : "border-white/5"}
            `}>
              <span className={`flex items-center gap-1.5 ${isHighContrast ? "text-yellow-400" : "text-slate-400"}`}>
                <Keyboard className="w-3.5 h-3.5" />
                <span><kbd className={`px-1.5 py-0.5 rounded border text-[10px] ${isHighContrast ? "bg-black border-yellow-400 text-yellow-400" : theme === "light" ? "bg-slate-100 border-slate-300 text-slate-600" : "bg-white/5 border-white/10 text-slate-300"}`}>T</kbd> Theme</span>
              </span>
              <span className={`flex items-center gap-1.5 ${isHighContrast ? "text-yellow-400" : "text-slate-400"}`}>
                <span><kbd className={`px-1.5 py-0.5 rounded border text-[10px] ${isHighContrast ? "bg-black border-yellow-400 text-yellow-400" : theme === "light" ? "bg-slate-100 border-slate-300 text-slate-600" : "bg-white/5 border-white/10 text-slate-300"}`}>M</kbd> Mute</span>
              </span>
              <span className={`flex items-center gap-1.5 ${isHighContrast ? "text-yellow-400" : "text-slate-400"}`}>
                <span><kbd className={`px-1.5 py-0.5 rounded border text-[10px] ${isHighContrast ? "bg-black border-yellow-400 text-yellow-400" : theme === "light" ? "bg-slate-100 border-slate-300 text-slate-600" : "bg-white/5 border-white/10 text-slate-300"}`}>?</kbd> Shortcuts</span>
              </span>
            </div>
          </div>

          {/* Video Demo */}
          <div className="lg:col-span-6 flex justify-center z-10 w-full">
            <div className={`relative w-full max-w-2xl rounded-2xl overflow-hidden border transition-all duration-300 shadow-2xl
              ${isHighContrast 
                ? "border-2 border-yellow-400 bg-black" 
                : theme === "light" 
                ? "border-slate-200 bg-white" 
                : "border-white/10 bg-white/5"}
            `}>
              {/* Decorative top bar */}
              <div className={`flex items-center justify-between px-4 py-2 border-b text-[11px] font-semibold select-none
                ${isHighContrast ? "border-yellow-400/20 text-white" : theme === "light" ? "border-slate-200 text-slate-500" : "border-white/5 text-slate-400"}
              `}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/80" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/80" />
                  <div className="w-2 h-2 rounded-full bg-green-500/80" />
                </div>
                <div className="font-mono text-[10px] opacity-80">demo-video.mp4</div>
                <div className="w-10" />
              </div>
              
              {/* Video aspect container */}
              <div className="relative aspect-video w-full bg-black">
                <video
                  ref={videoRef}
                  src="/demo-video.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CAPABILITIES SECTION ─── */}
      <section
        id="features"
        className={`py-24 px-6 border-t max-w-7xl mx-auto text-center
          ${isHighContrast ? "border-white" : theme === "light" ? "border-slate-100" : "border-white/5"}
        `}
      >
        <div className="max-w-2xl mx-auto space-y-3 mb-16 select-none">
          <span className={`text-xs font-bold uppercase tracking-widest ${isHighContrast ? "text-yellow-400" : "text-yellow-400"}`}>Core Capabilities</span>
          <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}`}>
            Bilingual Voice & Spatial Guidance
          </h2>
          <p className={`text-sm ${isHighContrast ? "text-white/70" : theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
            Dristi-OS bypasses traditional nested screen layouts. It acts as an ambient cognitive layer that talks back in your native language.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuresList.map((feature, i) => (
            <FeatureCard
              key={i}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={i}
              theme={theme}
            />
          ))}
        </div>
      </section>

      {/* ─── CORE ENGINE SECTION ─── */}
      <section
        id="technology"
        className={`py-24 px-6 border-t max-w-7xl mx-auto
          ${isHighContrast ? "border-white" : theme === "light" ? "border-slate-100" : "border-white/5"}
        `}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Text */}
          <div className="lg:col-span-6 space-y-6 text-left select-none">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold
              ${isHighContrast ? "border-yellow-400 text-yellow-400 bg-black" : theme === "light" ? "border-slate-200 text-slate-600 bg-slate-50" : "border-white/10 text-slate-400 bg-white/5"}
            `}>
              <Cpu className="w-3.5 h-3.5" />
              <span>Desktop & API Integration</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}`}>
              Desktop Overlay & Multi-Agent Core
            </h2>
            <p className={isHighContrast ? "text-white/70" : theme === "light" ? "text-slate-600" : "text-slate-400"}>
              Dristi-OS leverages high-performance APIs and desktop processes. The Electron container provides a transparent overlay UI, while the server coordinates the multi-agent logic.
            </p>

            <div className="space-y-5 pt-2">
              {[
                { title: "Real-Time Voice API Stream", text: "Utilizes Deepgram for Speech-to-Text translation and Cartesia for natural, duplex Text-to-Speech vocal output." },
                { title: "Liquid Glass Desktop Overlay", text: "Built on Electron 33 with liquid-glass-react to provide a transparent, always-on-top window toggleable via global hotkey." },
                { title: "Multi-Agent System Core", text: "Coordinates general assistance, browser automation (via Stagehand), and VSCode/Spotify desktop application control." },
                { title: "Future Roadmap Features", text: "Planned additions include custom tray icons, keyboard configuration, window persistence, auto-updaters, and localized Nepali support." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border
                    ${isHighContrast ? "border-yellow-400 bg-black text-yellow-400" : theme === "light" ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-white/5 text-white"}
                  `}>
                    <span className="text-[10px] font-bold font-mono">{i + 1}</span>
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}`}>{item.title}</h4>
                    <p className={`text-xs mt-0.5 leading-relaxed ${isHighContrast ? "text-white/60" : theme === "light" ? "text-slate-500" : "text-slate-400"}`}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual block */}
          <div className="lg:col-span-6">
            <div className={`rounded-2xl p-8 border text-left select-none transition-all duration-300
              ${isHighContrast
                ? "bg-black border-2 border-white text-white"
                : theme === "light"
                ? "bg-white border-slate-200 shadow-lg"
                : "bg-white/3 border-white/8"}
            `}>
              <h3 className={`font-bold text-lg mb-6 flex items-center gap-2 ${isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}`}>
                <Shield className={`w-5 h-5 ${isHighContrast ? "text-yellow-400" : "text-yellow-400"}`} />
                On-Device Action Cycle
              </h3>

              <div className="space-y-6 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-current/10">
                {[
                  { title: "Desktop Voice Capture", detail: "Listens to user commands in real-time through standard mic input and Deepgram STT.", icon: Keyboard },
                  { title: "Multi-Agent Coordinator", detail: "Processes user intents through Anthropic Claude models and triggers browser or application tools.", icon: Brain },
                  { title: "Audio & System Execution", detail: "Delivers responsive spoken guidance via Cartesia TTS and operates system-level hotkeys.", icon: Volume2 }
                ].map((step, i) => (
                  <div key={i} className="flex gap-4 relative z-10">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm border
                      ${isHighContrast ? "bg-black border-yellow-400" : theme === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}
                    `}>
                      <step.icon className={`w-4 h-4 ${isHighContrast ? "text-yellow-400" : "text-yellow-400"}`} />
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}`}>{step.title}</h4>
                      <p className={`text-xs mt-0.5 leading-relaxed ${isHighContrast ? "text-white/60" : theme === "light" ? "text-slate-500" : "text-slate-400"}`}>{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TUTORIAL & STATS SECTION ─── */}
      <section
        id="tutorial"
        className={`py-24 px-6 border-t max-w-7xl mx-auto
          ${isHighContrast ? "border-white" : theme === "light" ? "border-slate-100" : "border-white/5"}
        `}
      >
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-16 select-none">
          <span className={`text-xs font-bold uppercase tracking-widest ${isHighContrast ? "text-yellow-400" : "text-yellow-400"}`}>
            Tutorial & Data
          </span>
          <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}`}>
            How to Use & Visual Impairment Statistics
          </h2>
          <p className={`text-sm ${isHighContrast ? "text-white/70" : theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
            Learn how to navigate this accessibility portal and understand visual impairment metrics in Nepal and globally.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {[
            {
              icon: HelpCircle,
              title: "Dristi-OS Setup & Startup Guide",
              desc: "To initialize and start Dristi-OS (RCY) on your desktop, follow these commands from the repository README:",
              items: [
                { label: "1. Install Dependencies", info: "Run 'npm install' in both '/server' and '/electron' directories." },
                { label: "2. Configure Keys", info: "Add ANTHROPIC_API_KEY, CARTESIA_API_KEY, and DEEPGRAM_API_KEY to 'server/.env'." },
                { label: "3. Start Server", info: "Run 'npm run dev' inside the '/server' directory." },
                { label: "4. Start Electron App", info: "Run 'npm run dev' inside the '/electron' directory to launch the overlay." }
              ],
              cta: "Setup Guide on GitHub",
              ctaAction: () => setShowGithubPopup(true),
              accent: ""
            },
            {
              icon: Globe,
              title: "Global Accessibility Context",
              desc: "Visual impairment is a major global concern, affecting productivity and highlighting the critical need for localized digital bridges.",
              stats: [
                { value: "2.2B", label: "People globally live with some form of near or distance vision impairment according to the WHO." },
                { value: "$7B", label: "Estimated annual revenue loss for companies due to inaccessible web platforms." }
              ],
              note: "Dristi-OS bridges this massive gap by transforming web accessibility into a conversational interface.",
              accent: ""
            },
            {
              icon: Navigation,
              title: "Visual Impairments in Nepal",
              desc: "Developing nations like Nepal experience visual impairments acutely due to language barriers and deficient infrastructure.",
              stats: [
                { value: "1.5%", label: "Of Nepal's population (400,000+ citizens) live with vision impairment." },
                { value: "0", label: "Tactile paving or auditory crossing cues available outside Kathmandu." },
                { value: "85%+", label: "Of digital tools lack any Nepali-speaking screen readers." }
              ],
              note: "Nepali language support is planned for a future update; Dristi-OS runs solely in English for the current version.",
              accent: "cyan"
            }
          ].map((card, ci) => (
            <div
              key={ci}
              className={`rounded-2xl p-7 border flex flex-col justify-between transition-all duration-300
                ${isHighContrast
                  ? "bg-black border-2 border-white text-white"
                  : theme === "light"
                  ? "bg-white border-slate-100 shadow-sm hover:shadow-md"
                  : "bg-white/3 border-white/8 hover:border-white/15"}
              `}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  {card.icon && <card.icon className={`w-5 h-5 ${isHighContrast ? "text-yellow-400" : "text-yellow-400"}`} />}
                  <h3 className={`font-bold text-base ${isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}`}>{card.title}</h3>
                </div>
                <p className={`text-xs leading-relaxed ${isHighContrast ? "text-white/70" : theme === "light" ? "text-slate-600" : "text-slate-400"}`}>{card.desc}</p>

                {card.items && (
                  <ul className={`text-xs space-y-2 pl-3 list-disc leading-relaxed ${isHighContrast ? "text-white/70" : theme === "light" ? "text-slate-500" : "text-slate-400"}`}>
                    {card.items.map((it, k) => (
                      <li key={k}><strong className={isHighContrast ? "text-yellow-400" : theme === "light" ? "text-slate-800" : "text-white"}>{it.label}</strong>: {it.info}</li>
                    ))}
                  </ul>
                )}

                {card.stats && (
                  <div className="space-y-4 pt-1">
                    {card.stats.map((stat, k) => (
                      <div key={k} className="flex items-center gap-3">
                        <div className={`text-xl font-extrabold font-mono min-w-[50px] ${isHighContrast ? "text-yellow-400" : "text-yellow-400"}`}>{stat.value}</div>
                        <div className={`text-[11px] leading-snug ${isHighContrast ? "text-white/60" : theme === "light" ? "text-slate-500" : "text-slate-400"}`}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-5 mt-5 border-t border-current/10">
                {card.cta ? (
                  <button
                    onClick={card.ctaAction}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all
                      ${isHighContrast
                        ? "border-yellow-400 text-yellow-400 bg-black hover:bg-yellow-400 hover:text-black"
                        : theme === "light"
                        ? "border-black bg-black text-white hover:bg-slate-800"
                        : "border-white/10 bg-white/5 text-white hover:bg-white/10"}
                    `}
                  >
                    {card.cta}
                  </button>
                ) : (
                  <p className={`text-[11px] leading-relaxed ${isHighContrast ? "text-white/60" : theme === "light" ? "text-slate-500" : "text-slate-500"}`}>
                    <strong className={isHighContrast ? "text-yellow-400" : theme === "light" ? "text-slate-700" : "text-white/80"}>{ci === 1 ? "Key takeaway:" : "Focus area:"}</strong> {card.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── NEPAL VISION SECTION ─── */}
      <section
        id="vision"
        className={`py-24 px-6 border-t max-w-5xl mx-auto
          ${isHighContrast ? "border-white" : theme === "light" ? "border-slate-100" : "border-white/5"}
        `}
      >
        <div className={`rounded-2xl p-10 sm:p-14 text-center border relative overflow-hidden
          ${isHighContrast
            ? "bg-black border-2 border-yellow-400 text-white"
            : theme === "light"
            ? "bg-slate-50 border-slate-200 shadow-lg"
            : "bg-white/3 border-white/10"}
        `}>
          {!isHighContrast && (
            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-10 pointer-events-none ${theme === "light" ? "bg-yellow-400" : "bg-yellow-400"}`} />
          )}

          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <span className={`text-xs font-bold uppercase tracking-widest ${isHighContrast ? "text-yellow-400" : "text-yellow-400"}`}>Nepal Vision</span>
            <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}`}>
              Roadmap: Bridging the Digital Divide in Nepal
            </h2>
            <p className={`text-base sm:text-lg leading-relaxed ${isHighContrast ? "text-white/70" : theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
              Over 1.5% of Nepal's population lives with visual impairments. While Dristi-OS is currently English-only, we are actively designing localized Nepali ASR and currency OCR models. Our roadmap aims to bridge language barriers and physical infrastructure gaps, eventually enabling visually impaired Nepalese citizens to manage transactions, read localized text, and navigate local environments safely and with dignity.
            </p>
            <div className={`flex justify-center items-center gap-2.5 text-xs font-semibold pt-2 flex-wrap
              ${isHighContrast ? "text-yellow-400" : theme === "light" ? "text-slate-500" : "text-slate-500"}
            `}>
              <span className={`px-2.5 py-1 rounded-md border text-xs
                ${isHighContrast ? "border-yellow-400 text-yellow-400" : theme === "light" ? "border-slate-200 bg-slate-100 text-slate-600" : "border-white/10 bg-white/5 text-slate-400"}
              `}>Kathmandu, Nepal</span>
              <span>•</span>
              <span>South Asian Accessibility Project</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className={`py-10 border-t px-6 transition-colors duration-300
        ${isHighContrast
          ? "bg-black border-white text-white"
          : theme === "light"
          ? "bg-white border-slate-100 text-slate-600"
          : "bg-[#05060d] border-white/5 text-slate-500"}
      `}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded flex items-center justify-center border
              ${isHighContrast ? "border-yellow-400 bg-black" : theme === "light" ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/5"}
            `}>
              <Sparkles className={`w-3 ${isHighContrast ? "text-yellow-400" : "text-yellow-400"}`} />
            </div>
            <span className={`font-bold text-sm tracking-tight ${isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}`}>
              Dristi-OS
            </span>
          </div>

          <div className="text-xs font-mono opacity-50">
            © {new Date().getFullYear()} Dristi-OS Project. Empowering accessibility.
          </div>

          <div className="flex gap-4 items-center text-xs">
            <span className="flex items-center gap-1.5 opacity-60">
              Developed with dedication for inclusive computing
            </span>
          </div>
        </div>
      </footer>

      {/* ─── FLOATING ACCESSIBILITY WIDGET ─── */}
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3 select-none">
        <AnimatePresence>
          {showHotkeyGuide && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              className={`w-64 rounded-2xl p-5 border shadow-2xl text-left
                ${isHighContrast
                  ? "bg-black border-2 border-yellow-400 text-white"
                  : theme === "light"
                  ? "bg-white border-slate-200 text-slate-800 shadow-slate-200/50"
                  : "bg-[#0d0e18]/98 border-white/8 text-slate-100 backdrop-blur-md"}
              `}
            >
              <div className={`flex justify-between items-center border-b pb-2 mb-3 ${isHighContrast ? "border-white/20" : "border-current/10"}`}>
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isHighContrast ? "text-yellow-400" : ""}`}>
                  <Keyboard className="w-3.5 h-3.5" /> Shortcuts
                </span>
                <button
                  onClick={() => setShowHotkeyGuide(false)}
                  className="p-1 rounded hover:bg-current/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5 text-[11px]">
                <div className={`flex justify-between items-center p-1.5 rounded border ${isHighContrast ? "border-yellow-400/20 bg-yellow-400/5" : "border-current/5 bg-current/3"}`}>
                  <span className="opacity-70">Voice Guide:</span>
                  <button
                    onClick={toggleAudio}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border
                      ${audioEnabled
                        ? isHighContrast ? "bg-yellow-400 text-black border-yellow-400" : "bg-white text-black border-white"
                        : "bg-transparent text-current border-current/20 opacity-60"}
                    `}
                  >
                    {audioEnabled ? "Deactivate" : "Activate"}
                  </button>
                </div>

                <div className={`text-[10px] font-bold uppercase tracking-wider opacity-40 mt-2`}>Keyboard:</div>
                <div className="grid grid-cols-5 items-center gap-y-1.5 font-mono text-[10px]">
                  {[
                    ["T", "Cycle Themes"],
                    ["M", "Toggle Audio"],
                    ["?", "This Panel"]
                  ].map(([key, label]) => (
                    <React.Fragment key={key}>
                      <span className="col-span-1">
                        <kbd className={`px-1 py-0.5 rounded border text-[9px] ${isHighContrast ? "border-yellow-400 text-yellow-400 bg-black" : theme === "light" ? "border-slate-300 bg-slate-100 text-slate-700" : "border-white/15 bg-white/8 text-white"}`}>{key}</kbd>
                      </span>
                      <span className="col-span-4 pl-2 font-sans opacity-70">{label}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showHotkeyGuide && (
          <button
            onClick={() => setShowHotkeyGuide(true)}
            aria-label="Open Shortcuts"
            className={`p-3 rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95 border
              ${isHighContrast
                ? "bg-black border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                : theme === "light"
                ? "bg-black border-black text-white hover:bg-slate-800"
                : "bg-white/8 border-white/10 text-white hover:bg-white/15"}
            `}
          >
            <Keyboard className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ─── GITHUB MODAL ─── */}
      <AnimatePresence>
        {showGithubPopup && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowGithubPopup(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className={`relative z-10 w-full max-w-md rounded-2xl p-6 border shadow-2xl text-left
                ${isHighContrast
                  ? "bg-black border-yellow-400 text-white"
                  : theme === "light"
                  ? "bg-white border-slate-200 text-slate-800"
                  : "bg-[#0d0e18] border-white/10 text-slate-100"}
              `}
            >
              <button
                onClick={() => setShowGithubPopup(false)}
                className={`absolute top-4 right-4 p-2 rounded-lg hover:bg-current/10 transition-colors ${isHighContrast ? "text-yellow-400" : ""}`}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-5 border-b pb-4 border-current/10">
                <div className={`p-2 rounded-lg border ${isHighContrast ? "border-yellow-400 bg-black text-yellow-400" : theme === "light" ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/5"}`}>
                  <Sparkles className={`w-5 h-5 ${isHighContrast ? "text-yellow-400" : "text-yellow-400"}`} />
                </div>
                <div>
                  <h3 className={`font-extrabold text-base tracking-tight ${isHighContrast ? "text-white" : theme === "light" ? "text-slate-900" : "text-white"}`}>Repository Under Construction</h3>
                  <p className={`text-[10px] font-mono opacity-50 mt-0.5`}>Dristi-OS Installation Portal</p>
                </div>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isHighContrast ? "text-white/80" : theme === "light" ? "text-slate-600" : "text-slate-400"}>
                  The Dristi-OS open-source code repository is currently being updated for public availability.
                </p>
                <p className={isHighContrast ? "text-white/80" : theme === "light" ? "text-slate-600" : "text-slate-400"}>
                  We are packaging localization modules, offline Nepalese speech recognition configurations, and the spatial narration engine files.
                </p>
                <div className={`p-3.5 rounded-xl border font-mono text-[11px] space-y-1
                  ${isHighContrast ? "border-yellow-400/20 bg-yellow-400/5 text-white" : theme === "light" ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/8 bg-white/3 text-slate-300"}
                `}>
                  <div className="text-yellow-400 font-bold">&gt; Upcoming Packages:</div>
                  <div>• Native Bilingual ASR weights</div>
                  <div>• Spatial 3D Audio Narration framework</div>
                  <div>• Nepalese bank note OCR lenses</div>
                </div>
                <p className={`text-[10px] opacity-50 italic text-center pt-1`}>
                  GitHub repository link will be activated shortly. Please check back soon.
                </p>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setShowGithubPopup(false)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all hover:scale-[1.01] active:scale-[0.99]
                    ${isHighContrast
                      ? "bg-yellow-400 text-black hover:bg-yellow-300"
                      : theme === "light"
                      ? "bg-black text-white hover:bg-slate-800"
                      : "bg-white text-black hover:bg-slate-100"}
                  `}
                >
                  Close & Acknowledge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
