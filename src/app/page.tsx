import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { LanguageTest } from '@/components/language-test';
export default async function Home() {
  const markdown = await readFile(
    path.join(process.cwd(), 'config', 'exam.de.md'),
    'utf8',
  );
  return <LanguageTest defaultMarkdown={markdown} />;
}
