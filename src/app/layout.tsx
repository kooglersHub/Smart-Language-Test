import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Sprachraum · Wie gut ist dein Deutsch?',
  description:
    'Dein Deutsch im Gespräch entdecken. Zehn Minuten, ein echter Austausch und eine begründete B2-Voreinschätzung.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
