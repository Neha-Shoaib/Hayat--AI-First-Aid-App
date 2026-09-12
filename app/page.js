"use client";
import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, PhoneCall, Volume2, VolumeX, AlertOctagon, CheckCircle2, XCircle, MapPin, HeartPulse, Sun, Moon, Sparkles, Send, Youtube, ExternalLink, RefreshCw } from "lucide-react";
import Script from 'next/script';

export default function HayatMasterApp() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [lang, setLang] = useState("Urdu");
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [result, setResult] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  const [cprActive, setCprActive] = useState(false);
  const cprIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  const [location, setLocation] = useState({ lat: "Fetching...", lng: "" });
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchLocation();
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, []);

  const fetchLocation = () => {
    setLocLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLocation({ lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) }); setLocLoading(false); },
        () => { setLocation({ lat: "GPS Off", lng: "" }); setLocLoading(false); }
      );
    }
  };

  const playAudio = (text) => {
    if (audioRef.current) audioRef.current.pause();
    if (isPlayingAudio) { setIsPlayingAudio(false); return; }

    setIsPlayingAudio(true);
    const langCode = lang === "Urdu" ? "ur" : "en";
    
    // Strip symbols that break the TTS API and limit length safely
    const cleanText = text.replace(/[*#_\[\]()]/g, "").trim().substring(0, 199);
    const safeText = encodeURIComponent(cleanText);
    
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${langCode}&q=${safeText}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => {
      setIsPlayingAudio(false);
      alert("Network issue: Audio could not load.");
    };
    
    audio.play().catch((err) => {
      console.error(err);
      setIsPlayingAudio(false);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = () => submitEmergency(new Blob(audioChunksRef.current, { type: "audio/webm" }), null);
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      alert("Mic permission block hai.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); }
  };

  const submitEmergency = async (audioBlob, manualText) => {
    setLoading(true); setResult(null); setTranscription("");
    if (audioRef.current) audioRef.current.pause();
    setIsPlayingAudio(false);

    try {
      const formData = new FormData();
      formData.append("language", lang);
      if (audioBlob) formData.append("audio", audioBlob, "panic.webm");
      else if (manualText) formData.append("textQuery", manualText);

      const res = await fetch("/api/first-aid", { method: "POST", body: formData });
      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);

      setTranscription(resData.transcription);
      setResult(resData.data);
    } catch (err) {
      alert(err.message || "Connection Error.");
    } finally {
      setLoading(false); setInputText("");
    }
  };

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
        osc.type = "sine"; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.08);
      }, 545);
    }
  };

  if (!mounted) return <main className="min-h-screen bg-slate-950"></main>;
  const isDark = theme === "dark";

  const ui = lang === "Urdu" ? {
    callBtn: "1122 پر کال کریں", locating: "لوکیشن...", cprStart: "سی پی آر شروع", cprStop: "سی پی آر روکیں",
    quickScenarios: "فوری صورتحال:",
    scenarios: [ { title: "🩸 گہرا کٹ", q: "خون بہہ رہا ہے" }, { title: "🔥 جل جانا", q: "آگ سے جل گیا" }, { title: "🫁 سانس رکنا", q: "سانس بند ہے" }, { title: "⚡ کرنٹ", q: "کرنٹ لگا ہے" } ],
    micMain: "مائیک دبائیں", placeholder: "مسئلہ لکھیں...", recording: "سن رہے ہیں...", stopRecording: "حل نکالیں", processing: "اے آئی حل نکال رہا ہے...", actionSteps: "فوری عمل:", donts: "یہ ہرگز نہ کریں:", listen: "سنیں", stopAudio: "روکیں", watchVideo: "ویڈیو"
  } : {
    callBtn: "CALL 1122", locating: "Locating...", cprStart: "START CPR", cprStop: "STOP CPR", quickScenarios: "Quick Scenarios:",
    scenarios: [ { title: "🩸 Cut", q: "Severe bleeding" }, { title: "🔥 Burn", q: "Burn from fire" }, { title: "🫁 Choking", q: "Choking" }, { title: "⚡ Shock", q: "Electric shock" } ],
    micMain: "Tap Mic", placeholder: "Type emergency...", recording: "Listening...", stopRecording: "Solve", processing: "Processing...", actionSteps: "Actions:", donts: "Do Not:", listen: "Listen", stopAudio: "Stop", watchVideo: "Video"
  };

  return (
    <main className={`min-h-screen w-full transition-colors duration-200 overflow-x-hidden ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"} ${lang === "Urdu" ? "font-urdu" : "font-inter"}`}>
      <div className="w-full max-w-lg md:max-w-2xl mx-auto px-4 py-4 md:py-8 flex flex-col gap-4">
        
        {/* Header */}
        <header className="flex flex-row items-center justify-between border-b border-slate-700/30 pb-3 font-inter">
          <div className="flex items-center gap-2 font-black uppercase text-emerald-500 text-xs md:text-sm">
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span>
            Hayat AI
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex p-1 rounded-lg border text-xs font-bold ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-300"}`}>
              <button onClick={() => setLang("Urdu")} className={`px-2 md:px-3 py-1 rounded transition-all ${lang === "Urdu" ? "bg-red-600 text-white" : "opacity-60"}`}>اردو</button>
              <button onClick={() => setLang("English")} className={`px-2 md:px-3 py-1 rounded transition-all ${lang === "English" ? "bg-red-600 text-white" : "opacity-60"}`}>EN</button>
            </div>
            <button onClick={() => setTheme(isDark ? "light" : "dark")} className={`p-1.5 md:p-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-800 text-amber-400" : "bg-white border-slate-300 text-slate-800"}`}>
              {isDark ? <Sun className="h-4 w-4 md:h-5 md:w-5" /> : <Moon className="h-4 w-4 md:h-5 md:w-5" />}
            </button>
          </div>
        </header>

        {/* 1122 & GPS Grid */}
        <div className="grid grid-cols-2 gap-2 font-inter">
          <a href="tel:1122" className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 md:py-3.5 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs md:text-sm shadow-lg">
            <PhoneCall className="h-4 w-4 md:h-5 md:w-5 animate-bounce" /> {ui.callBtn}
          </a>
          <div className={`w-full flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3.5 rounded-xl border text-[10px] md:text-xs font-semibold ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-300"}`}>
            <div className="flex items-center gap-1.5 overflow-hidden"><MapPin className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 text-red-500" /> <span className="truncate">{locLoading ? ui.locating : `${location.lat}, ${location.lng}`}</span></div>
            <button onClick={fetchLocation} className="p-1"><RefreshCw className="h-3 w-3 md:h-4 md:w-4 opacity-60" /></button>
          </div>
        </div>

        {/* CPR Metronome */}
        <button onClick={toggleCPR} className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-black text-xs md:text-sm border font-inter ${cprActive ? "bg-red-600 text-white border-red-600 shadow-lg" : (isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-300")}`}>
          <HeartPulse className={`h-4 w-4 md:h-5 md:w-5 ${cprActive ? "animate-ping" : "text-rose-500"}`} /> {cprActive ? ui.cprStop : ui.cprStart}
        </button>

        {/* Quick Actions Grid */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ui.scenarios.map((item, idx) => (
              <button key={idx} onClick={() => submitEmergency(null, item.q)} className={`w-full p-2.5 rounded-xl border text-[11px] md:text-xs font-bold transition hover:border-red-500 ${lang === "Urdu" ? "text-right" : "text-left"} ${isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-300"}`}>
                {item.title}
              </button>
            ))}
          </div>
        </section>

        {/* Main Input Component */}
        <section className={`p-4 md:p-6 rounded-2xl border text-center flex flex-col items-center gap-4 ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"}`}>
          {isRecording ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg animate-pulse"><Mic className="h-8 w-8 text-white" /></div>
              <p className="text-red-500 font-bold text-xs md:text-sm">{ui.recording}</p>
              <button onClick={stopRecording} className="w-full bg-red-600 text-white px-6 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2"><Square className="h-4 w-4" /> {ui.stopRecording}</button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <button onClick={startRecording} disabled={loading} className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all"><Mic className="h-8 w-8" /></button>
              <h2 className="font-black text-base md:text-lg">{ui.micMain}</h2>
              <div className="w-full flex flex-row gap-2 pt-2">
                <input type="text" placeholder={ui.placeholder} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitEmergency(null, inputText)} className={`w-full flex-1 rounded-xl px-3 py-3 text-xs md:text-sm border focus:outline-none ${lang === "Urdu" ? "text-right" : "text-left"} ${isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300"}`} />
                <button onClick={() => submitEmergency(null, inputText)} disabled={loading || !inputText} className="bg-red-600 text-white px-4 md:px-6 rounded-xl font-bold flex justify-center items-center"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </section>

        {loading && <div className="text-center text-red-500 font-bold flex justify-center items-center gap-2 animate-pulse text-xs md:text-sm py-2"><Sparkles className="h-4 w-4 animate-spin" /> {ui.processing}</div>}

        {/* Results Component */}
        {result && (
          <section className={`rounded-2xl border p-4 md:p-5 flex flex-col gap-4 shadow-lg ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <div className={`flex flex-col md:flex-row gap-3 md:items-center justify-between border-b border-slate-700/20 pb-3 ${lang === "Urdu" ? "md:flex-row-reverse" : ""}`}>
              <h3 className={`font-bold text-sm md:text-base ${lang === "Urdu" ? "text-right" : "text-left"}`}>{result.title}</h3>
              <button onClick={() => playAudio(result.spokenSummary)} className={`w-full md:w-auto flex justify-center items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg text-xs font-black shadow ${lang === "Urdu" ? "flex-row-reverse" : ""}`}>
                {isPlayingAudio ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} {isPlayingAudio ? ui.stopAudio : ui.listen}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <p className={`text-xs font-black uppercase text-emerald-500 flex items-center gap-1 ${lang === "Urdu" ? "flex-row-reverse justify-start" : ""}`}><CheckCircle2 className="h-4 w-4" /> {ui.actionSteps}</p>
              {result.dos?.map((step, idx) => (
                <div key={idx} className={`p-3 rounded-xl border flex gap-3 ${lang === "Urdu" ? "flex-row-reverse text-right" : ""} ${isDark ? "bg-slate-950/60 border-emerald-950/40" : "bg-emerald-50/60 border-emerald-200"}`}>
                  <span className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs md:text-sm font-black mt-0.5 shrink-0">{idx + 1}</span>
                  <div className="text-xs md:text-sm">{step}</div>
                </div>
              ))}
            </div>

            {result.videoId && (
              <a href={`https://www.youtube.com/watch?v=${result.videoId}`} target="_blank" rel="noopener noreferrer" className={`mt-2 w-full bg-[#FF0000] hover:bg-red-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md ${lang === "Urdu" ? "flex-row-reverse font-inter text-xs" : "text-xs"}`}>
                <Youtube className="h-5 w-5" /> <span className="truncate">{ui.watchVideo}: {result.videoTitle}</span> <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
