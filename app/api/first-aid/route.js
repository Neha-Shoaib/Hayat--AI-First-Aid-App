import { NextResponse } from "next/server";
import Groq from "groq-sdk";

// Guaranteed Active YouTube IDs (St John Ambulance & Red Cross)
const VIDEO_REGISTRY = {
  "cpr": { id: "O-q8x-p1e40", title: "CPR Guide" },
  "choking": { id: "7CgtIgSyAiU", title: "Choking Rescue" },
  "bleeding": { id: "NxO5LvgqZe0", title: "Stop Bleeding" },
  "burn": { id: "EaJmzB8YgS0", title: "Treating Burns" },
  "shock": { id: "iVpG6B3X8Lw", title: "Electric Shock" }
};

export async function POST(req) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const formData = await req.formData();
    const language = formData.get("language") || "Urdu";
    const textQuery = formData.get("textQuery") || "";
    const audioFile = formData.get("audio");

    let finalPrompt = textQuery;
    const isUrdu = language === "Urdu";

    if (audioFile && audioFile.size > 0) {
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-large-v3",
        response_format: "text",
        language: isUrdu ? "ur" : "en",
      });
      finalPrompt = transcription;
    }

    if (!finalPrompt || finalPrompt.trim() === "") {
      return NextResponse.json({ error: "No input received" }, { status: 400 });
    }

    const systemPrompt = `You are an emergency paramedic AI.
Reply entirely in ${isUrdu ? "URDU (اردو) script ONLY." : "ENGLISH"}.

Determine the emergency category strictly from this list: "cpr", "choking", "bleeding", "burn", "shock", or "none".

Return ONLY valid JSON:
{
  "severity": "CRITICAL" | "MODERATE" | "STABLE",
  "title": "${isUrdu ? "Title in Urdu" : "Title in English"}",
  "dos": ["${isUrdu ? "Action 1 in Urdu" : "Action 1"}", "${isUrdu ? "Action 2 in Urdu" : "Action 2"}"],
  "donts": ["${isUrdu ? "Warning in Urdu" : "Warning in English"}"],
  "spokenSummary": "${isUrdu ? "1 short urgent action in pure Urdu without any symbols or english words" : "1 short urgent action in English"}",
  "videoCategory": "cpr" | "choking" | "bleeding" | "burn" | "shock" | "none"
}`;

    const chatCompletion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: finalPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const parsedData = JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
    
    // Attach verified video based on category
    const videoObj = VIDEO_REGISTRY[parsedData.videoCategory];
    if (videoObj) {
      parsedData.videoId = videoObj.id;
      parsedData.videoTitle = videoObj.title;
    } else {
      parsedData.videoId = null;
    }

    return NextResponse.json({ transcription: finalPrompt, data: parsedData });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
