"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  PhoneCall,
  Volume2,
  VolumeX,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  MapPin,
  HeartPulse,
  Sun,
  Moon,
  Sparkles,
  Send,
  Youtube,
  RefreshCw
} from "lucide-react";

// Verified Standard Medical Video Reference IDs (YouTube Embed)
const VIDEO_REGISTRY = {
  cpr: { title: "How to Perform CPR", id: "-NodDRTsV88" },
  choking: { title: "How to Save a Choking Adult", id: "5s23s8iXWdc" },
  bleeding: { title: "How to Control Severe Bleeding", id: "NxO5LvgqZe0" },
  burn: { title: "First Aid for Burns & Scalds", id: "EaJmzB8YgS0" },
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

  // CPR Metronome
  const [cprActive, setCprActive] = useState(false);
  const cprIntervalRef = useRef(null);

  // Live Location
  const [location, setLocation] = useState({ lat: "24.8607", lng: "67.0011" }); // Safe Karachi default
  const [locLoading, setLocLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Resolve Next.js SSR / Client Hydration Mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude.toFixed(4),
          lng: pos.coords.longitude.toFixed(4),
        });
        setLocLoading(false);
      },
      () => {
        setLocation({ lat: "24.8607", lng: "67.0011" });
        setLocLoading(false);
      }
    );
  };

  const speakText = (text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }

    const cleanText = text.replace(/[*#_]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();

    if (lang === "Urdu") {
      const match = voices.find(
        (v) => v.lang.includes("ur") || v.lang.includes("hi-IN") || v.name.toLowerCase().includes("urdu")
      );
      if (match) utterance.voice = match;
      utterance.lang = "ur-PK";
      utterance.rate = 0.9;
    } else {
      const match = voices.find((v) => v.lang.includes("en-US") || v.lang.includes("en-GB"));
      if (match) utterance.voice = match;
      utterance.lang = "en-US";
      utterance.rate = 1.0;
    }

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
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
      alert("Microphone permission grant karein voice use karne ke liye.");
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
    if (q.includes("cpr") || q.includes("heart") || q.includes("cardiac") || q.includes("dil")) {
      return VIDEO_REGISTRY.cpr;
    } else if (q.includes("chok") || q.includes("saans") || q.includes("halaq") || q.includes("gala")) {
      return VIDEO_REGISTRY.choking;
    } else if (q.includes("bleed") || q.includes("khoon") || q.includes("cut") || q.includes("wound")) {
      return VIDEO_REGISTRY.bleeding;
    } else if (q.includes("burn") || q.includes("jala") || q.includes("aag") || q.includes("oil")) {
      return VIDEO_REGISTRY.burn;
    } else if (q.includes("shock") || q.includes("current") || q.includes("bijli")) {
      return VIDEO_REGISTRY.shock;
    }
    return VIDEO_REGISTRY.default;
  };

  const submitEmergency = async (audioBlob, manualText) => {
    setLoading(true);
    setResult(null);
    setVideoInfo(null);
    setTranscription("");
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
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

      if (resData.data?.spokenSummary) {
        speakText(resData.data.spokenSummary);
      }
    } catch (err) {
      alert(err.message || "Connection Error. Call 1122 immediately.");
    } finally {
      setLoading(false);
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
      }, 545); // 110 BPM
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold">Loading HAYAT AI...</div>;
  }

  const isDark = theme === "dark";

  return (
    <main className={`min-h-screen w-full transition-colors duration-200 ${
      isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    }`}>
      <div className="max-w-xl mx-auto px-4 py-4 sm:px-6 sm:py-6 flex flex-col gap-4">
        
        {/* Top Navbar */}
        <header className="flex items-center justify-between border-b border-slate-700/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-500">
              Paramedic AI Online
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bilingual Switcher */}
            <div className={`flex p-1 rounded-lg border text-xs font-bold ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-300"
            }`}>
              <button
                onClick={() => setLang("Urdu")}
                className={`px-3 py-1 rounded transition-all ${
                  lang === "Urdu" ? "bg-red-600 text-white shadow-sm" : "opacity-60 hover:opacity-100"
                }`}
              >
                اردو
              </button>
              <button
                onClick={() => setLang("English")}
                className={`px-3 py-1 rounded transition-all ${
                  lang === "English" ? "bg-red-600 text-white shadow-sm" : "opacity-60 hover:opacity-100"
                }`}
              >
                EN
              </button>
            </div>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`p-2 rounded-lg border transition ${
                isDark ? "bg-slate-900 border-slate-800 text-amber-400" : "bg-white border-slate-300 text-slate-800"
              }`}
              title="Toggle Theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* 1122 Dispatch & GPS Info */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <a
            href="tel:1122"
            className="sm:col-span-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white p-3 rounded-xl flex items-center justify-center gap-2.5 font-black text-sm sm:text-base shadow-lg shadow-red-900/40 active:scale-95 transition-transform"
          >
            <PhoneCall className="h-5 w-5 animate-bounce" />
            <span>CALL RESCUE 1122</span>
          </a>

          <div className={`flex items-center justify-between sm:justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-300 text-slate-700 shadow-sm"
          }`}>
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span>{locLoading ? "Locating..." : `${location.lat}, ${location.lng}`}</span>
            </div>
            <button onClick={fetchLocation} className="p-1 hover:text-red-500 transition">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* CPR Pulse Guide Tool */}
        <section className={`p-3 rounded-xl border flex items-center justify-between ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center gap-3">
            <HeartPulse className={`h-6 w-6 ${cprActive ? "text-red-500 animate-ping" : "text-rose-500"}`} />
            <div>
              <p className="text-xs sm:text-sm font-bold">CPR Chest Compression (110 BPM)</p>
              <p className="text-[11px] opacity-60">Cardiac arrest rhythm sync tool</p>
            </div>
          </div>
          <button
            onClick={toggleCPR}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
              cprActive ? "bg-red-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            }`}
          >
            {cprActive ? "Stop Audio" : "Start Pulse"}
          </button>
        </section>

        {/* Rapid One-Tap Panic Triggers */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-60 mb-2">One-Tap Scenarios:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { title: "🩸 Severe Cut", q: "Severe bleeding from deep cut" },
              { title: "🔥 Burn / Scald", q: "Burn from boiling hot water or fire" },
              { title: "🫁 Choking", q: "Adult choking cannot breathe or speak" },
              { title: "⚡ Electric Shock", q: "Electric shock victim unconscious" },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => submitEmergency(null, item.q)}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition hover:border-red-500 ${
                  isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-300 shadow-sm"
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>
        </section>

        {/* Main Audio & Text Capture Hub */}
        <section className={`p-6 sm:p-8 rounded-2xl border text-center flex flex-col items-center gap-4 ${
          isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200 shadow-md"
        }`}>
          {isRecording ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-24 w-24 rounded-full bg-red-500 opacity-40"></span>
                <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                  <Mic className="h-8 w-8 text-white" />
                </div>
              </div>
              <p className="text-red-500 font-bold text-sm animate-pulse">
                Recording Emergency... Tap to Stop
              </p>
              <button
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg"
              >
                <Square className="h-4 w-4 fill-white" /> Stop & Solve
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <button
                onClick={startRecording}
                disabled={loading}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-red-600/30 transition-all"
              >
                <Mic className="h-8 w-8 sm:h-10 sm:w-10" />
              </button>
              <div>
                <h2 className="font-black text-base sm:text-lg">
                  {lang === "Urdu" ? "مائیک دبا کر بتائیں" : "Tap Mic & State Injury"}
                </h2>
                <p className="text-xs opacity-60">Instant speech AI will triage & speak the first aid guide</p>
              </div>

              {/* Text Input Option */}
              <div className="w-full flex gap-2 pt-3 border-t border-slate-700/20">
                <input
                  type="text"
                  placeholder={lang === "Urdu" ? "یا یہاں صورتحال لکھیں..." : "Or type condition..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitEmergency(null, inputText)}
                  className={`flex-1 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm border focus:outline-none focus:border-red-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300 text-slate-900"
                  }`}
                />
                <button
                  onClick={() => submitEmergency(null, inputText)}
                  disabled={loading || !inputText}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 rounded-xl font-bold text-xs sm:text-sm disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Loading Spinner */}
        {loading && (
          <div className="py-4 text-center text-red-500 font-bold flex items-center justify-center gap-2 animate-pulse text-xs sm:text-sm">
            <Sparkles className="h-4 w-4 animate-spin" /> Processing First Aid Response (Groq Whisper + Llama 3.3)...
          </div>
        )}

        {/* Emergency Triage Output */}
        {result && (
          <section className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-4 shadow-xl ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            {/* Header / Severity Badge */}
            <div className="flex items-center justify-between border-b border-slate-700/20 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-black ${
                  result.severity === "CRITICAL"
                    ? "bg-red-500/20 text-red-500 border border-red-500/30"
                    : "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                }`}>
                  {result.severity || "URGENT"}
                </span>
                <h3 className="font-bold text-sm sm:text-base">{result.title}</h3>
              </div>

              {/* Audio Listen Button */}
              <button
                onClick={() => speakText(result.spokenSummary)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow transition"
              >
                {isPlayingAudio ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{isPlayingAudio ? "Stop" : "Suno (Voice)"}</span>
              </button>
            </div>

            {transcription && (
              <p className="text-xs opacity-60 italic">Captured: "{transcription}"</p>
            )}

            {/* DOs List */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Fori Amal (Action Steps):
              </p>
              {result.dos?.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isDark ? "bg-slate-950/60 border-emerald-950/40" : "bg-emerald-50/60 border-emerald-200"
                  }`}
                >
                  <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className={`text-xs sm:text-sm leading-relaxed ${lang === "Urdu" ? "font-urdu w-full text-right" : ""}`}>
                    {step}
                  </div>
                </div>
              ))}
            </div>

            {/* DON'Ts List */}
            {result.donts && result.donts.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
                  <AlertOctagon className="h-4 w-4" /> Yeh Hargiz Na Karein (Strict Warning):
                </p>
                {result.donts.map((warning, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                      isDark ? "bg-rose-950/20 border-rose-900/30 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div className={`text-xs sm:text-sm leading-relaxed ${lang === "Urdu" ? "font-urdu w-full text-right" : ""}`}>
                      {warning}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Verified YouTube Reference Video Guide */}
            {videoInfo && (
              <div className="mt-2 pt-3 border-t border-slate-700/20">
                <p className="text-xs font-bold text-red-500 flex items-center gap-1.5 mb-2">
                  <Youtube className="h-4 w-4" /> Live Video Demonstration ({videoInfo.title}):
                </p>
                <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg border border-slate-700/30">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${videoInfo.id}`}
                    title={videoInfo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
