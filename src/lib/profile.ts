import { parseDocument } from 'yaml';
import { z } from 'zod';
import type { ExamProfile } from './types';

const metadataSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  targetLevel: z.literal('B2').default('B2'),
  durationMinutes: z.literal(10).default(10),
}).strict();

export function parseProfile(source: string): ExamProfile {
  if (new TextEncoder().encode(source).length > 32768) throw new Error('Die Markdown-Datei darf höchstens 32 KiB groß sein.');
  let body = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  let metadata: unknown = {};
  if (body.startsWith('---\n')) {
    const end = body.indexOf('\n---', 4);
    if (end < 0) throw new Error('Der YAML-Vorspann ist nicht abgeschlossen.');
    const document = parseDocument(body.slice(4, end), { schema: 'core', uniqueKeys: true });
    if (document.errors.length || document.warnings.length) throw new Error('Der YAML-Vorspann enthält ungültige Werte oder Tags.');
    metadata = document.toJS({ maxAliasCount: 0 });
    body = body.slice(end + 4).trim();
  }
  const parsed = metadataSchema.safeParse(metadata);
  if (!parsed.success) throw new Error('Erlaubte Metadaten: title (Text bis 120 Zeichen), targetLevel: B2, durationMinutes: 10.');
  const sections: Record<string, string> = {};
  let heading = '';
  for (const line of body.split('\n')) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) heading = match[1].toLocaleLowerCase('de');
    else if (heading) sections[heading] = (sections[heading] ?? '') + line + '\n';
  }
  const list = (name: string) => {
    const content = (sections[name] ?? '').trim();
    const entries = content.split('\n').map(l => l.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, '').trim()).filter(Boolean);
    if (entries.length > 20) throw new Error(`Im Abschnitt „${name}“ sind höchstens 20 Einträge erlaubt.`);
    return entries;
  };
  const topics = list('themen');
  const tasks = list('aufgaben');
  if (!topics.length && !tasks.length) throw new Error('Ergänze mindestens ein Thema unter „## Themen“ oder eine Aufgabe unter „## Aufgaben“.');
  return { version: 1, title: parsed.data.title ?? 'Deutsch im Gespräch', targetLevel: 'B2', durationMinutes: 10, context: (sections.kontext ?? '').trim(), topics, tasks, transfer: (sections.transferaufgabe ?? '').trim() };
}
