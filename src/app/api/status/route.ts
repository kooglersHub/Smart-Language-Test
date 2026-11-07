export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ configured: Boolean(process.env.GEMINI_API_KEY), needsAccessCode: Boolean(process.env.ACCESS_CODE) || process.env.NODE_ENV === 'production', productionReady: process.env.NODE_ENV !== 'production' || (process.env.ACCESS_CODE?.length ?? 0) >= 16, provider: 'Google Gemini', privacyUrl: 'https://ai.google.dev/gemini-api/terms' }, { headers: { 'Cache-Control': 'no-store' } });
}
