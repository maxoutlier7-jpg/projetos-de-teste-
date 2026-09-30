import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      systemInstruction:
        "Você é JARVIS, um assistente técnico avançado, direto, elegante e útil. Responda em português do Brasil por padrão. Seja conciso, mas capaz de aprofundar quando necessário. Nunca afirme ter executado ações externas sem realmente tê-las executado."
    });

    const result = await model.generateContent(message);
    return NextResponse.json({ text: result.response.text() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Falha ao consultar o Gemini." }, { status: 500 });
  }
}
