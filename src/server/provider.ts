import { GoogleGenAI, Modality, type LiveConnectConfig } from '@google/genai';
import { z } from 'zod';
import type { ExamProfile, Mode, Turn } from '@/lib/types';
import { assessmentSchema, validateAssessment } from '@/lib/assessment';
import { conversationInstruction, assessmentInstruction } from './prompts';
import { HttpError } from './guard';
export const models = () => ({
  text: process.env.GEMINI_TEXT_MODEL || 'gemini-3.8-flash',
  assessment: process.env.GEMINI_ASSESSMENT_MODEL || 'gemini-3.8-flash',
  live: process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live',
});
export function client() {
  if (!process.env.GEMINI_API_KEY)
    throw new HttpError(
      503,
      'Der KI-Zugang fehlt. Trage GEMINI_API_KEY in .env.local ein und starte den Server neu.',
    );
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { apiVersion: 'v1beta', timeout: 45000 },
  });
}
export async function nextQuestion(
  profile: ExamProfile,
  turns: Turn[],
  elapsedMs: number,
) {
  const result = await client().models.generateContent({
    model: models().text,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: JSON.stringify({
              profile,
              elapsedMs,
              transcript: turns.map(({ id, role, text, phase }) => ({
                id,
                role,
                text,
                phase,
              })),
              task: turns.length
                ? 'Stelle die nächste passende Prüfungsfrage.'
                : 'Begrüße kurz und beginne mit einer einfachen Einstiegsfrage.',
            }),
          },
        ],
      },
    ],
    config: {
      systemInstruction: conversationInstruction('text'),
      temperature: 0.7,
      maxOutputTokens: 1500,
    },
  });
  const text = result.text?.trim();
  if (!text) throw new Error('EmptyModelResponse');
  return text.slice(0, 4000);
}
export async function evaluate(mode: Mode, turns: Turn[]) {
  const result = await client().models.generateContent({
    model: models().assessment,
    contents: [
      {
        role: 'user',
        parts: [{ text: JSON.stringify({ mode, transcript: turns }) }],
      },
    ],
    config: {
      systemInstruction: assessmentInstruction(mode),
      temperature: 0.1,
      maxOutputTokens: 6000,
      responseMimeType: 'application/json',
      responseJsonSchema: z.toJSONSchema(assessmentSchema),
    },
  });
  return validateAssessment(JSON.parse(result.text ?? ''), turns);
}
export async function liveCredentials(profile: ExamProfile) {
  const config: LiveConnectConfig = {
    responseModalities: [Modality.AUDIO],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    sessionResumption: {},
    contextWindowCompression: { slidingWindow: {} },
    systemInstruction: conversationInstruction('voice'),
  };
  const model = models().live;
  const token = await client().authTokens.create({
    config: {
      uses: 1,
      expireTime: new Date(Date.now() + 20 * 60000).toISOString(),
      newSessionExpireTime: new Date(Date.now() + 60000).toISOString(),
      liveConnectConstraints: { model, config },
    },
  });
  if (!token.name) throw new Error('MissingEphemeralToken');
  // System instructions remain locked on the provider; no permanent key is exposed.
  return {
    token: token.name,
    model,
    profile,
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      sessionResumption: {},
      contextWindowCompression: { slidingWindow: {} },
    },
  };
}
