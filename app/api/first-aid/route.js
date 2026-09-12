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

    // Whisper Speech-to-Text with explicit multilingual decoding
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

    // Structured JSON response taake UI mein badges aur structured cards ban sakein
    const systemPrompt = `You are Hayat AI, a crisis-grade paramedic first aid dispatch assistant.
Target Language: ${isUrdu ? "Urdu (Simple, conversational, natural Urdu script & words understood everywhere)" : "English"}.

You MUST return your answer in valid JSON format ONLY with this exact JSON structure:
{
  "severity": "CRITICAL" | "MODERATE" | "STABLE",
  "title": "Short title of injury/crisis",
  "dos": ["Immediate action 1", "Immediate action 2", "Immediate action 3"],
  "donts": ["Crucial mistake to strictly avoid"],
  "spokenSummary": "A concise 2-sentence conversational instruction written in ${isUrdu ? "Urdu" : "English"} that can be read aloud by Text-to-Speech immediately to save a life without reading bullets."
}

Rules:
- No markdown wrappers outside the JSON.
- Never suggest hospital-only procedures.
- Keep steps direct, physical, and actionable within 10 seconds.`;

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

    return NextResponse.json({
      transcription: finalPrompt,
      data: parsedData,
    });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "First Aid API dispatch failed. Dial 1122 immediately." },
      { status: 500 }
    );
  }
}
