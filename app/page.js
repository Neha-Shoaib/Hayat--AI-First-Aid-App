"use client";
import React, { useState, useRef } from "react";
import { Mic, Square, PhoneCall, Volume2, Sparkles, AlertTriangle } from "lucide-react";

export default function EmergencyApp() {
  const [lang, setLang] = useState("Urdu");
  const [inputMode, setInputMode] = useState("voice"); // 'voice' or 'text'
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [advice, setAdvice] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        sendEmergencyRequest(audioBlob, null);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone permission zaroori hai voice use karne ke liye.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Backend submission handler
  const sendEmergencyRequest = async (audioBlob, manualText) => {
    setLoading(true);
    setAdvice("");
    try {
      const formData = new FormData();
      formData.append("language", lang);

      if (audioBlob) {
        formData.append("audio", audioBlob, "emergency.webm");
      } else if (manualText) {
        formData.append("textQuery", manualText);
      }

      const res = await fetch("/api/first-aid", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTranscription(data.transcription);
      setAdvice(data.advice);
      playAudioResponse(data.advice);
    } catch (err) {
      setAdvice("Error: Emergency service tak connect nahi ho saka. Barah-e-raast 1122 milayein.");
    } finally {
      setLoading(false);
    }
  };

  // Browser Text-to-Speech (Speaks out the first aid steps)
  const playAudioResponse = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ""));
      utterance.rate = 0.9;
      utterance.lang = lang === "Urdu" ? "ur-PK" : "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className="max-w-xl mx-auto p-4 sm:p-6 flex flex-col min-h-screen">
      {/* 1122 Direct Rescue Bar */}
      <a
        href="tel:1122"
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-red-900/40 text-lg transition-all animate-pulse"
      >
        <PhoneCall className="h-6 w-6" />
        CALL RESCUE 1122 (IMMEDIATE)
      </a>

      {/* Header & Language Toggle */}
      <div className="mt-6 flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">🚑 HAYAT AI</h1>
          <p className="text-xs text-slate-400">First-Aid Emergency Response</p>
        </div>
        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-sm">
          <button
            onClick={() => setLang("Urdu")}
            className={`px-3 py-1 rounded-md font-semibold ${
              lang === "Urdu" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            اردو
          </button>
          <button
            onClick={() => setLang("English")}
            className={`px-3 py-1 rounded-md font-semibold ${
              lang === "English" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Quick Emergency Buttons */}
      <div className="mt-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          ⚡ Quick Select:
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "🩸 Bleeding / Khoon", query: "Severe bleeding from deep cut" },
            { label: "🔥 Burn / Jalna", query: "Skin burn from boiling water or fire" },
            { label: "🫁 Choking / Saans", query: "Person choking and unable to breathe" },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => sendEmergencyRequest(null, item.query)}
              className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 py-2.5 px-2 rounded-lg border border-slate-700 font-medium transition"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Voice / Text Interaction Center */}
      <div className="mt-8 flex-1 flex flex-col items-center justify-center bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 text-center shadow-inner">
        {isRecording ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center animate-ping">
              <Mic className="h-10 w-10 text-red-500" />
            </div>
            <p className="text-red-400 font-semibold animate-pulse">Suno ja raha hai... (Recording)</p>
            <button
              onClick={stopRecording}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-full font-bold flex items-center gap-2"
            >
              <Square className="h-4 w-4 fill-white" /> Stop & Get Help
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            <button
              onClick={startRecording}
              disabled={loading}
              className="w-24 h-24 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/30 transition-transform active:scale-95"
            >
              <Mic className="h-10 w-10" />
            </button>
            <div>
              <p className="font-bold text-lg text-white">
                {lang === "Urdu" ? "Bol kar batayein (Mic dabayein)" : "Tap Mic & Speak the Emergency"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                e.g. "Khoon nahi ruk raha" ya "Bachay ke halaq mein cheez phans gayi"
              </p>
            </div>

            <div className="w-full flex items-center gap-2 mt-4 pt-4 border-t border-slate-700/60">
              <input
                type="text"
                placeholder={lang === "Urdu" ? "Ya likh kar batayein..." : "Or type here..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendEmergencyRequest(null, inputText)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
              <button
                onClick={() => sendEmergencyRequest(null, inputText)}
                disabled={loading || !inputText}
                className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="mt-4 p-4 text-center text-red-400 font-semibold flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 animate-spin" /> First-Aid tayyar ho raha hai...
        </div>
      )}

      {/* Advice Display Section */}
      {advice && (
        <div className="mt-6 bg-slate-800 border-2 border-emerald-500/80 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-3">
            <h3 className="text-emerald-400 font-bold text-lg flex items-center gap-2">
              📋 Fori Qadam (Immediate Steps):
            </h3>
            <button
              onClick={() => playAudioResponse(advice)}
              className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 px-2.5 py-1.5 rounded-md text-slate-200"
            >
              <Volume2 className="h-4 w-4" /> Suno (Listen)
            </button>
          </div>

          {transcription && (
            <p className="text-xs text-slate-400 mb-3 italic">
              Detected: "{transcription}"
            </p>
          )}

          <div
            className={`text-slate-100 whitespace-pre-line leading-relaxed text-sm sm:text-base ${
              lang === "Urdu" ? "font-urdu text-right leading-loose" : ""
            }`}
          >
            {advice}
          </div>
        </div>
      )}
    </main>
  );
}
