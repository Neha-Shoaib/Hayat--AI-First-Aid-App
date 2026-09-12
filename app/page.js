"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Mic, Square, PhoneCall, Volume2, VolumeX, AlertOctagon, CheckCircle2,
  XCircle, MapPin, HeartPulse, Sun, Moon, Sparkles, Send, Youtube, ExternalLink
} from "lucide-react";

const VIDEO_REGISTRY = {
  cpr: { title: "How to Perform CPR", id: "B_oX2k8z8i4" }, // Updated reliable ID
  choking: { title: "How to Save a Choking Adult", id: "PA9hpOnvtCk" },
  bleeding: { title: "How to Control Severe Bleeding", id: "NxO5LvgqZe0" },
  burn: { title: "First Aid for Burns", id: "O1bMcZOEnjs" },
  shock: { title: "First Aid for Electric Shock", id: "iVpG6B3X8Lw" },
  default: { title: "Emergency Recovery Position", id: "GmqXqwSV3bo" },
};

export default function HayatMasterApp() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [lang, setLang] = useState("Urdu");
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [result, setResult] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  const audioRef = useRef(null);
  const [cprActive, setCprActive] = useState(false);
  const cprIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => { setMounted(true); }, []);

  // Universal Audio Player (Google Translate TTS API Hack - 100% Reliable)
  const playAudio = (text) => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (isPlayingAudio) {
        setIsPlayingAudio(false);
        return;
      }
    }
    
    // Create direct server audio link
    const langCode = lang === "Urdu" ? "ur" : "en";
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(text)}`;
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.onplay = () => setIsPlayingAudio(true);
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => {
      alert("Audio play nahi ho saki. Apka internet connection weak ho sakta hai.");
      setIsPlayingAudio(false);
    };
    
    audio.play();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        submitEmergency(audioBlob, null);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      alert("Microphone permission allow karein.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const matchVideo = (query) => {
    const q = query.toLowerCase();
    if (q.includes("cpr") || q.includes("heart") || q.includes("dil") || q.includes("cardiac")) return VIDEO_REGISTRY.cpr;
    if (q.includes("chok") || q.includes("saans") || q.includes("gala")) return VIDEO_REGISTRY.choking;
    if (q.includes("bleed") || q.includes("khoon") || q.includes("cut")) return VIDEO_REGISTRY.bleeding;
    if (q.includes("burn") || q.includes("jala") || q.includes("aag")) return VIDEO_REGISTRY.burn;
    if (q.includes("shock") || q.includes("bijli")) return VIDEO_REGISTRY.shock;
    return VIDEO_REGISTRY.default;
  };

  const submitEmergency = async (audioBlob, manualText) => {
    setLoading(true);
    setResult(null);
    setVideoInfo(null);
    setTranscription("");
    if (audioRef.current) audioRef.current.pause();
    setIsPlayingAudio(false);

    try {
      const formData = new FormData();
      formData.append("language", lang);

      if (audioBlob) {
        formData.append("audio", audioBlob, "panic.webm");
      } else if (manualText) {
        formData.append("textQuery", manualText);
      }

      const res = await fetch("/api/first-aid", {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);

      setTranscription(resData.transcription);
      setResult(resData.data);
      setVideoInfo(matchVideo(resData.transcription || manualText || ""));
      
      // Auto-play TTS returned from LLM
      if (resData.data?.spokenSummary) {
        setTimeout(() => playAudio(resData.data.spokenSummary), 500);
      }

    } catch (err) {
      alert(err.message || "Connection Error.");
    } finally {
      setLoading(false);
      setInputText("");
    }
  };

  const toggleCPR = () => {
    if (cprActive) {
      clearInterval(cprIntervalRef.current);
      setCprActive(false);
    } else {
      setCprActive(true);
      if (typeof window === "undefined") return;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      cprIntervalRef.current = setInterval(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      }, 545);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-bold text-white">Loading...</div>;
  const isDark = theme === "dark";

  return (
    <main className={`min-h-screen w-full transition-colors duration-200 ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-xl mx-auto px-4 py-4 flex flex-col gap-4">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-700/30 pb-3">
          <div className="flex items-center gap-2 font-black uppercase text-emerald-500 text-xs sm:text-sm">
            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
            Hayat AI Paramedic
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex p-1 rounded-lg border text-xs font-bold ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-300"}`}>
              <button onClick={() => setLang("Urdu")} className={`px-3 py-1 rounded transition-all ${lang === "Urdu" ? "bg-red-600 text-white" : "opacity-60"}`}>اردو</button>
              <button onClick={() => setLang("English")} className={`px-3 py-1 rounded transition-all ${lang === "English" ? "bg-red-600 text-white" : "opacity-60"}`}>EN</button>
            </div>
            <button onClick={() => setTheme(isDark ? "light" : "dark")} className={`p-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-800 text-amber-400" : "bg-white border-slate-300 text-slate-800"}`}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Dispatch Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a href="tel:1122" className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-black text-sm shadow-lg">
            <PhoneCall className="h-5 w-5 animate-bounce" /> CALL 1122
          </a>
          <button onClick={toggleCPR} className={`p-3 rounded-xl flex items-center justify-center gap-2 font-black text-sm border ${cprActive ? "bg-red-600 text-white border-red-600" : (isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-300")}`}>
            <HeartPulse className={`h-5 w-5 ${cprActive ? "animate-ping" : "text-rose-500"}`} /> {cprActive ? "STOP CPR PULSE" : "START CPR PULSE"}
          </button>
        </div>

        {/* Input Area */}
        <section className={`p-6 rounded-2xl border text-center flex flex-col items-center gap-4 ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
          {isRecording ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg animate-pulse"><Mic className="h-8 w-8 text-white" /></div>
              <p className="text-red-500 font-bold text-sm">Sun rahe hain...</p>
              <button onClick={stopRecording} className="bg-red-600 text-white px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2"><Square className="h-4 w-4" /> Stop & Solve</button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <button onClick={startRecording} disabled={loading} className="w-20 h-20 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"><Mic className="h-8 w-8" /></button>
              <h2 className="font-black text-lg">{lang === "Urdu" ? "مائیک دبا کر بتائیں" : "Tap Mic & Speak"}</h2>
              
              <div className="w-full flex gap-2 pt-3">
                <input type="text" placeholder={lang === "Urdu" ? "یا لکھیں..." : "Or type..."} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitEmergency(null, inputText)} className={`flex-1 rounded-xl px-3 py-2 text-sm border focus:outline-none ${isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300"}`} />
                <button onClick={() => submitEmergency(null, inputText)} disabled={loading || !inputText} className="bg-red-600 text-white px-4 rounded-xl font-bold"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </section>

        {loading && <div className="text-center text-red-500 font-bold flex justify-center gap-2 animate-pulse text-sm"><Sparkles className="h-4 w-4 animate-spin" /> Processing AI...</div>}

        {/* Output */}
        {result && (
          <section className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-4 shadow-lg ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between border-b border-slate-700/20 pb-3">
              <h3 className="font-bold text-sm sm:text-base">{result.title}</h3>
              <button onClick={() => playAudio(result.spokenSummary)} className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow active:scale-95">
                {isPlayingAudio ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />} {isPlayingAudio ? "Stop" : "Suno (Audio)"}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-black uppercase text-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Fori Amal:</p>
              {result.dos?.map((step, idx) => (
                <div key={idx} className={`p-3 rounded-xl border flex gap-2.5 ${isDark ? "bg-slate-950/60 border-emerald-950/40" : "bg-emerald-50/60 border-emerald-200"}`}>
                  <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">{idx + 1}</span>
                  <div className={`text-sm ${lang === "Urdu" ? "font-urdu w-full text-right leading-loose" : ""}`}>{step}</div>
                </div>
              ))}
            </div>

            {result.donts?.map((warning, idx) => (
              <div key={idx} className={`p-3 rounded-xl border flex gap-2.5 ${isDark ? "bg-rose-950/20 border-rose-900/30 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className={`text-sm ${lang === "Urdu" ? "font-urdu w-full text-right leading-loose" : ""}`}>{warning}</div>
              </div>
            ))}

            {/* DIRECT YOUTUBE LINK (NEVER BLOCKS) */}
            {videoInfo && (
              <a href={`https://www.youtube.com/watch?v=${videoInfo.id}`} target="_blank" rel="noopener noreferrer" className="mt-2 w-full bg-[#FF0000] hover:bg-red-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md transition">
                <Youtube className="h-5 w-5" /> Watch "{videoInfo.title}" on YouTube <ExternalLink className="h-4 w-4 opacity-70" />
              </a>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
