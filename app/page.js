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
  RefreshCw
} from "lucide-react";

export default function HayatProApp() {
  const [theme, setTheme] = useState("dark");
  const [lang, setLang] = useState("Urdu");
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [result, setResult] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Interactive CPR Metronome state
  const [cprActive, setCprActive] = useState(false);
  const cprIntervalRef = useRef(null);

  // GPS Location state for 1122 Dispatch
  const [location, setLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Fetch Live Coordinates
  const fetchLocation = () => {
    setLocLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude.toFixed(4),
            lng: pos.coords.longitude.toFixed(4),
          });
          setLocLoading(false);
        },
        () => {
          setLocation({ lat: "GPS Unavailable", lng: "Enable Location" });
          setLocLoading(false);
        }
      );
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  // Robust Text-to-Speech Engine
  const speakText = (text) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    if (lang === "Urdu") {
      // Find Pakistani Urdu voice, or Indian Hindi voice as high-accuracy acoustic fallback
      const urduVoice = voices.find(
        (v) => v.lang.includes("ur") || v.lang.includes("hi-IN") || v.name.includes("Urdu")
      );
      if (urduVoice) utterance.voice = urduVoice;
      utterance.lang = "ur-PK";
      utterance.rate = 0.88;
    } else {
      const enVoice = voices.find((v) => v.lang.includes("en-US") || v.lang.includes("en-GB"));
      if (enVoice) utterance.voice = enVoice;
      utterance.lang = "en-US";
      utterance.rate = 0.95;
    }

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  // Audio Recording Handlers
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
      alert("Mic permission allow karein.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Central Dispatcher
  const submitEmergency = async (audioBlob, manualText) => {
    setLoading(true);
    setResult(null);
    setTranscription("");
    window.speechSynthesis?.cancel();
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

      // Auto-play spoken audio instructions immediately
      if (resData.data?.spokenSummary) {
        speakText(resData.data.spokenSummary);
      }
    } catch (err) {
      alert(err.message || "Network Error");
    } finally {
      setLoading(false);
    }
  };

  // CPR Metronome Toggle (105 Beats Per Minute for correct compressions)
  const toggleCPR = () => {
    if (cprActive) {
      clearInterval(cprIntervalRef.current);
      setCprActive(false);
    } else {
      setCprActive(true);
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      cprIntervalRef.current = setInterval(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      }, 570); // ~105 BPM
    }
  };

  const isDark = theme === "dark";

  return (
    <div className={isDark ? "bg-slate-950 text-slate-100 min-h-screen" : "bg-slate-50 text-slate-900 min-h-screen"}>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-20">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between py-2 border-b border-slate-800/20 mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-500">
              Paramedic Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switch */}
            <div className={`flex p-0.5 rounded-lg border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              <button
                onClick={() => setLang("Urdu")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  lang === "Urdu" ? "bg-red-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                اردو
              </button>
              <button
                onClick={() => setLang("English")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  lang === "English" ? "bg-red-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                EN
              </button>
            </div>

            {/* Dark / Light Mode Switch */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`p-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-800 text-amber-400" : "bg-white border-slate-200 text-slate-700"}`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 1122 Dispatch & GPS Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          <a
            href="tel:1122"
            className="sm:col-span-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-3.5 rounded-xl flex items-center justify-center gap-2 font-black shadow-lg shadow-red-900/30 tracking-wide text-base transition-all"
          >
            <PhoneCall className="h-5 w-5 animate-bounce" /> CALL 1122 RESCUE
          </a>

          <div className={`flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-medium ${isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"}`}>
            <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
            <div className="truncate">
              {locLoading ? "Fetching GPS..." : location ? `${location.lat}, ${location.lng}` : "Locating..."}
            </div>
            <button onClick={fetchLocation} className="opacity-60 hover:opacity-100">
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* CPR Metronome Interactive Widget */}
        <div className={`p-3.5 rounded-xl border mb-5 flex items-center justify-between ${isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className="flex items-center gap-3">
            <HeartPulse className={`h-6 w-6 ${cprActive ? "text-red-500 animate-ping" : "text-slate-400"}`} />
            <div>
              <p className="text-sm font-bold leading-none">CPR Rhythm Guide (105 BPM)</p>
              <p className="text-xs opacity-60 mt-1">Cardiac arrest chest compression metronome</p>
            </div>
          </div>
          <button
            onClick={toggleCPR}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              cprActive ? "bg-red-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            }`}
          >
            {cprActive ? "Stop Audio" : "Start Pulse"}
          </button>
        </div>

        {/* Quick Triage Buttons */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">Instant Scenarios:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "🩸 Deep Cut / Khoon", q: "Severe deep cut with heavy bleeding" },
              { label: "🔥 Burn / Jala Huwa", q: "Boiling water oil burn on skin" },
              { label: "🫁 Choking / Gala Phansna", q: "Person choking not able to breathe or speak" },
              { label: "⚡ Electric Shock", q: "Electric shock victim unconscious" },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={() => submitEmergency(null, btn.q)}
                className={`text-xs text-left p-2.5 rounded-xl border font-semibold transition hover:border-red-500 ${
                  isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Central Voice Recording Hub */}
        <div className={`p-8 rounded-2xl border text-center relative overflow-hidden transition-all ${
          isDark ? "bg-slate-900/40 border-slate-800/90" : "bg-white border-slate-200 shadow-md"
        }`}>
          {isRecording ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-28 w-28 rounded-full bg-red-500 opacity-30"></span>
                <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center shadow-xl shadow-red-600/50">
                  <Mic className="h-10 w-10 text-white animate-pulse" />
                </div>
              </div>
              <p className="text-red-500 font-bold text-sm tracking-wide animate-pulse">
                Emergency Sun Rahe Hain... Bolte Rahein!
              </p>
              <button
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-full font-black text-sm flex items-center gap-2 shadow-lg"
              >
                <Square className="h-4 w-4 fill-white" /> Complete & Get Solution
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={startRecording}
                disabled={loading}
                className="w-24 h-24 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-2xl shadow-red-600/40 hover:scale-105 active:scale-95 transition-all"
              >
                <Mic className="h-10 w-10" />
              </button>
              <div>
                <h2 className="font-black text-lg">
                  {lang === "Urdu" ? "Boliye aur Madad Lein" : "Hold & Speak Injury Details"}
                </h2>
                <p className="text-xs opacity-60 mt-1 max-w-sm mx-auto">
                  Audio transcript Whisper ke through analyze hogi aur foran verbal guidance milegi.
                </p>
              </div>

              {/* Text fallback input */}
              <div className="w-full flex gap-2 mt-2 pt-4 border-t border-slate-800/10 dark:border-slate-800">
                <input
                  type="text"
                  placeholder={lang === "Urdu" ? "Ya likhein (e.g. Sar par chot lagi hai...)" : "Or describe situation..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitEmergency(null, inputText)}
                  className={`flex-1 rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:border-red-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300 text-slate-900"
                  }`}
                />
                <button
                  onClick={() => submitEmergency(null, inputText)}
                  disabled={loading || !inputText}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 rounded-xl disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="mt-6 text-center text-red-500 font-bold flex items-center justify-center gap-2 animate-pulse">
            <Sparkles className="h-5 w-5 animate-spin" /> Paramedic Triage Computing (Groq LPU)...
          </div>
        )}

        {/* Output Results Card */}
        {result && (
          <div className={`mt-6 rounded-2xl border p-5 shadow-2xl transition-all ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            {/* Triage Banner Header */}
            <div className="flex items-center justify-between border-b border-slate-800/20 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-black ${
                  result.severity === "CRITICAL"
                    ? "bg-red-500/20 text-red-500 border border-red-500/30"
                    : "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                }`}>
                  {result.severity || "URGENT"}
                </span>
                <h3 className="font-black text-base">{result.title}</h3>
              </div>

              {/* TTS Play/Pause Voice Button */}
              <button
                onClick={() => speakText(result.spokenSummary)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md"
              >
                {isPlayingAudio ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {isPlayingAudio ? "Stop Audio" : "Play Voice (Suno)"}
              </button>
            </div>

            {transcription && (
              <p className="text-xs opacity-60 mb-4 italic">
                Input Captured: "{transcription}"
              </p>
            )}

            {/* DOs Section */}
            <div className="space-y-2.5 mb-5">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Fori Amal (Action Steps):
              </p>
              {result.dos?.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start gap-3 ${
                    isDark ? "bg-slate-950/60 border-emerald-950/40" : "bg-emerald-50/50 border-emerald-100"
                  }`}
                >
                  <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className={`text-sm leading-relaxed ${lang === "Urdu" ? "font-urdu text-right w-full" : ""}`}>
                    {step}
                  </p>
                </div>
              ))}
            </div>

            {/* DON'Ts Section */}
            {result.donts && result.donts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                  <AlertOctagon className="h-4 w-4" /> Yeh Hargiz Na Karein (Strict Warning):
                </p>
                {result.donts.map((warning, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-start gap-3 ${
                      isDark ? "bg-rose-950/20 border-rose-900/30 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <p className={`text-sm leading-relaxed ${lang === "Urdu" ? "font-urdu text-right w-full" : ""}`}>
                      {warning}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
