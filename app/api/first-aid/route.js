import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req) {
  try {
    // OpenAI client initialization
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
      // Agar aap OpenRouter ya koi aur custom API use kar rahi hain jiska model gpt-oss-120b hai, 
      // toh aapko yahan baseURL dena hoga. For example:
      // baseURL: "https://openrouter.ai/api/v1",
    });

    const formData = await req.formData();
    const language = formData.get("language") || "Urdu";
    const textQuery = formData.get("textQuery") || "";
    const audioFile = formData.get("audio");

    let finalPrompt = textQuery;
    const isUrdu = language === "Urdu";

    // OpenAI Whisper for Transcription
    if (audioFile && audioFile.size > 0) {
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: isUrdu ? "ur" : "en",
      });
      finalPrompt = transcription.text;
    }

    if (!finalPrompt || finalPrompt.trim() === "") {
      return NextResponse.json({ error: "No input received" }, { status: 400 });
    }

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
No other text.`;

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Hackathon ke liye fast aur standard model
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
    // Ab yeh exact error message frontend par bheje ga taake alert mein wajah samajh aa jaye
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
