import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req) {
  try {
    // Initialize Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const formData = await req.formData();
    const language = formData.get("language") || "Urdu";
    const textQuery = formData.get("textQuery") || "";
    const audioFile = formData.get("audio");

    let finalPrompt = textQuery;
    const isUrdu = language === "Urdu";

    // 1. Audio to Text using Groq Whisper
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

    // 2. Strict AI Prompt
    const systemPrompt = `You are an emergency paramedic AI.
CRITICAL INSTRUCTION: You MUST reply entirely in ${isUrdu ? "URDU (اردو) script ONLY. No English words." : "ENGLISH"}.

Return ONLY valid JSON matching this exact structure:
{
  "severity": "CRITICAL" | "MODERATE" | "STABLE",
  "title": "${isUrdu ? "Title in Urdu" : "Title in English"}",
  "dos": ["${isUrdu ? "Action 1 in Urdu" : "Action 1 in English"}", "${isUrdu ? "Action 2 in Urdu" : "Action 2"}"],
  "donts": ["${isUrdu ? "Warning in Urdu" : "Warning in English"}"],
  "spokenSummary": "${isUrdu ? "A 1-sentence urgent action in pure Urdu" : "A 1-sentence urgent action in English"}"
}
No other text. Only JSON.`;

    // 3. AI Text Generation using Groq Llama 3.3
    const chatCompletion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const parsedData = JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");

    return NextResponse.json({ transcription: finalPrompt, data: parsedData });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
