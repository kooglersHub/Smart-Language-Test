'use client';
import { useEffect, useState } from 'react';
import { LanguageTest } from '@/components/language-test';
export default function InvitationPage() {
  const [invitation, setInvitation] = useState<{
    token: string;
    markdown: string;
  }>();
  const [error, setError] = useState('');
  useEffect(() => {
    const token = window.location.hash.slice(1);
    if (!token) {
      setTimeout(() => setError('Dieser Einladungslink ist unvollständig.'), 0);
      return;
    }
    const controller = new AbortController();
    void fetch('/api/invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setInvitation({ token, markdown: body.markdown });
      })
      .catch((reason) => {
        if (reason.name !== 'AbortError')
          setError(reason.message || 'Einladung konnte nicht geladen werden.');
      });
    return () => controller.abort();
  }, []);
  if (error)
    return (
      <main className="invite-message">
        <h1>Einladung nicht verfügbar</h1>
        <p>{error}</p>
        <p>Bitte wende dich an die Person, die dich eingeladen hat.</p>
      </main>
    );
  if (!invitation)
    return (
      <main className="invite-message">
        <p>Deine Einladung wird geladen …</p>
      </main>
    );
  return (
    <LanguageTest
      defaultMarkdown={invitation.markdown}
      invitationToken={invitation.token}
    />
  );
}
