import type { Metadata } from "next"
import { Toaster } from "react-hot-toast"
import "./globals.css"

export const metadata: Metadata = {
  title: "FinGuard AI — Autonomous Financial Anomaly Investigation",
  description:
    "Autonomous LangGraph-powered platform detecting and investigating financial anomalies using Groq LLM, Pinecone RAG, and Gemini embeddings.",
  keywords: ["fraud detection", "financial security", "AI", "LangGraph", "anomaly detection"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#0f1a2e",
              color: "#e8f0fe",
              border: "1px solid rgba(99, 155, 255, 0.2)",
              borderRadius: "10px",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#0f1a2e" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#0f1a2e" },
            },
          }}
        />
      </body>
    </html>
  )
}
