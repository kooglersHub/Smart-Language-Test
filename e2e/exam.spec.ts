import { test, expect } from '@playwright/test';
test('echter API-Endpunkt akzeptiert die sichtbare Origin und verweigert fremde Origins', async ({
  request,
}) => {
  const status = await (await request.get('/api/status')).json();
  test.skip(
    status.needsAccessCode,
    'Der lokale Server ist durch einen individuellen Zugangscode geschützt.',
  );
  const own = await request.post('/api/session', {
    headers: { Origin: 'http://127.0.0.1:3000' },
    data: {},
  });
  expect(own.status()).toBe(400); // Validation reached; no model call or key required.
  const foreign = await request.post('/api/session', {
    headers: { Origin: 'https://fremd.example' },
    data: {},
  });
  expect(foreign.status()).toBe(403);
});
test.beforeEach(async ({ page }) => {
  await page.route('**/api/status', (route) =>
    route.fulfill({
      json: {
        configured: true,
        needsAccessCode: false,
        productionReady: true,
        provider: 'Google Gemini',
      },
    }),
  );
  await page.route('**/api/session', (route) =>
    route.fulfill({ json: { id: 'browser-test' } }),
  );
  await page.route('**/api/chat', async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      json: {
        text: body.turns.length
          ? 'Welche Vorteile hat das für dich? Begründe deine Meinung.'
          : 'Erzähle mir von einer Situation, in der du etwas Neues gelernt hast.',
      },
    });
  });
  await page.route('**/api/assess', (route) =>
    route.fulfill({
      json: {
        assessment: {
          level: 'nicht beurteilbar',
          b2: 'unklar',
          summary: 'Für eine Einstufung fehlen ausreichende Antworten.',
          strengths: [],
          improvements: ['Führe den Test vollständig durch.'],
          criteria: [],
          evidence: [],
        },
      },
    }),
  );
});
test('Textprüfung protokolliert Antwortzeiten und exportiert nach vorzeitigem Ende', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Textchat/ }).click();
  await expect(
    page.getByRole('button', { name: 'Test starten', exact: true }),
  ).toBeDisabled();
  await page.getByLabel(/Ich bin mit der Verarbeitung/).check();
  await page.getByRole('button', { name: 'Test starten', exact: true }).click();
  await expect(
    page.getByText('Erzähle mir von einer Situation', { exact: false }),
  ).toBeVisible();
  await page
    .getByPlaceholder('Schreibe deine Antwort …')
    .fill(
      'Ich habe vor einem Jahr Deutsch gelernt, weil ich in Deutschland studieren möchte.',
    );
  await page.getByRole('button', { name: 'Antwort senden' }).click();
  await expect(page.getByText(/Reaktion/).first()).toBeVisible();
  await expect(
    page.getByText('Welche Vorteile hat das für dich? Begründe deine Meinung.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Test beenden' }).click();
  await expect(
    page.getByRole('heading', { name: 'Deine Einschätzung' }),
  ).toBeVisible();
  await expect(
    page.getByText('Nicht ausreichend beurteilbar', { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON herunterladen' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
});
test('zeigt Profilfehler und übernimmt ein gültiges eigenes Profil', async ({
  page,
}) => {
  await page.goto('/');
  const input = page.locator('input[type=file]');
  await input.setInputFiles({
    name: 'ungültig.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Leer'),
  });
  await expect(
    page.getByRole('alert').filter({ hasText: 'mindestens ein Thema' }),
  ).toBeVisible();
  await input.setInputFiles({
    name: 'uni.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      '---\ntitle: Studium\n---\n## Themen\n- Studieren in Deutschland',
    ),
  });
  await expect(page.getByText('Studium', { exact: true })).toBeVisible();
});
test('fehlender KI-Zugang verhindert eine scheinbar echte Prüfung', async ({
  page,
}) => {
  await page.route('**/api/status', (route) =>
    route.fulfill({
      json: {
        configured: false,
        needsAccessCode: false,
        productionReady: true,
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByText(/GEMINI_API_KEY/)).toBeVisible();
  await page.getByLabel(/Ich bin mit der Verarbeitung/).check();
  await expect(
    page.getByRole('button', { name: 'Test starten', exact: true }),
  ).toBeDisabled();
});
test('mobile Ansicht bleibt ohne horizontalen Überlauf bedienbar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Dein Deutsch/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('wartet nach fehlgeschlagener KI-Antwort auf Wiederholung statt eine zweite Teilnehmerantwort zu senden', async ({
  page,
}) => {
  await page.route('**/api/chat', async (route) => {
    const { turns } = route.request().postDataJSON();
    await route.fulfill(
      turns.length
        ? {
            status: 503,
            json: { error: 'Dienst vorübergehend nicht erreichbar.' },
          }
        : { json: { text: 'Was lernst du gerade?' } },
    );
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Textchat/ }).click();
  await page.getByLabel(/Ich bin mit der Verarbeitung/).check();
  await page.getByRole('button', { name: 'Test starten', exact: true }).click();
  await expect(page.getByText('Was lernst du gerade?')).toBeVisible();
  await page
    .getByPlaceholder('Schreibe deine Antwort …')
    .fill('Ich lerne Deutsch für mein Studium.');
  await page.getByRole('button', { name: 'Antwort senden' }).click();
  await expect(
    page.getByText('Dienst vorübergehend nicht erreichbar.'),
  ).toBeVisible();
  await page
    .getByPlaceholder('Schreibe deine Antwort …')
    .fill('Eine weitere Antwort ohne neue Frage.');
  await expect(
    page.getByRole('button', { name: 'Antwort senden' }),
  ).toBeDisabled();
});

test('erlaubt eine begonnene Antwort in der Abschlussfrist und beendet nach dem Absenden', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: /Textchat/ }).click();
  await page.getByLabel(/Ich bin mit der Verarbeitung/).check();
  await page.getByRole('button', { name: 'Test starten', exact: true }).click();
  await expect(
    page.getByText('Erzähle mir von einer Situation', { exact: false }),
  ).toBeVisible();
  await page.clock.fastForward(599000);
  await page
    .getByPlaceholder('Schreibe deine Antwort …')
    .fill('Ich habe beim Lernen viele neue Erfahrungen gemacht.');
  await page.clock.fastForward(1500);
  await expect(page.getByText('ABSCHLUSSFRIST', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Antwort senden' }).click();
  await expect(
    page.getByRole('heading', { name: 'Deine Einschätzung' }),
  ).toBeVisible();
});

