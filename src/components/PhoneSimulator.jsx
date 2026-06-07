import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Check,
  Send,
  Sparkles,
  Volume2,
  Languages,
  Terminal,
  MessageSquare,
  Trash2,
  Info,
  CornerDownLeft,
  X
} from "lucide-react";

export default function PhoneSimulator({ theme, lang, setLang, onboardingState, setOnboardingState, onVoiceAction, speak, registerDemoTrigger }) {
  const [demoState, setDemoState] = useState("idle"); // idle, listening, processing, finished
  const [messages, setMessages] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [textCommand, setTextCommand] = useState("");
  const [showQuickCommands, setShowQuickCommands] = useState(true);
  
  const timers = useRef([]);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isHighContrast = theme === "high-contrast";

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    return () => {
      clearTimers();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Monitor onboarding lifecycle to auto-trigger microphone listening
  useEffect(() => {
    if (onboardingState === "waiting_lang" || onboardingState === "completed") {
      const t = setTimeout(() => {
        startListeningSession();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [onboardingState]);

  // Register external keyboard hotkey (Space) to trigger voice listen
  useEffect(() => {
    if (registerDemoTrigger) {
      registerDemoTrigger(() => {
        if (demoState === "listening") {
          stopListeningSession();
        } else {
          launchAssistant();
        }
      });
    }
  }, [lang, demoState, registerDemoTrigger]);

  // Helper to trigger speech synthesis feedback (with fallback options)
  const speakText = (text, langCode = lang) => {
    if (speak) {
      speak(text, langCode);
    }
  };

  // Launch assistant directly without tutorial message
  const launchAssistant = () => {
    clearTimers();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    
    // Stop media recorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    setOnboardingState("completed");
    startListeningSession();
  };



  // Active microphone Speech Recognition session
  // Active microphone Speech Recognition session
  const startListeningSession = async () => {
    const useWhisper = !!import.meta.env.VITE_OPENAI_API_KEY;

    if (useWhisper) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          setDemoState("processing");
          const mimeType = mediaRecorderRef.current.mimeType;
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          let ext = 'webm';
          if (mimeType.includes('mp4')) ext = 'm4a';
          else if (mimeType.includes('ogg')) ext = 'ogg';

          try {
            const { transcribeAudio } = await import("../api/llm.js");
            const transcript = await transcribeAudio(audioBlob, ext);
            if (transcript && transcript.trim()) {
              handleUserCommandInput(transcript);
            } else {
              setDemoState("idle");
              setMessages(prev => [...prev, { role: "assistant", text: lang === "en" ? "I didn't catch anything. Please try again." : "मैले केही सुनिन। कृपया फेरि प्रयास गर्नुहोस्।" }]);
            }
          } catch (e) {
            console.error(e);
            setDemoState("idle");
            setMessages(prev => [...prev, { role: "system", text: `Whisper transcription failed: ${e.message}`, status: "error" }]);
          }
          // Cleanup tracks
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setDemoState("listening");
        setMessages(prev => [
          ...prev,
          {
            role: "system",
            text: lang === "en" ? "Microphone active. Say a command..." : "माइक सक्रिय छ। आफ्नो कमान्ड बोल्नुहोस्...",
            status: "info"
          }
        ]);

        // Auto-stop after 6 seconds to simulate push-to-talk
        const timer = setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        }, 6000);
        timers.current.push(timer);

      } catch (e) {
        setMessages(prev => [...prev, { role: "system", text: `Microphone access denied: ${e.message}`, status: "error" }]);
        setDemoState("idle");
      }
      return;
    }

    if (!SpeechRecognition) {
      setMessages(prev => [
        ...prev,
        {
          role: "system",
          text: "Browser mic speech recognition not supported. Please use the Quick Commands or type in the box below.",
          status: "error"
        }
      ]);
      setDemoState("idle");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang === "ne" ? "ne-NP" : "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setDemoState("listening");
      setMessages(prev => [
        ...prev,
        {
          role: "system",
          text: lang === "en" ? "Microphone active. Say a command..." : "माइक सक्रिय छ। आफ्नो कमान्ड बोल्नुहोस्...",
          status: "info"
        }
      ]);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleUserCommandInput(transcript);
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error, event);
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }

      setDemoState("idle");
      
      let errorText = "";
      if (event.error === "not-allowed") {
        errorText = lang === "en"
          ? "Microphone access blocked. Please type commands or use quick chips."
          : "माइक अनुमति अस्वीकृत। कृपया टाइप गर्नुहोस् वा द्रुत चिप्स प्रयोग गर्नुहोस्।";
      } else {
        errorText = lang === "en"
          ? "I didn't quite catch that. Could you say it again?"
          : "मैले बुझिन, कृपया फेरि भन्नुहोस्।";
      }

      setMessages(prev => [
        ...prev,
        { role: "system", text: `Speech recognition error: ${event.error}`, status: "error" },
        { role: "assistant", text: errorText }
      ]);
      
      speakText(errorText, lang);
    };

    recognition.onend = () => {
      if (demoState === "listening" && (onboardingState === "waiting_lang" || onboardingState === "completed")) {
        const t = setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.log("Speech recognition restart skipped:", e);
          }
        }, 120);
        timers.current.push(t);
      } else {
        setDemoState(current => (current === "listening" ? "idle" : current));
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setDemoState("idle");
    }
  };

  // Stop current speech recognition
  const stopListeningSession = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      return;
    }
    setDemoState("idle");
  };

  // Parse voice commands and execute system state changes
  const processCommand = (inputText) => {
    const textCleaned = inputText.trim().toLowerCase();
    
    let action = "";
    let target = "";
    let state = "";
    let voiceConfirmation = "";
    let matched = false;

    const isNepali = lang === "ne";

    // Feature details mapping
    const englishFeatures = {
      "Bilingual Voice Layer": ["bilingual voice layer", "bilingual voice", "bilingual", "voice layer", "translation"],
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
      "Screen Reader": ["स्क्रिन रिडर", "स्क्रिनरिवडर", "भ्वाइस गाइड"]
    };

    // Options details mapping (navigation sections)
    const englishOptions = {
      "Home": ["home", "hero", "introduction", "welcome"],
      "Capabilities": ["capabilities", "features", "explore capabilities"],
      "Core Engine": ["core engine", "technology", "engine", "core"],
      "Tutorial": ["tutorial", "how to use", "guide"],
      "Nepal Vision": ["nepal vision", "vision statement", "nepal"]
    };

    const nepaliOptions = {
      "Home": ["गृह पृष्ठ", "सुरु", "होम", "मुख्य पृष्ठ", "स्टार्ट"],
      "Capabilities": ["क्षमता", "विशेषता", "कार्यहरू", "सेवाहरू"],
      "Core Engine": ["इन्जिन", "कोर इन्जिन", "प्रविधि"],
      "Tutorial": ["ट्यूटोरियल", "प्रयोग गर्ने तरिका", "निर्देशिका"],
      "Nepal Vision": ["नेपाल भिजन", "नेपाल", "दृष्टिकोण"]
    };

    // Toggle switch matching
    let detectedFeature = "";
    let detectedState = "";

    if (!isNepali) {
      // States
      if (textCleaned.includes("turn on") || textCleaned.includes("enable") || textCleaned.includes("start") || textCleaned.includes("activate")) {
        detectedState = "ON";
      } else if (textCleaned.includes("switch off") || textCleaned.includes("turn off") || textCleaned.includes("disable") || textCleaned.includes("stop") || textCleaned.includes("deactivate")) {
        detectedState = "OFF";
      } else if (textCleaned.includes("toggle")) {
        detectedState = "TOGGLE";
      }

      // Feature extraction
      for (const [key, aliases] of Object.entries(englishFeatures)) {
        if (aliases.some(alias => textCleaned.includes(alias))) {
          detectedFeature = key;
          break;
        }
      }
    } else {
      // States
      if (textCleaned.includes("अन गर") || textCleaned.includes("चालु गर") || textCleaned.includes("खोल्नुहोस्") || textCleaned.includes("सुरु गर")) {
        detectedState = "ON";
      } else if (textCleaned.includes("अफ गर") || textCleaned.includes("बन्द गर") || textCleaned.includes("निस्क्रिय गर")) {
        detectedState = "OFF";
      } else if (textCleaned.includes("टगल") || textCleaned.includes("परिवर्तन गर")) {
        detectedState = "TOGGLE";
      }

      // Feature extraction
      for (const [key, aliases] of Object.entries(nepaliFeatures)) {
        if (aliases.some(alias => textCleaned.includes(alias))) {
          detectedFeature = key;
          break;
        }
      }
    }

    if (detectedFeature && detectedState) {
      action = "TOGGLE_SWITCH";
      target = detectedFeature;
      state = detectedState;
      matched = true;

      if (!isNepali) {
        voiceConfirmation = `Switching ${target} ${state === "TOGGLE" ? "state" : state.toLowerCase()}.`;
      } else {
        voiceConfirmation = `${target} ${state === "ON" ? "अन भयो" : state === "OFF" ? "अफ भयो" : "परिवर्तन भयो"}।`;
      }
    }

    // Option selection matching
    if (!matched) {
      let detectedOption = "";

      if (!isNepali) {
        for (const [key, aliases] of Object.entries(englishOptions)) {
          if (aliases.some(alias => textCleaned.includes(alias))) {
            detectedOption = key;
            break;
          }
        }
      } else {
        for (const [key, aliases] of Object.entries(nepaliOptions)) {
          if (aliases.some(alias => textCleaned.includes(alias))) {
            detectedOption = key;
            break;
          }
        }
      }

      if (detectedOption) {
        action = "SELECT_OPTION";
        target = detectedOption;
        matched = true;

        if (!isNepali) {
          voiceConfirmation = `Going to ${target}.`;
        } else {
          voiceConfirmation = `${target} मा जाँदैछ।`;
        }
      }
    }

    if (matched) {
      const payload = { action, target };
      if (action === "TOGGLE_SWITCH") {
        payload.state = state;
      }
      return { matched: true, payload, voiceConfirmation };
    } else {
      voiceConfirmation = !isNepali
        ? "I didn't quite catch that. Could you say it again?"
        : "मैले बुझिन, कृपया फेरि भन्नुहोस्।";
      return { matched: false, voiceConfirmation };
    }
  };

  // Main intake pipeline for user command entries (voice or text)
  const handleUserCommandInput = (commandText) => {
    if (!commandText || commandText.trim() === "") return;

    if (onboardingState === "waiting_lang") {
      const textCleaned = commandText.trim().toLowerCase();
      if (
        textCleaned.includes("one") || 
        textCleaned === "1" || 
        textCleaned.includes("english") ||
        textCleaned.includes("वान")
      ) {
        setLang("en");
        setMessages(prev => [
          ...prev, 
          { role: "user", text: commandText },
          { role: "assistant", text: "English selected. Initiating tutorial guide..." }
        ]);
        setOnboardingState("teaching");
        return;
      } else if (
        textCleaned.includes("two") || 
        textCleaned === "2" || 
        textCleaned.includes("nepali") || 
        textCleaned.includes("एक") || 
        textCleaned.includes("दुई") || 
        textCleaned.includes("टु")
      ) {
        setLang("ne");
        setMessages(prev => [
          ...prev, 
          { role: "user", text: commandText },
          { role: "assistant", text: "नेपाली भाषा चयन गरियो। ट्यूटोरियल सुरु गरिँदैछ..." }
        ]);
        setOnboardingState("teaching");
        return;
      } else if (textCleaned.includes("एक") || textCleaned.includes("वन")) {
        setLang("en");
        setMessages(prev => [
          ...prev, 
          { role: "user", text: commandText },
          { role: "assistant", text: "English selected. Initiating tutorial guide..." }
        ]);
        setOnboardingState("teaching");
        return;
      } else {
        const errorText = lang === "ne" 
          ? "मैले बुझिन, कृपया फेरि भन्नुहोस्। एक वा दुई भन्नुहोस्।"
          : "I didn't quite catch that. Please say one or two.";
        setMessages(prev => [
          ...prev,
          { role: "user", text: commandText },
          { role: "assistant", text: errorText }
        ]);
        speakText(errorText, lang);
        return;
      }
    }

    setDemoState("processing");
    setMessages(prev => [...prev, { role: "user", text: commandText }]);

    // Simulated short cognitive processing delay
    const delay = setTimeout(async () => {
      const result = processCommand(commandText);
      
      let llmResponse = null;
      try {
        const { processWithLLM } = await import("../api/llm.js");
        llmResponse = await processWithLLM(commandText, lang);
      } catch (e) {
        console.warn("LLM API not configured or failed:", e);
      }

      const voiceResponse = llmResponse || result.voiceConfirmation;
      
      if (result.matched) {
        const payloadStr = JSON.stringify(result.payload);
        
        // Dispatch to app backend console
        setConsoleLogs(prev => [
          {
            time: new Date().toLocaleTimeString(),
            command: commandText,
            payload: result.payload,
            status: "SUCCESS"
          },
          ...prev
        ]);

        // Propagate changes directly to landing page
        if (onVoiceAction) {
          onVoiceAction(result.payload);
        }

        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            text: voiceResponse
          },
          {
            role: "system",
            text: `Dispatched action payload: ${payloadStr}`,
            status: "success"
          }
        ]);

        speakText(voiceResponse, lang);
        setDemoState("finished");
      } else {
        setConsoleLogs(prev => [
          {
            time: new Date().toLocaleTimeString(),
            command: commandText,
            payload: null,
            status: "ERROR_UNMATCHED"
          },
          ...prev
        ]);

        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            text: voiceResponse
          }
        ]);

        speakText(voiceResponse, lang);
        setDemoState("idle");
      }
    }, 850);

    timers.current.push(delay);
  };

  const handleLangToggle = (selectedLang) => {
    setLang(selectedLang);
    setDemoState("idle");
    if (selectedLang === "en") {
      speakText("Language changed to English", "en");
    } else {
      speakText("भाषा नेपालीमा परिवर्तन भयो", "ne");
    }
  };

  const clearLogsAndMessages = () => {
    setMessages([]);
    setConsoleLogs([]);
    setDemoState("idle");
  };

  // Ready-to-use quick interactive chips
  const quickCommandsList = lang === "en" 
    ? [
        "Turn on High Contrast",
        "Switch off Screen Reader",
        "Select Capabilities",
        "Go to Nepal Vision",
        "Toggle Bilingual Voice Layer"
      ]
    : [
        "हाई कन्ट्रास्ट अन गर",
        "भ्वाइस बन्द गर",
        "क्षमता रोज",
        "नेपाल भिजन छान",
        "वेफाइन्डिङ चालु गर"
      ];

  return (
    <div className="flex flex-col items-center">
      {/* Top Selector Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6 select-none max-w-sm">
        {/* Toggle Speech Assistant Initialization */}
        <button
          onClick={() => {
            if (demoState === "listening") {
              stopListeningSession();
            } else {
              launchAssistant();
            }
          }}
          className={`px-5 py-2.5 rounded-full font-bold flex items-center gap-2.5 transition-all duration-300 shadow-md group hover:scale-[1.02] active:scale-[0.98]
            ${
              isHighContrast
                ? "bg-white text-black border-4 border-yellow-400 hover:bg-yellow-400"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/15"
            }
          `}
        >
          <Mic className={`w-4 h-4 ${demoState === "listening" ? "animate-pulse" : ""}`} />
          <span className="text-xs">
            {demoState === "listening"
              ? lang === "en" ? "Stop Listening" : "सुन्न रोक्नुहोस्"
              : lang === "en" ? "Speak / Launch Assistant" : "सहायक सुरु गर्नुहोस्"}
          </span>
        </button>

        {/* Language selector buttons */}
        <div
          className={`flex p-1 rounded-full border
            ${isHighContrast ? "border-white bg-black" : "bg-slate-200/50 dark:bg-slate-900 border-slate-300/40 dark:border-slate-800"}
          `}
        >
          <button
            onClick={() => handleLangToggle("en")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all
              ${
                lang === "en"
                  ? isHighContrast
                    ? "bg-white text-black border border-white"
                    : "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-indigo-600"
              }
            `}
          >
            English
          </button>
          <button
            onClick={() => handleLangToggle("ne")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all
              ${
                lang === "ne"
                  ? isHighContrast
                    ? "bg-white text-black border border-white"
                    : "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-indigo-600"
              }
            `}
          >
            नेपाली
          </button>
        </div>
      </div>

      {/* iPhone Device Wrapper */}
      <div
        className={`relative w-[325px] h-[610px] rounded-[52px] p-3 transition-all duration-500 shadow-2xl flex flex-col justify-between overflow-hidden
          ${
            isHighContrast
              ? "bg-black border-4 border-white"
              : theme === "light"
              ? "bg-slate-100 border-[9px] border-slate-900 shadow-slate-350"
              : "bg-slate-950 border-[9px] border-slate-800 shadow-black/80 glow-brand"
          }
        `}
      >
        {/* Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-between px-3 border border-white/5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900"></div>
          {demoState !== "idle" && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1"
            >
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${demoState === "listening" ? "bg-red-500" : "bg-indigo-500"}`}></span>
              <span className="text-[7px] text-indigo-400 font-extrabold uppercase tracking-wider">
                {demoState === "listening" ? "REC" : "ACTIVE"}
              </span>
            </motion.div>
          )}
          <div className="w-2 h-2 rounded-full bg-indigo-900/60"></div>
        </div>

        {/* Screen Content */}
        <div
          className={`flex-1 rounded-[40px] overflow-hidden flex flex-col justify-between p-4 pt-9 pb-3 relative z-10 transition-colors duration-300
            ${
              isHighContrast
                ? "bg-black"
                : theme === "light"
                ? "bg-white text-slate-800"
                : "bg-slate-900/90 text-slate-100"
            }
          `}
        >
          {/* Virtual Top Bar */}
          <div className="flex justify-between items-center text-[10px] font-semibold opacity-70 px-2 select-none">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <Languages className="w-3 h-3 text-indigo-400" />
              <span>5G</span>
              <div className="w-5 h-2.5 border border-current rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-current rounded-2xs"></div>
              </div>
            </div>
          </div>

          {/* Simulator Controls & Header */}
          <div className="flex items-center justify-between border-b border-current/10 py-1.5 select-none text-xs">
            <span className="font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dristi Assist</span>
            </span>

            <div className="flex items-center gap-2">
              {/* Toggle Logs / Chat */}
              <button
                onClick={() => setShowTerminal(v => !v)}
                title={showTerminal ? "Show Chat View" : "Show Developer Console"}
                className={`p-1.5 rounded hover:bg-current/10 transition-colors ${showTerminal ? "text-indigo-400 font-bold" : "opacity-60"}`}
              >
                {showTerminal ? <MessageSquare className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
              </button>
              
              {/* Reset logs/chat */}
              <button
                onClick={clearLogsAndMessages}
                title="Clear screen history"
                className="p-1.5 rounded hover:bg-current/10 transition-colors opacity-65 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Core Display Area */}
          <div className="flex-1 my-2.5 flex flex-col justify-end overflow-hidden relative min-h-0">
            {/* 1. Onboarding Selection and Greeting Screen */}
            <AnimatePresence>
              {onboardingState !== "completed" ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`absolute inset-0 flex flex-col justify-between p-4 text-center select-none z-20 ${
                    isHighContrast ? "bg-black" : theme === "light" ? "bg-white" : "bg-slate-900"
                  }`}
                >
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg animate-pulse">
                      <Mic className="w-6 h-6 text-white" />
                    </div>

                    {onboardingState === "greeting" && (
                      <div className="space-y-2">
                        <h4 className="font-extrabold text-xs text-indigo-400">Welcome Onboarding</h4>
                        <p className="text-[10px] opacity-75 animate-bounce leading-relaxed">
                          Speaking welcome message...
                        </p>
                        <p className="text-[9px] opacity-60 italic">
                          (स्वागत सन्देश पढ्दैछ...)
                        </p>
                      </div>
                    )}

                    {onboardingState === "waiting_lang" && (
                      <div className="space-y-3 w-full">
                        <h4 className="font-extrabold text-xs text-indigo-400">Choose Language / भाषा रोज्नुहोस्</h4>
                        <p className="text-[10.5px] opacity-75 leading-relaxed font-bold animate-pulse text-indigo-300">
                          Say "1" for English / "2" for Nepali
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={() => handleUserCommandInput("1")}
                            className="p-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-xs font-bold transition-all text-current"
                          >
                            <div>🇺🇸 Say 1</div>
                            <div className="text-[9px] opacity-60">English</div>
                          </button>
                          
                          <button
                            onClick={() => handleUserCommandInput("2")}
                            className="p-3 rounded-2xl border border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10 text-xs font-bold transition-all text-current"
                          >
                            <div>🇳🇵 Say 2</div>
                            <div className="text-[9px] opacity-60">नेपाली</div>
                          </button>
                        </div>
                      </div>
                    )}

                    {onboardingState === "teaching" && (
                      <div className="space-y-2">
                        <h4 className="font-extrabold text-xs text-indigo-400">Audio Guide Tutorial</h4>
                        <p className="text-[10px] opacity-75 animate-bounce leading-relaxed">
                          {lang === "en" ? "Speaking voice instructions..." : "आवाज निर्देशिका पढ्दैछ..."}
                        </p>
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[9px] text-left leading-normal font-mono opacity-80 max-w-[220px]">
                          {lang === "en" 
                            ? "> Configuring voice layer\n> Synthesizing vocal map\n> Booting offline speech ASR"
                            : "> नेपाली आवाज लेयर लोड\n> गाइड निर्देशिका विश्लेषण\n> ध्वनि प्रणाली सक्रिय"}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-[9px] opacity-50 border-t border-current/10 pt-2 font-mono">
                    DRISTI-OS SETUP LIFECYCLE
                  </div>
                </motion.div>
              ) : (
                messages.length === 0 && demoState === "idle" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 flex flex-col items-center justify-center text-center p-4 select-none z-20 ${
                      isHighContrast ? "bg-black" : theme === "light" ? "bg-white" : "bg-slate-900"
                    }`}
                  >
                    <div
                      className={`w-20 h-20 rounded-full flex items-center justify-center relative mb-4 animate-pulse-slow
                        ${
                          isHighContrast
                            ? "bg-black border-4 border-yellow-400 text-yellow-400"
                            : "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]"
                        }
                      `}
                    >
                      {!isHighContrast && (
                        <div className="absolute inset-1.5 bg-slate-900 rounded-full flex items-center justify-center">
                          <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
                        </div>
                      )}
                      {isHighContrast && <Sparkles className="w-8 h-8" />}
                    </div>
                    
                    <h4 className="font-bold text-xs">
                      {lang === "en" ? "Bilingual Voice Assistant" : "द्विभाषी आवाज सहायक"}
                    </h4>
                    
                    <p className="text-[10px] opacity-60 mt-1 max-w-[200px] leading-relaxed">
                      {lang === "en"
                        ? "Say or select options to toggle settings and navigate sections."
                        : "कमान्ड भन्नुहोस् वा रोज्नुहोस् र सेटिङ चलाउनुहोस्।"}
                    </p>
                  </motion.div>
                )
              )}
            </AnimatePresence>

            {/* 2. Chat history or Developer Console Logs screen */}
            <div className="w-full h-full flex flex-col justify-end min-h-0">
              {showTerminal ? (
                /* Developer Console Screen */
                <div className="flex-1 w-full flex flex-col bg-slate-950 text-slate-200 rounded-xl p-3 border border-slate-800 text-left font-mono text-[9.5px] select-text overflow-y-auto">
                  <div className="text-[9px] text-indigo-400 font-extrabold border-b border-slate-800 pb-1 mb-2 flex justify-between items-center">
                    <span>BACKEND ACTIONS LOG</span>
                    <span className="animate-pulse px-1 rounded bg-indigo-950 border border-indigo-800 text-[8px]">API ONLINE</span>
                  </div>
                  
                  {consoleLogs.length === 0 ? (
                    <div className="text-slate-600 italic mt-auto">No voice action logs yet. Speak or type commands to dispatch action payloads...</div>
                  ) : (
                    <div className="space-y-3 mt-auto">
                      {consoleLogs.map((log, i) => (
                        <div key={i} className="border-b border-slate-900 pb-1.5">
                          <div className="flex justify-between items-center text-slate-500 text-[8px] mb-0.5">
                            <span>[{log.time}]</span>
                            <span className={log.status === "SUCCESS" ? "text-green-500 font-bold" : "text-red-400"}>
                              {log.status}
                            </span>
                          </div>
                          <div className="text-blue-400 font-medium truncate">&gt; "{log.command}"</div>
                          {log.payload ? (
                            <pre className="text-green-400 overflow-x-auto bg-black/50 p-1.5 rounded mt-1 border border-slate-900 leading-normal">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          ) : (
                            <div className="text-red-400 mt-0.5 italic">API Error: intent unrecognized.</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Chat view */
                <div className="flex-1 w-full space-y-3 overflow-y-auto pb-1.5 pr-1 select-none flex flex-col scrollbar-thin">
                  <div className="mt-auto" /> {/* push chat bubbles to bottom */}
                  {messages.map((msg, index) => {
                    if (msg.role === "user") {
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex justify-end"
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs font-semibold shadow-sm
                              ${
                                isHighContrast
                                  ? "bg-black border-2 border-white text-white"
                                  : "bg-indigo-600 text-white"
                              }
                            `}
                          >
                            {msg.text}
                          </div>
                        </motion.div>
                      );
                    } else if (msg.role === "system") {
                      const isError = msg.status === "error";
                      const isSuccess = msg.status === "success";
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex gap-1.5 items-start"
                        >
                          <div className={`p-0.5 rounded text-[8px] mt-0.5 border ${
                            isError ? "bg-red-950/80 border-red-800 text-red-400" :
                            isSuccess ? "bg-green-950/80 border-green-800 text-green-400" :
                            "bg-slate-800 border-slate-700 text-slate-350"
                          }`}>
                            <Info className="w-2.5 h-2.5" />
                          </div>
                          <div className={`flex-1 text-[9px] font-mono leading-tight py-0.5 opacity-90 ${
                            isError ? "text-red-400" : isSuccess ? "text-green-400" : "text-slate-400"
                          }`}>
                            {msg.text}
                          </div>
                        </motion.div>
                      );
                    } else if (msg.role === "assistant") {
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-2 items-start"
                        >
                          <div
                            className={`p-1 rounded-full mt-0.5 flex-shrink-0
                              ${
                                isHighContrast
                                  ? "bg-yellow-400 text-black border border-white"
                                  : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              }
                            `}
                          >
                            <Volume2 className="w-3 h-3 animate-bounce" />
                          </div>
                          <div
                            className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold shadow-md border leading-relaxed
                              ${
                                isHighContrast
                                  ? "bg-black border-2 border-yellow-400 text-yellow-400"
                                  : theme === "light"
                                  ? "bg-slate-50 border-slate-200 text-slate-800"
                                  : "bg-slate-800/80 border-slate-700 text-indigo-300"
                              }
                            `}
                          >
                            {msg.text}
                          </div>
                        </motion.div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Commands Container */}
          {showQuickCommands && (
            <div className="w-full border-t border-current/10 pt-2 select-none">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1 px-1">
                <span>{lang === "en" ? "Interactive Command Chips" : "द्रुत आदेश चिप्स"}</span>
                <button
                  onClick={() => setShowQuickCommands(false)}
                  className="p-0.5 hover:bg-current/15 rounded text-[8px]"
                  title="Close chips panel"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none snap-x max-w-full">
                {quickCommandsList.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => handleUserCommandInput(cmd)}
                    disabled={demoState === "processing" || demoState === "listening"}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap snap-center border transition-all active:scale-95
                      ${
                        isHighContrast
                          ? "bg-black border-white text-white hover:bg-yellow-400 hover:text-black"
                          : "bg-slate-800/20 dark:bg-slate-800/60 hover:bg-indigo-600/10 border-slate-300 dark:border-slate-800 hover:border-indigo-500/40 text-slate-700 dark:text-slate-350 hover:text-indigo-400"
                      }
                      ${(demoState === "processing" || demoState === "listening") ? "opacity-45 cursor-not-allowed" : ""}
                    `}
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Interactive Command Bar */}
          <div className="border-t border-current/10 pt-2.5 flex flex-col items-center select-none">
            
            {/* Fallback Text Input Command Bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleUserCommandInput(textCommand);
                setTextCommand("");
              }}
              className="w-full flex items-center gap-1.5 mb-2.5 relative"
            >
              <input
                type="text"
                value={textCommand}
                onChange={(e) => setTextCommand(e.target.value)}
                disabled={demoState === "processing" || demoState === "listening"}
                placeholder={
                  lang === "en" 
                    ? "Type command (e.g. Turn on high contrast)..." 
                    : "आदेश टाइप गर्नुहोस् (जस्तै: गृह पृष्ठ रोज)..."
                }
                className={`flex-1 rounded-xl px-3 py-1.5 text-[10.5px] border focus:outline-none transition-all
                  ${
                    isHighContrast
                      ? "bg-black border-white text-white placeholder-slate-500 focus:border-yellow-400"
                      : "bg-slate-100 dark:bg-slate-950/70 border-slate-300/60 dark:border-slate-800 focus:border-indigo-500/50 text-current"
                  }
                  ${(demoState === "processing" || demoState === "listening") ? "opacity-60 cursor-not-allowed" : ""}
                `}
              />
              <button
                type="submit"
                disabled={!textCommand.trim() || demoState === "processing" || demoState === "listening"}
                className={`p-1.5 rounded-lg border transition-all flex items-center justify-center active:scale-95
                  ${
                    isHighContrast
                      ? "bg-white text-black border-white hover:bg-yellow-400"
                      : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500"
                  }
                  ${(!textCommand.trim() || demoState === "processing" || demoState === "listening") ? "opacity-40 cursor-not-allowed" : ""}
                `}
              >
                <Send className="w-3 h-3" />
              </button>
            </form>

            {/* Visualizer Waves & States */}
            <div className="h-6 flex items-center justify-center gap-1.5 mb-1.5 w-full">
              {demoState === "listening" && (
                <div className="flex items-center gap-1">
                  <div className="w-0.5 h-4.5 bg-red-500 rounded-full wave-bar-1"></div>
                  <div className="w-0.5 h-2.5 bg-purple-500 rounded-full wave-bar-2"></div>
                  <div className="w-0.5 h-5 bg-cyan-400 rounded-full wave-bar-3"></div>
                  <div className="w-0.5 h-3 bg-pink-500 rounded-full wave-bar-4"></div>
                  <div className="w-0.5 h-5 bg-red-500 rounded-full wave-bar-5"></div>
                  <div className="w-0.5 h-2 bg-blue-500 rounded-full wave-bar-6"></div>
                  <span className="text-[9px] font-mono text-red-500 ml-1.5 animate-pulse">
                    {lang === "en" ? "Listening..." : "सुन्दैछ..."}
                  </span>
                </div>
              )}
              {demoState === "processing" && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-[9px] font-mono text-indigo-400 ml-1.5">
                    {lang === "en" ? "Processing NLP..." : "प्रक्रिया चल्दैछ..."}
                  </span>
                </div>
              )}
              {demoState === "finished" && (
                <div className="flex items-center gap-1 text-[9px] font-bold text-green-500">
                  <Check className="w-3 h-3 text-green-500" /> 
                  <span>{lang === "en" ? "UI Action Executed" : "कार्य सफल भयो"}</span>
                </div>
              )}
              {demoState === "idle" && (
                <div className="w-32 h-[3px] rounded-full bg-current opacity-20"></div>
              )}
            </div>

            {/* Virtual Home Bar */}
            <div className="w-32 h-1 bg-current opacity-25 rounded-full"></div>
          </div>
        </div>
      </div>
      
      {/* Small floating button to toggle quick chips back */}
      {!showQuickCommands && (
        <button
          onClick={() => setShowQuickCommands(true)}
          className="mt-3 text-[10px] font-bold text-indigo-500 hover:text-indigo-400 flex items-center gap-1.5"
        >
          <Sparkles className="w-3 h-3" />
          <span>{lang === "en" ? "Show Quick Action Chips" : "द्रुत आदेश चिप्स देखाउनुहोस्"}</span>
        </button>
      )}
    </div>
  );
}
