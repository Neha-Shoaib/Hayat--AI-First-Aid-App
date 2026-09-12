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

    // Agar user ne voice message bheja hai toh Whisper se transcribe karein
    if (audioFile && audioFile.size > 0) {
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-large-v3",
        response_format: "text",
      });
      finalPrompt = transcription;
    }

    if (!finalPrompt || finalPrompt.trim() === "") {
      return NextResponse.json({ error: "No input provided" }, { status: 400 });
    }

    const isUrdu = language.toLowerCase().includes("urdu");

    const systemPrompt = isUrdu
      ? `Aap aik Emergency First Aid AI assistant hain. User intehai panic ya emergency mein hai.
Strict Qawaid:
1. Jawab aasan aur fori fehm Urdu (Roman Urdu aur aam Urdu) mein ho.
2. Bilkul seedhe sirf 3-4 bullet points likhein jo foran karne hain (DOs).
3. 1 sakht warning likhein jo bilkul NAHI karni (DON'T).
4. Koi lambi explanation ya doctori jargon nahi.
5. Akhir mein bolen: "Ambulance aane tak mareez ke sath rahein."`
      : `You are an Emergency First Aid AI Assistant. The user is in an urgent emergency.
Rules:
1. Provide strictly 3-4 bullet points of immediate life-saving actions (DOs).
2. Provide 1 strict warning of what NOT to do (DON'T).
3. No medical jargon. Keep it ultra-concise and clear.
4. End with: "Stay with the patient until ambulance arrives."`;

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalPrompt },
      ],
      temperature: 0.1,
    });

    const advice = chatCompletion.choices[0]?.message?.content || "";

    return NextResponse.json({
      transcription: finalPrompt,
      advice: advice,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Emergency service error. Please call 1122 immediately." },
      { status: 500 }
    );
  }
}
