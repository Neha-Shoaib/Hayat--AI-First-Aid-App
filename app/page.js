"use client";
import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, PhoneCall, Volume2, VolumeX, AlertOctagon, CheckCircle2, XCircle, MapPin, HeartPulse, Sun, Moon, Sparkles, Send, Youtube, ExternalLink, RefreshCw } from "lucide-react";

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
  const audioRef = useRef(null); // Audio ko track karne ke liye ref

  const [location, setLocation] = useState({ lat: "Fetching...", lng: "" });
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchLocation();
    
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const fetchLocation = () => {
    setLocLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) });
          setLocLoading(false);
        },
        () => {
          setLocation({ lat: "GPS Off", lng: "" });
          setLocLoading(false);
        }
      );
    }
  };

  // 100% BULLETPROOF AUDIO FIX (Google Cloud GTX API)
  const playAudio = (text) => {
    // Agar pehle se play ho raha hai, toh rokein
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    const langCode = lang === "Urdu" ? "ur" : "en";
    
    // Google TTS limit is 200 chars, so we safely slice it
    const safeText = encodeURIComponent(text.substring(0, 199));
    const audioUrl = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${langCode}&q=${safeText}`;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => {
      setIsPlayingAudio(false);
      alert("Audio network error. Internet check karein.");
    };

    audio.play().catch((err) => {
      console.error("Audio block error:", err);
      setIsPlayingAudio(false);
      alert("Browser ne audio block kar di hai. Please button dobara dabayein.");
    });
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
      alert("Mic permission allow karein.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
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
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.08);
      }, 545);
    }
  };

  if (!mounted) return <main className="min-h-screen bg-slate-950 text-slate-100"></main>;
  const isDark = theme === "dark";

  const ui = lang === "Urdu" ? {
    callBtn: "1122 پر کال کریں",
    locating: "لوکیشن تلاش...",
    cprStart: "سی پی آر شروع کریں",
    cprStop: "سی پی آر روکیں",
    quickScenarios: "فوری صورتحال:",
    scenarios: [
      { title: "🩸 گہرا کٹ / خون", q: "گہرا کٹ لگا ہے اور خون بہہ رہا ہے" },
      { title: "🔥 جل جانا", q: "آگ یا گرم پانی سے جل گیا ہے" },
      { title: "🫁 سانس رکنا", q: "گلے میں کچھ پھنس گیا ہے اور سانس نہیں آ رہی" },
      { title: "⚡ بجلی کا جھٹکا", q: "بجلی کا کرنٹ لگا ہے اور بے ہوش ہے" }
    ],
    micMain: "مائیک دبا کر بولیں",
    micSub: "آواز کے ذریعے مسئلہ بتائیں",
    placeholder: "یا یہاں مسئلہ لکھیں...",
    recording: "آواز سن رہے ہیں...",
    stopRecording: "روکیں اور حل نکالیں",
    processing: "اے آئی حل نکال رہا ہے...",
    actionSteps: "فوری عمل (Action Steps):",
    donts: "یہ ہرگز نہ کریں:",
    listen: "سنیں",
    stopAudio: "روکیں",
    watchVideo: "ویڈیو دیکھیں"
  } : {
    callBtn: "CALL 1122",
    locating: "Locating...",
    cprStart: "START CPR",
    cprStop: "STOP CPR",
    quickScenarios: "Quick Scenarios:",
    scenarios: [
      { title: "🩸 Severe Cut", q: "Severe bleeding from a deep cut" },
      { title: "🔥 Burn / Scald", q: "Burn from fire or boiling water" },
      { title: "🫁 Choking", q: "Person is choking and cannot breathe" },
      { title: "⚡ Electric Shock", q: "Electric shock victim unconscious" }
    ],
    micMain: "Tap Mic & Speak",
    micSub: "State the emergency condition",
    placeholder: "Or type emergency here...",
    recording: "Listening...",
    stopRecording: "Stop & Solve",
    processing: "Processing AI response...",
    actionSteps: "Immediate Actions:",
    donts: "Strict Warnings (Do Not):",
    listen: "Listen",
    stopAudio: "Stop",
    watchVideo: "Watch Video"
  };

  return (
    <main className={`min-h-screen w-full transition-colors duration-200 overflow-x-hidden ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"} ${lang === "Urdu" ? "font-urdu" : "font-inter"}`}>
      <div className="w-full max-w-2xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-4">
        
        <header className="flex flex-wrap items-center justify-between border-b border-slate-700/30 pb-3 gap-3 font-inter">
          <div className="flex items-center gap-2 font-black uppercase text-emerald-500 text-sm sm:text-base">
            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
            Hayat AI
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex p-1 rounded-lg border text-xs sm:text-sm font-bold ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-300"}`}>
              <button onClick={() => setLang("Urdu")} className={`px-3 py-1.5 rounded transition-all ${lang === "Urdu" ? "bg-red-600 text-white" : "opacity-60"}`}>اردو</button>
              <button onClick={() => setLang("English")} className={`px-3 py-1.5 rounded transition-all ${lang === "English" ? "bg-red-600 text-white" : "opacity-60"}`}>EN</button>
            </div>
            <button onClick={() => setTheme(isDark ? "light" : "dark")} className={`p-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-800 text-amber-400" : "bg-white border-slate-300 text-slate-800"}`}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-inter">
          <a href="tel:1122" className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl flex items-center justify-center gap-2 font-black text-sm sm:text-base shadow-lg">
            <PhoneCall className="h-5 w-5 animate-bounce" /> {ui.callBtn}
          </a>
          <div className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-300"}`}>
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap"><MapPin className="h-4 w-4 flex-shrink-0 text-red-500" /> <span className="truncate">{locLoading ? ui.locating : `${location.lat}, ${location.lng}`}</span></div>
            <button onClick={fetchLocation} className="p-1"><RefreshCw className="h-4 w-4 opacity-60 hover:opacity-100" /></button>
          </div>
        </div>

        <button onClick={toggleCPR} className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-black text-sm sm:text-base border font-inter ${cprActive ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20" : (isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-300")}`}>
          <HeartPulse className={`h-5 w-5 ${cprActive ? "animate-ping" : "text-rose-500"}`} /> {cprActive ? ui.cprStop : ui.cprStart}
        </button>

        <section>
          <p className="text-[11px] sm:text-xs font-bold uppercase opacity-60 mb-2 font-inter">{ui.quickScenarios}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ui.scenarios.map((item, idx) => (
              <button key={idx} onClick={() => submitEmergency(null, item.q)} className={`w-full p-3 rounded-xl border text-sm font-bold transition hover:border-red-500 ${lang === "Urdu" ? "text-right" : "text-left"} ${isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-300 shadow-sm"}`}>
                {item.title}
              </button>
            ))}
          </div>
        </section>

        <section className={`p-5 sm:p-8 rounded-2xl border text-center flex flex-col items-center gap-4 ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
          {isRecording ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-600 flex items-center justify-center shadow-lg animate-pulse"><Mic className="h-10 w-10 text-white" /></div>
              <p className="text-red-500 font-bold text-sm sm:text-base">{ui.recording}</p>
              <button onClick={stopRecording} className="w-full sm:w-auto bg-red-600 text-white px-8 py-3.5 rounded-full font-bold text-sm sm:text-base flex items-center justify-center gap-2"><Square className="h-5 w-5" /> {ui.stopRecording}</button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <button onClick={startRecording} disabled={loading} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"><Mic className="h-10 w-10" /></button>
              <div>
                <h2 className="font-black text-lg sm:text-xl">{ui.micMain}</h2>
                <p className="text-sm opacity-60 font-inter">{ui.micSub}</p>
              </div>
              
              <div className="w-full flex flex-col sm:flex-row gap-2 pt-4">
                <input type="text" placeholder={ui.placeholder} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitEmergency(null, inputText)} className={`w-full flex-1 rounded-xl px-4 py-3.5 text-sm sm:text-base border focus:outline-none ${lang === "Urdu" ? "text-right" : "text-left"} ${isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300"}`} />
                <button onClick={() => submitEmergency(null, inputText)} disabled={loading || !inputText} className="w-full sm:w-auto bg-red-600 text-white px-6 py-3.5 rounded-xl font-bold flex justify-center items-center"><Send className="h-5 w-5" /></button>
              </div>
            </div>
          )}
        </section>

        {loading && <div className="text-center text-red-500 font-bold flex justify-center items-center gap-2 animate-pulse text-sm sm:text-base py-2"><Sparkles className="h-5 w-5 animate-spin" /> {ui.processing}</div>}

        {result && (
          <section className={`rounded-2xl border p-4 sm:p-6 flex flex-col gap-5 shadow-lg ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <div className={`flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-b border-slate-700/20 pb-4 ${lang === "Urdu" ? "sm:flex-row-reverse" : ""}`}>
              <h3 className={`font-bold text-base sm:text-lg ${lang === "Urdu" ? "text-right" : "text-left"}`}>{result.title}</h3>
              <button onClick={() => playAudio(result.spokenSummary)} className={`w-full sm:w-auto flex justify-center items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-black shadow active:scale-95 ${lang === "Urdu" ? "flex-row-reverse" : ""}`}>
                {isPlayingAudio ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} {isPlayingAudio ? ui.stopAudio : ui.listen}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <p className={`text-xs sm:text-sm font-black uppercase text-emerald-500 flex items-center gap-1.5 ${lang === "Urdu" ? "flex-row-reverse justify-start" : ""}`}><CheckCircle2 className="h-5 w-5" /> {ui.actionSteps}</p>
              {result.dos?.map((step, idx) => (
                <div key={idx} className={`p-3.5 rounded-xl border flex gap-3 ${lang === "Urdu" ? "flex-row-reverse text-right" : ""} ${isDark ? "bg-slate-950/60 border-emerald-950/40" : "bg-emerald-50/60 border-emerald-200"}`}>
                  <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-sm font-black flex-shrink-0 mt-0.5">{idx + 1}</span>
                  <div className={`text-sm sm:text-base ${lang === "Urdu" ? "leading-loose" : "leading-relaxed"}`}>{step}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <p className={`text-xs sm:text-sm font-black uppercase text-rose-500 flex items-center gap-1.5 ${lang === "Urdu" ? "flex-row-reverse justify-start" : ""}`}><AlertOctagon className="h-5 w-5" /> {ui.donts}</p>
              {result.donts?.map((warning, idx) => (
                <div key={idx} className={`p-3.5 rounded-xl border flex gap-3 ${lang === "Urdu" ? "flex-row-reverse text-right" : ""} ${isDark ? "bg-rose-950/20 border-rose-900/30 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                  <XCircle className="h-6 w-6 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div className={`text-sm sm:text-base ${lang === "Urdu" ? "leading-loose" : "leading-relaxed"}`}>{warning}</div>
                </div>
              ))}
            </div>

            {result.videoId && (
              <a href={`https://www.youtube.com/watch?v=${result.videoId}`} target="_blank" rel="noopener noreferrer" className={`mt-2 w-full bg-[#FF0000] hover:bg-red-700 text-white p-3.5 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md transition ${lang === "Urdu" ? "flex-row-reverse font-inter text-sm sm:text-base" : "text-sm sm:text-base"}`}>
                <Youtube className="h-6 w-6" /> <span className="truncate">{ui.watchVideo}: {result.videoTitle}</span> <ExternalLink className="h-4 w-4 opacity-70 flex-shrink-0" />
              </a>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
