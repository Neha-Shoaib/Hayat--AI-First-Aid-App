import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const formData = await req.formData();
    const language = formData.get("language") || "Urdu";
    const textQuery = formData.get("textQuery") || "";
    const audioFile = formData.get("audio");

    let finalPrompt = textQuery;

    if (audioFile && audioFile.size > 0) {
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-large-v3",
        response_format: "text",
        language: language === "Urdu" ? "ur" : "en",
        temperature: 0.0,
      });
      finalPrompt = transcription;
    }

    if (!finalPrompt || finalPrompt.trim() === "") {
      return NextResponse.json({ error: "No input received" }, { status: 400 });
    }

    const isUrdu = language === "Urdu";

    // EXTREMELY STRICT LANGUAGE PROMPT
    const systemPrompt = `You are an emergency paramedic AI.
CRITICAL INSTRUCTION: You MUST reply entirely in ${isUrdu ? "URDU (اردو) script ONLY. Do not use English words." : "ENGLISH"}.

Return ONLY valid JSON matching this exact structure:
{
  "severity": "CRITICAL" | "MODERATE" | "STABLE",
  "title": "${isUrdu ? "Write title in Urdu" : "Write title in English"}",
  "dos": ["${isUrdu ? "Action 1 in Urdu" : "Action 1 in English"}", "${isUrdu ? "Action 2 in Urdu" : "Action 2"}"],
  "donts": ["${isUrdu ? "Warning in Urdu" : "Warning in English"}"],
  "spokenSummary": "${isUrdu ? "A very short 1-sentence urgent action in pure Urdu (under 150 characters)" : "A short 1-sentence urgent action in English (under 150 characters)"}"
}

No other text. Only the JSON object.`;

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const parsedData = JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");

    return NextResponse.json({
      transcription: finalPrompt,
      data: parsedData,
    });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Error processing request. Call 1122." },
      { status: 500 }
    );
  }
}
