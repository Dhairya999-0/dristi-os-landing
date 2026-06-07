import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Send,
  Sparkles,
  Volume2,
  Languages,
  Terminal,
  MessageSquare,
  Trash2,
  Info,
  X,
  Monitor
} from "lucide-react";

export default function LaptopSimulator({ theme, lang, setLang, onboardingState, setOnboardingState, onVoiceAction, speak, registerDemoTrigger }) {
  const [demoState, setDemoState] = useState("idle"); // idle, processing, finished
  const [messages, setMessages] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [textCommand, setTextCommand] = useState("");
  const [showQuickCommands, setShowQuickCommands] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(true);

  const timers = useRef([]);
  const inputRef = useRef(null);

  const isHighContrast = theme === "high-contrast";

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  // Monitor onboarding lifecycle
  useEffect(() => {
    if (onboardingState === "waiting_lang" || onboardingState === "completed") {
      if (inputRef.current) inputRef.current.focus();
    }
  }, [onboardingState]);

  // Register external hotkey trigger
  useEffect(() => {
    if (registerDemoTrigger) {
      registerDemoTrigger(() => {
        if (inputRef.current) inputRef.current.focus();
      });
    }
  }, [lang, registerDemoTrigger]);

  const speakText = (text, langCode = lang) => {
    if (speak) speak(text, langCode);
  };

  // Parse voice/text commands
  const processCommand = (inputText) => {
    const textCleaned = inputText.trim().toLowerCase();
    let action = "", target = "", state = "", voiceConfirmation = "", matched = false;
    const isNepali = lang === "ne";

    const englishFeatures = {
      "Bilingual Voice Layer": ["bilingual voice layer", "bilingual voice", "bilingual", "voice layer"],
      "Computer Vision Lens": ["computer vision lens", "computer vision", "vision lens", "lens", "camera", "vision"],
      "Wayfinding Guide": ["wayfinding guide", "wayfinding", "way finding", "navigation", "route"],
      "Spatial Soundscape": ["spatial soundscape", "spatial sound", "soundscape", "spatial"],
      "High Contrast": ["high contrast", "contrast", "contrast mode"],
      "Screen Reader": ["screen reader", "voice guidance", "audio guidance"]
    };

    const nepaliFeatures = {
      "Bilingual Voice Layer": ["द्विभाषी आवाज", "भ्वाइस लेयर", "द्विभाषी", "भाषा"],
      "Computer Vision Lens": ["कम्प्युटर भिजन", "भिजन लेन्स", "भिजन", "क्यामेरा", "लेंस"],
      "Wayfinding Guide": ["नेभिगेसन", "वेफाइन्डिङ", "बाटो", "दूरी"],
      "Spatial Soundscape": ["साउण्डस्केप", "ध्वनि", "आवाज"],
      "High Contrast": ["हाई कन्ट्रास्ट", "कन्ट्रास्ट"],
      "Screen Reader": ["स्क्रिन रिडर", "भ्वाइस गाइड"]
    };

    const englishOptions = {
      "Home": ["home", "hero", "introduction", "welcome"],
      "Capabilities": ["capabilities", "features", "explore capabilities"],
      "Core Engine": ["core engine", "technology", "engine", "core"],
      "Tutorial": ["tutorial", "how to use", "guide"],
      "Nepal Vision": ["nepal vision", "vision statement", "nepal"]
    };

    const nepaliOptions = {
      "Home": ["गृह पृष्ठ", "सुरु", "होम", "मुख्य पृष्ठ"],
      "Capabilities": ["क्षमता", "विशेषता", "कार्यहरू"],
      "Core Engine": ["इन्जिन", "कोर इन्जिन", "प्रविधि"],
      "Tutorial": ["ट्यूटोरियल", "प्रयोग गर्ने तरिका"],
      "Nepal Vision": ["नेपाल भिजन", "नेपाल", "दृष्टिकोण"]
    };

    let detectedFeature = "", detectedState = "";

    if (!isNepali) {
      if (textCleaned.includes("turn on") || textCleaned.includes("enable") || textCleaned.includes("activate")) detectedState = "ON";
      else if (textCleaned.includes("turn off") || textCleaned.includes("disable") || textCleaned.includes("deactivate")) detectedState = "OFF";
      else if (textCleaned.includes("toggle")) detectedState = "TOGGLE";
      for (const [key, aliases] of Object.entries(englishFeatures)) {
        if (aliases.some(a => textCleaned.includes(a))) { detectedFeature = key; break; }
      }
    } else {
      if (textCleaned.includes("अन गर") || textCleaned.includes("चालु गर") || textCleaned.includes("सुरु गर")) detectedState = "ON";
      else if (textCleaned.includes("अफ गर") || textCleaned.includes("बन्द गर")) detectedState = "OFF";
      else if (textCleaned.includes("टगल") || textCleaned.includes("परिवर्तन गर")) detectedState = "TOGGLE";
      for (const [key, aliases] of Object.entries(nepaliFeatures)) {
        if (aliases.some(a => textCleaned.includes(a))) { detectedFeature = key; break; }
      }
    }

    if (detectedFeature && detectedState) {
      action = "TOGGLE_SWITCH"; target = detectedFeature; state = detectedState; matched = true;
      voiceConfirmation = !isNepali
        ? `Switching ${target} ${state === "TOGGLE" ? "state" : state.toLowerCase()}.`
        : `${target} ${state === "ON" ? "अन भयो" : state === "OFF" ? "अफ भयो" : "परिवर्तन भयो"}।`;
    }

    if (!matched) {
      let detectedOption = "";
      const opts = isNepali ? nepaliOptions : englishOptions;
      for (const [key, aliases] of Object.entries(opts)) {
        if (aliases.some(a => textCleaned.includes(a))) { detectedOption = key; break; }
      }
      if (detectedOption) {
        action = "SELECT_OPTION"; target = detectedOption; matched = true;
        voiceConfirmation = !isNepali ? `Going to ${target}.` : `${target} मा जाँदैछ।`;
      }
    }

    if (matched) {
      const payload = { action, target };
      if (action === "TOGGLE_SWITCH") payload.state = state;
      return { matched: true, payload, voiceConfirmation };
    } else {
      voiceConfirmation = !isNepali
        ? "Command not recognized. Try: 'Turn on High Contrast' or 'Go to Nepal Vision'."
        : "मैले बुझिन। 'हाई कन्ट्रास्ट अन गर' वा 'नेपाल भिजन छान' प्रयास गर्नुहोस्।";
      return { matched: false, voiceConfirmation };
    }
  };

  const handleUserCommandInput = (commandText) => {
    if (!commandText || commandText.trim() === "") return;

    if (onboardingState === "waiting_lang") {
      const textCleaned = commandText.trim().toLowerCase();
      if (textCleaned.includes("one") || textCleaned === "1" || textCleaned.includes("english") || textCleaned.includes("वान")) {
        setLang("en");
        setMessages(prev => [...prev,
          { role: "user", text: commandText },
          { role: "assistant", text: "English selected. Initiating tutorial guide..." }
        ]);
        setOnboardingState("teaching");
        return;
      } else if (textCleaned.includes("two") || textCleaned === "2" || textCleaned.includes("nepali") || textCleaned.includes("दुई") || textCleaned.includes("टु")) {
        setLang("ne");
        setMessages(prev => [...prev,
          { role: "user", text: commandText },
          { role: "assistant", text: "नेपाली भाषा चयन गरियो। ट्यूटोरियल सुरु गरिँदैछ..." }
        ]);
        setOnboardingState("teaching");
        return;
      } else {
        const errorText = lang === "ne"
          ? "मैले बुझिन। एक वा दुई टाइप गर्नुहोस्।"
          : "Please type 1 for English or 2 for Nepali.";
        setMessages(prev => [...prev, { role: "user", text: commandText }, { role: "assistant", text: errorText }]);
        speakText(errorText, lang);
        return;
      }
    }

    setDemoState("processing");
    setMessages(prev => [...prev, { role: "user", text: commandText }]);

    const delay = setTimeout(async () => {
      const result = processCommand(commandText);
      let llmResponse = null;
      try {
        const { processWithLLM } = await import("../api/llm.js");
        llmResponse = await processWithLLM(commandText, lang);
      } catch (e) {}

      const voiceResponse = llmResponse || result.voiceConfirmation;

      if (result.matched) {
        setConsoleLogs(prev => [{ time: new Date().toLocaleTimeString(), command: commandText, payload: result.payload, status: "SUCCESS" }, ...prev]);
        if (onVoiceAction) onVoiceAction(result.payload);
        setMessages(prev => [...prev,
          { role: "assistant", text: voiceResponse },
          { role: "system", text: `Action dispatched: ${JSON.stringify(result.payload)}`, status: "success" }
        ]);
        speakText(voiceResponse, lang);
        setDemoState("finished");
      } else {
        setConsoleLogs(prev => [{ time: new Date().toLocaleTimeString(), command: commandText, payload: null, status: "ERROR_UNMATCHED" }, ...prev]);
        setMessages(prev => [...prev, { role: "assistant", text: voiceResponse }]);
        speakText(voiceResponse, lang);
        setDemoState("idle");
      }
    }, 650);

    timers.current.push(delay);
  };

  const handleLangToggle = (selectedLang) => {
    setLang(selectedLang);
    setDemoState("idle");
    speakText(selectedLang === "en" ? "Language changed to English" : "भाषा नेपालीमा परिवर्तन भयो", selectedLang);
  };

  const clearLogsAndMessages = () => {
    setMessages([]);
    setConsoleLogs([]);
    setDemoState("idle");
  };

  const quickCommandsList = lang === "en"
    ? ["Turn on High Contrast", "Select Capabilities", "Go to Nepal Vision", "Toggle Screen Reader", "Core Engine"]
    : ["हाई कन्ट्रास्ट अन गर", "क्षमता रोज", "नेपाल भिजन छान", "भ्वाइस बन्द गर", "वेफाइन्डिङ चालु गर"];

  return (
    <div className="flex flex-col items-center w-full max-w-[520px]">
      {/* Language selector above laptop */}
      <div className="flex items-center gap-3 mb-5 select-none">
        <span className={`text-xs font-semibold tracking-wide ${isHighContrast ? "text-yellow-400" : "text-slate-500 dark:text-slate-400"}`}>
          {lang === "en" ? "Language:" : "भाषा:"}
        </span>
        <div className={`flex p-0.5 rounded-lg border ${isHighContrast ? "border-white bg-black" : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
          <button
            onClick={() => handleLangToggle("en")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${lang === "en"
              ? isHighContrast ? "bg-yellow-400 text-black" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            English
          </button>
          <button
            disabled
            className="px-3 py-1.5 rounded-md text-xs font-bold text-slate-400 dark:text-slate-600 cursor-not-allowed flex items-center gap-1"
            title="Nepali language support is coming soon in a future update"
          >
            नेपाली (Coming Soon)
          </button>
        </div>
      </div>

      {/* ──────────── LAPTOP FRAME ──────────── */}
      <div className="w-full laptop-frame">
        {/* Screen lid */}
        <div className={`w-full rounded-t-xl border-t border-l border-r overflow-hidden relative transition-all duration-300
          ${isHighContrast ? "bg-black border-white" : theme === "light" ? "bg-slate-800 border-slate-700 shadow-2xl" : "bg-[#1a1b26] border-slate-700/60 shadow-2xl"}
        `}
          style={{ aspectRatio: "16/10", minHeight: 300 }}
        >
          {/* Camera notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-600 border border-slate-500 z-30" />

          {/* Screen bezel padding */}
          <div className={`absolute inset-0 m-1 rounded-lg overflow-hidden flex flex-col transition-colors duration-300
            ${isHighContrast ? "bg-black" : theme === "light" ? "bg-white text-slate-800" : "bg-[#0d0e18] text-slate-100"}
          `}>
            {/* OS top bar */}
            <div className={`flex items-center justify-between px-3 py-1.5 border-b text-[10px] font-semibold select-none
              ${isHighContrast ? "border-white/20 text-white" : "border-white/5 text-slate-400"}
            `}>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
                <span>Dristi Assist — {lang === "en" ? "English" : "नेपाली"}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTerminal(v => !v)}
                  title={showTerminal ? "Chat View" : "Dev Console"}
                  className={`p-1 rounded hover:bg-white/10 transition-colors ${showTerminal ? "text-yellow-400" : "opacity-50"}`}
                >
                  {showTerminal ? <MessageSquare className="w-3 h-3" /> : <Terminal className="w-3 h-3" />}
                </button>
                <button onClick={clearLogsAndMessages} title="Clear" className="p-1 rounded hover:bg-white/10 opacity-50 hover:opacity-100 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Main screen content */}
            <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2 min-h-0">

              {/* Onboarding overlay */}
              <AnimatePresence>
                {onboardingState !== "completed" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 m-1 rounded-lg z-20 flex flex-col items-center justify-center gap-4 p-6 text-center
                      ${isHighContrast ? "bg-black" : theme === "light" ? "bg-white" : "bg-[#0d0e18]"}
                    `}
                  >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center border
                      ${isHighContrast ? "border-yellow-400 bg-black" : "border-slate-700 bg-slate-800"}
                    `}>
                      <Monitor className="w-7 h-7 text-yellow-400" />
                    </div>

                    {onboardingState === "greeting" && (
                      <div className="space-y-2">
                        <h4 className={`font-bold text-sm ${isHighContrast ? "text-yellow-400" : "text-white"}`}>Welcome Onboarding</h4>
                        <p className="text-[11px] text-slate-400 animate-pulse">Speaking welcome message...</p>
                        <p className="text-[10px] text-slate-500 italic">(स्वागत सन्देश पढ्दैछ...)</p>
                      </div>
                    )}

                    {onboardingState === "waiting_lang" && (
                      <div className="space-y-3 w-full max-w-xs">
                        <h4 className={`font-bold text-sm ${isHighContrast ? "text-yellow-400" : "text-white"}`}>
                          Choose Language / भाषा रोज्नुहोस्
                        </h4>
                        <p className="text-[11px] text-slate-400 animate-pulse">Type 1 for English · Type 2 for नेपाली</p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleUserCommandInput("1")}
                            className={`p-3 rounded-xl border text-xs font-bold transition-all hover:scale-[1.02]
                              ${isHighContrast ? "border-yellow-400 text-yellow-400 bg-black hover:bg-yellow-400 hover:text-black" : "border-slate-700 text-white bg-slate-800 hover:bg-slate-700"}
                            `}
                          >
                            <div>Type 1</div>
                            <div className="text-[9px] font-normal opacity-60 mt-0.5">English</div>
                          </button>
                          <button
                            onClick={() => handleUserCommandInput("2")}
                            className={`p-3 rounded-xl border text-xs font-bold transition-all hover:scale-[1.02]
                              ${isHighContrast ? "border-yellow-400 text-yellow-400 bg-black hover:bg-yellow-400 hover:text-black" : "border-slate-700 text-white bg-slate-800 hover:bg-slate-700"}
                            `}
                          >
                            <div>Type 2</div>
                            <div className="text-[9px] font-normal opacity-60 mt-0.5">नेपाली</div>
                          </button>
                        </div>
                      </div>
                    )}

                    {onboardingState === "teaching" && (
                      <div className="space-y-2">
                        <h4 className={`font-bold text-sm ${isHighContrast ? "text-yellow-400" : "text-white"}`}>
                          {lang === "en" ? "Loading Tutorial..." : "ट्यूटोरियल लोड हुँदैछ..."}
                        </h4>
                        <div className={`font-mono text-[10px] text-left rounded-lg p-3 border space-y-1 max-w-xs
                          ${isHighContrast ? "border-white/20 text-white" : "border-slate-700 bg-slate-900 text-slate-300"}
                        `}>
                          <div className="text-yellow-400">&gt; Configuring voice layer</div>
                          <div className="text-yellow-400">&gt; Synthesizing vocal map</div>
                          <div className="text-slate-500 animate-pulse">&gt; Booting bilingual ASR...</div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat / Console area */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {showTerminal ? (
                  <div className={`flex-1 rounded-lg border p-3 font-mono text-[10px] overflow-y-auto
                    ${isHighContrast ? "border-white/20 bg-black text-white" : "border-slate-700/50 bg-slate-950 text-slate-300"}
                  `}>
                    <div className={`text-[9px] font-bold border-b pb-1.5 mb-2 flex justify-between
                      ${isHighContrast ? "border-white/20 text-yellow-400" : "border-slate-700 text-yellow-400"}
                    `}>
                      <span>BACKEND ACTION LOG</span>
                      <span className="animate-pulse opacity-70">DRISTI-OS v1.0</span>
                    </div>
                    {consoleLogs.length === 0
                      ? <div className="text-slate-600 italic">No logs yet. Type commands to dispatch actions...</div>
                      : consoleLogs.map((log, i) => (
                        <div key={i} className="border-b border-slate-800/60 pb-1.5 mb-1.5 last:border-0">
                          <div className="flex justify-between text-[8.5px] text-slate-500 mb-0.5">
                            <span>[{log.time}]</span>
                            <span className={log.status === "SUCCESS" ? "text-green-400 font-bold" : "text-red-400"}>{log.status}</span>
                          </div>
                          <div className="text-yellow-400 truncate">&gt; "{log.command}"</div>
                          {log.payload
                            ? <pre className="text-green-400 mt-1 bg-black/40 rounded p-1.5 overflow-x-auto border border-slate-800 leading-normal">{JSON.stringify(log.payload, null, 2)}</pre>
                            : <div className="text-red-400 mt-0.5 italic">Error: intent unrecognized.</div>
                          }
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-2 pr-0.5">
                    {messages.length === 0 && demoState === "idle" && onboardingState === "completed" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 flex flex-col items-center justify-center text-center p-4 select-none"
                      >
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3
                          ${isHighContrast ? "border-yellow-400 bg-black" : "border-slate-700 bg-slate-800"}
                        `}>
                          <Sparkles className="w-5 h-5 text-yellow-400" />
                        </div>
                        <h4 className={`font-bold text-xs mb-1 ${isHighContrast ? "text-yellow-400" : "text-white"}`}>
                          {lang === "en" ? "Dristi Assistant Ready" : "द्विभाषी आवाज सहायक"}
                        </h4>
                        <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
                          {lang === "en"
                            ? "Type commands below or click chips to control the page."
                            : "तल आदेश टाइप गर्नुहोस् वा चिप्स थिच्नुहोस्।"}
                        </p>
                      </motion.div>
                    )}

                    <div className="mt-auto flex flex-col gap-2">
                      {messages.map((msg, index) => {
                        if (msg.role === "user") return (
                          <motion.div key={index} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
                            <div className={`max-w-[80%] rounded-xl px-3 py-1.5 text-[11px] font-medium
                              ${isHighContrast ? "bg-yellow-400 text-black" : "bg-white/10 text-white border border-white/10"}
                            `}>
                              {msg.text}
                            </div>
                          </motion.div>
                        );
                        if (msg.role === "system") return (
                          <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5 items-start">
                            <div className={`p-0.5 rounded text-[8px] mt-0.5 border flex-shrink-0
                              ${msg.status === "error" ? "border-red-700 text-red-400" : msg.status === "success" ? "border-green-700 text-green-400" : "border-slate-700 text-slate-400"}
                            `}>
                              <Info className="w-2 h-2" />
                            </div>
                            <div className={`text-[9px] font-mono leading-tight opacity-75
                              ${msg.status === "error" ? "text-red-400" : msg.status === "success" ? "text-green-400" : "text-slate-500"}
                            `}>
                              {msg.text}
                            </div>
                          </motion.div>
                        );
                        if (msg.role === "assistant") return (
                          <motion.div key={index} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-start">
                            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border
                              ${isHighContrast ? "border-yellow-400 bg-black text-yellow-400" : "border-slate-700 bg-slate-800 text-yellow-400"}
                            `}>
                              <Volume2 className="w-2.5 h-2.5" />
                            </div>
                            <div className={`flex-1 rounded-xl px-3 py-1.5 text-[11px] font-medium leading-relaxed border
                              ${isHighContrast ? "border-yellow-400/40 text-yellow-300 bg-black" : "border-slate-700/60 bg-slate-800/80 text-slate-200"}
                            `}>
                              {msg.text}
                            </div>
                          </motion.div>
                        );
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick command chips */}
              {showQuickCommands && onboardingState === "completed" && (
                <div className={`border-t pt-2 ${isHighContrast ? "border-white/20" : "border-white/5"}`}>
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider opacity-50 mb-1.5 px-0.5">
                    <span>{lang === "en" ? "Quick Commands" : "द्रुत आदेश"}</span>
                    <button onClick={() => setShowQuickCommands(false)} className="p-0.5 hover:opacity-100 rounded">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
                    {quickCommandsList.map((cmd, i) => (
                      <button
                        key={i}
                        onClick={() => handleUserCommandInput(cmd)}
                        disabled={demoState === "processing"}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap snap-center border transition-all active:scale-95 flex-shrink-0
                          ${isHighContrast
                            ? "border-yellow-400 text-yellow-400 bg-black hover:bg-yellow-400 hover:text-black"
                            : "border-slate-700 text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:border-slate-600 hover:text-white"}
                          ${demoState === "processing" ? "opacity-40 cursor-not-allowed" : ""}
                        `}
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Command input bar */}
              <div className={`border-t pt-2.5 ${isHighContrast ? "border-white/20" : "border-white/5"}`}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUserCommandInput(textCommand);
                    setTextCommand("");
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={textCommand}
                      onChange={(e) => setTextCommand(e.target.value)}
                      disabled={demoState === "processing"}
                      placeholder={lang === "en" ? "Type a command… (e.g. Turn on High Contrast)" : "आदेश टाइप गर्नुहोस्…"}
                      className={`w-full rounded-lg px-3 py-2 text-[11px] border focus:outline-none transition-all placeholder:opacity-40
                        ${isHighContrast
                          ? "bg-black border-white/50 text-white focus:border-yellow-400"
                          : "bg-slate-800 border-slate-700 text-white focus:border-slate-500"}
                        ${demoState === "processing" ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!textCommand.trim() || demoState === "processing"}
                    className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1.5 flex-shrink-0
                      ${isHighContrast
                        ? "border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300"
                        : "border-slate-600 bg-white/10 text-white hover:bg-white/15"}
                      ${(!textCommand.trim() || demoState === "processing") ? "opacity-40 cursor-not-allowed" : ""}
                    `}
                  >
                    <Send className="w-3 h-3" />
                    <span>Run</span>
                  </button>
                </form>

                {/* Status bar */}
                <div className="flex items-center justify-between mt-2 h-5">
                  <div className="flex items-center gap-1.5">
                    {demoState === "processing" && (
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce" />
                        <div className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce [animation-delay:0.15s]" />
                        <div className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce [animation-delay:0.3s]" />
                        <span className="text-[9px] font-mono text-yellow-400 ml-1">Processing...</span>
                      </div>
                    )}
                    {demoState === "finished" && (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-green-400">
                        <Check className="w-2.5 h-2.5" />
                        <span>{lang === "en" ? "Action executed" : "कार्य सफल"}</span>
                      </div>
                    )}
                    {demoState === "idle" && (
                      <span className={`text-[9px] font-mono opacity-30 flex items-center gap-1 ${isHighContrast ? "text-yellow-400" : "text-slate-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full bg-green-400 inline-block`} />
                        {lang === "en" ? "Ready" : "तयार"}
                      </span>
                    )}
                  </div>
                  {!showQuickCommands && (
                    <button
                      onClick={() => setShowQuickCommands(true)}
                      className={`text-[9px] font-semibold transition-colors ${isHighContrast ? "text-yellow-400 hover:text-yellow-300" : "text-slate-500 hover:text-slate-300"}`}
                    >
                      + Chips
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Laptop hinge */}
        <div className={`w-full h-2 rounded-b-sm transition-colors
          ${isHighContrast ? "bg-white/20" : theme === "light" ? "bg-slate-600" : "bg-slate-700"}
        `} />

        {/* Laptop base / keyboard area */}
        <div className={`w-full rounded-b-xl py-3 px-4 border-l border-r border-b relative flex items-center justify-center transition-all duration-300
          ${isHighContrast ? "bg-black border-white" : theme === "light" ? "bg-slate-200 border-slate-300 shadow-xl" : "bg-[#1a1b26] border-slate-700/60"}
        `}>
          {/* Keyboard texture rows */}
          <div className="flex flex-col gap-1 w-full max-w-[280px]">
            {[10, 12, 11, 10].map((count, row) => (
              <div key={row} className="flex gap-1 justify-center">
                {Array.from({ length: count }).map((_, k) => (
                  <div
                    key={k}
                    className={`h-2 rounded-[3px] flex-1 max-w-[22px] opacity-50 transition-colors
                      ${isHighContrast ? "bg-white/30" : theme === "light" ? "bg-slate-400/40" : "bg-slate-600/40"}
                    `}
                  />
                ))}
              </div>
            ))}
            {/* Spacebar */}
            <div className="flex justify-center mt-0.5">
              <div className={`h-2 w-28 rounded-[3px] opacity-40 ${isHighContrast ? "bg-white/30" : theme === "light" ? "bg-slate-400/40" : "bg-slate-600/40"}`} />
            </div>
          </div>
          {/* Trackpad */}
          <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-md border opacity-30
            ${isHighContrast ? "border-white" : theme === "light" ? "border-slate-500" : "border-slate-600"}
          `} />
        </div>
      </div>
    </div>
  );
}