test('eine spät abgelehnte Mikrofonfreigabe verändert keinen neu gestarteten Texttest', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () =>
        new Promise((_resolve, reject) => {
          (
            window as unknown as { rejectMic: (error: Error) => void }
          ).rejectMic = reject;
        }),
    });
  });
  await page.route('**/api/live', (route) =>
    route.fulfill({
      json: {
        token: 'auth_tokens/test',
        model: 'gemini-3.8-live',
        config: {},
        profile: { title: 'Test' },
      },
    }),
  );
  await page.goto('/');
  await page.getByLabel(/Ich bin mit der Verarbeitung/).check();
  await page.getByRole('button', { name: 'Test starten', exact: true }).click();
  await page.waitForFunction(() =>
    Boolean((window as unknown as { rejectMic: unknown }).rejectMic),
  );
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.getByRole('button', { name: /Textchat/ }).click();
  await page.getByLabel(/Ich bin mit der Verarbeitung/).check();
  await page.getByRole('button', { name: 'Test starten', exact: true }).click();
  await expect(
    page.getByText('Erzähle mir von einer Situation', { exact: false }),
  ).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { rejectMic: (error: Error) => void }).rejectMic(
      new Error('Mikrofon abgelehnt'),
    ),
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(errors).toEqual([]);
  await expect(
    page.getByText('Erzähle mir von einer Situation', { exact: false }),
  ).toBeVisible();
});
