import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JARVIS // Gemini",
  description: "Assistente multimodal inspirado em uma interface de núcleo energético."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
