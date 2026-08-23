/**
 * geminiAnalysis.ts
 * Real-time AI-powered hazard safety analysis via Gemini API.
 * Called when a user selects a community hazard in the Crowdsourced Logs panel.
 */
import { GoogleGenAI } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export interface HazardInput {
  type: string;
  severity: string;
  description: string;
  reporter: string;
  timeAgo: string;
  votes: number;
}

/**
 * Generates a real-time safety assessment for a community hazard using Gemini.
 * Returns the AI analysis text, or a fallback message if the API key is not set.
 */
export async function analyzeHazard(hazard: HazardInput): Promise<string> {
  if (!API_KEY) {
    return '⚠ Set VITE_GEMINI_API_KEY in your .env file to enable AI safety analysis.';
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const prompt = `You are NARI-AI, a women's safety analyst for Bhubaneswar, India.

A community hazard has been flagged on the NARI safe-routes map:
• Hazard type: ${hazard.type.replace(/_/g, ' ')}
• Severity: ${hazard.severity.toUpperCase()}
• Report: "${hazard.description}"
• Reporter: ${hazard.reporter} (${hazard.timeAgo} — ${hazard.votes} community confirmations)

In exactly 2–3 concise sentences, provide:
1. A clear safety assessment of this specific hazard and why it poses a risk.
2. One immediate, concrete action a woman should take when navigating near this area.

Be direct, empathetic, and specific to the Bhubaneswar urban context. Do not use bullet points or headers.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  return response.text ?? 'Analysis unavailable.';
}
