import { test, expect } from '@playwright/test';
test('Verwaltung: anmelden, Thema hochladen, Link erstellen und Ergebnis öffnen', async ({
  page,
}) => {
  let loggedIn = false;
  let hasProfile = false;
  let hasInvitation = false;
  await page.route('**/api/admin/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const profile = {
      id: 'profile-1',
      title: 'Studium',
      created_at: Date.now(),
    };
    const invitation = {
      id: 'invite-1',
      name: 'Anna',
      profile_title: 'Studium',
      created_at: Date.now(),
      expires_at: Date.now() + 86400000,
      status: 'pending',
      mode: null,
      assessment: null,
      turns: '[]',
      elapsed_ms: 0,
      markdown: '## Themen\n- Studium',
    };
    if (url.pathname.endsWith('/session'))
      return route.fulfill({ json: { authenticated: loggedIn } });
    if (url.pathname.endsWith('/login')) {
      loggedIn = true;
      return route.fulfill({ json: { ok: true } });
    }
    if (url.pathname.endsWith('/profiles') && method === 'POST') {
      hasProfile = true;
      return route.fulfill({ json: { profile } });
    }
    if (url.pathname.endsWith('/profiles'))
      return route.fulfill({ json: { profiles: hasProfile ? [profile] : [] } });
    if (url.pathname.endsWith('/invitations') && method === 'POST') {
      hasInvitation = true;
      return route.fulfill({ json: { invitation: { token: 'a'.repeat(43) } } });
    }
    if (url.pathname.endsWith('/invitations/invite-1'))
      return route.fulfill({ json: { invitation } });
    if (url.pathname.endsWith('/invitations'))
      return route.fulfill({
        json: { invitations: hasInvitation ? [invitation] : [] },
      });
    return route.fulfill({ status: 404, json: { error: 'Nicht gefunden' } });
  });
  await page.goto('/verwaltung');
  await page.getByLabel('Benutzername').fill('admin');
  await page.getByLabel('Passwort').fill('sicheres-passwort');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(
    page.getByRole('heading', { name: /Menschen im Mittelpunkt/ }),
  ).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({
    name: 'thema.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('---\ntitle: Studium\n---\n## Themen\n- Studium'),
  });
  await expect(
    page.getByText('Studium', { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel(/Name oder Kennzeichnung/).fill('Anna');
  await page.getByRole('button', { name: 'Einladungslink erstellen' }).click();
  await expect(page.getByLabel('Erstellter Einladungslink')).toHaveValue(
    /\/bewerbung#/,
  );
  await expect(page.getByText('Anna', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Ansehen/ }).click();
  await expect(
    page.getByRole('dialog', { name: 'Ergebnisdetails' }),
  ).toBeVisible();
});
test('Verwaltung ist auf schmalen Bildschirmen lesbar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/admin/session', (route) =>
    route.fulfill({ json: { authenticated: false } }),
  );
  await page.goto('/verwaltung');
  await expect(page.getByRole('heading', { name: /Willkommen/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('gibt eine Einladung frei, wenn der Start während der Anfrage abgebrochen wird', async ({
  page,
}) => {
  let releaseResponse: (() => void) | undefined;
  let deleted = false;
  await page.route('**/api/invitation', (route) =>
    route.fulfill({
      json: { markdown: '## Themen\n- Alltag', name: '', title: 'Alltag' },
    }),
  );
  await page.route('**/api/status', (route) =>
    route.fulfill({
      json: { configured: true, needsAccessCode: false, productionReady: true },
    }),
  );
  await page.route('**/api/session', async (route) => {
    if (route.request().method() === 'DELETE') {
      deleted = true;
      return route.fulfill({ json: { deleted: true } });
    }
    await new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    return route.fulfill({ json: { id: 'late-session' } });
  });
  await page.goto(`/bewerbung#${'x'.repeat(43)}`);
  await page.getByLabel(/Ich bin mit der Verarbeitung/).check();
  await page.getByRole('button', { name: 'Test starten', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abbrechen' })).toBeVisible();
  await expect.poll(() => Boolean(releaseResponse)).toBe(true);
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  releaseResponse!();
  await expect.poll(() => deleted).toBe(true);
});
