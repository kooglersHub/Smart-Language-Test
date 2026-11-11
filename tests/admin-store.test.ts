import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminStore } from '@/server/admin-store';

let store: AdminStore;
beforeEach(() => {
  store = new AdminStore(':memory:');
});
afterEach(() => {
  store.close();
  vi.useRealTimers();
});

describe('Bewerberverwaltung', () => {
  const markdown = '---\ntitle: Studium\n---\n## Themen\n- Universität';
  it('gibt eine noch leere Einladung nach fehlgeschlagenem Start wieder frei', () => {
    const profile = store.createProfile(markdown);
    const link = store.createInvitation(profile.id, '', 14);
    store.startInvitation(link.token, 'broken', 'voice');
    store.releaseInvitation('broken');
    expect(store.startInvitation(link.token, 'retry', 'voice').id).toBe(
      link.id,
    );
  });
  it('gibt eine begonnene Einladung mit bereits gespeicherten Ereignissen nicht erneut frei', () => {
    const profile = store.createProfile(markdown);
    const link = store.createInvitation(profile.id, '', 14);
    store.startInvitation(link.token, 'running', 'voice');
    store.saveProgress('running', [], undefined, 0, false, [
      { type: 'Audioverbindung hergestellt', atMs: 0 },
    ]);
    store.releaseInvitation('running');
    expect(() => store.invitationByToken(link.token)).toThrow();
  });
  it('behält Ereignisse für den Betreiber bei', () => {
    const profile = store.createProfile(markdown);
    const link = store.createInvitation(profile.id, '', 14);
    store.startInvitation(link.token, 'session-1', 'voice');
    store.saveProgress('session-1', [], undefined, 5000, false, [
      { type: 'Verbindung unterbrochen', atMs: 3000 },
    ]);
    expect(JSON.parse(store.getInvitation(link.id)!.events)[0].type).toBe(
      'Verbindung unterbrochen',
    );
  });
  it('überschreibt neuere Antworten nicht mit verspäteten Speicheranfragen', () => {
    const profile = store.createProfile(markdown);
    const link = store.createInvitation(profile.id, '', 14);
    store.startInvitation(link.token, 'session-1', 'text');
    const turn = {
      id: 'a',
      role: 'user' as const,
      text: 'Eine Antwort',
      phase: 'warmup' as const,
      status: 'final' as const,
    };
    store.saveProgress('session-1', [turn], undefined, 5000, false);
    store.saveProgress('session-1', [], undefined, 3000, false);
    expect(JSON.parse(store.getInvitation(link.id)!.turns)).toHaveLength(1);
  });
  it('authentifiziert nur gültige Zugangsdaten und beendet Sitzungen', () => {
    store.bootstrap('admin', 'ein-langes-sicheres-passwort');
    expect(() => store.login('admin', 'falsch', 'client')).toThrow();
    const session = store.login(
      'admin',
      'ein-langes-sicheres-passwort',
      'client',
    );
    expect(store.isAuthenticated(session)).toBe(true);
    expect(store.isAuthenticated('unbekannt')).toBe(false);
    store.logout(session);
    expect(store.isAuthenticated(session)).toBe(false);
  });
  it('speichert Profile und unveränderliche Kopien für Einladungen', () => {
    const profile = store.createProfile(markdown);
    const link = store.createInvitation(profile.id, 'Anna', 14);
    store.deleteProfile(profile.id);
    expect(store.invitationByToken(link.token).markdown).toBe(markdown);
    expect(store.listInvitations()[0]).not.toHaveProperty('token');
  });
  it('erlaubt pro Link nur einen gleichzeitigen Start und schützt vor Wiederverwendung', () => {
    const profile = store.createProfile(markdown);
    const link = store.createInvitation(profile.id, '', 14);
    store.startInvitation(link.token, 'session-1', 'text');
    expect(() =>
      store.startInvitation(link.token, 'session-2', 'text'),
    ).toThrow();
    store.saveProgress('session-1', [], undefined, 1000, true);
    expect(() =>
      store.startInvitation(link.token, 'session-3', 'text'),
    ).toThrow();
    expect(store.listInvitations()[0].status).toBe('completed');
  });
  it('verweigert ungültige, widerrufene und abgelaufene Links', () => {
    vi.useFakeTimers();
    const profile = store.createProfile(markdown);
    const link = store.createInvitation(profile.id, '', 1);
    expect(() => store.invitationByToken('wrong')).toThrow();
    store.revokeInvitation(link.id);
    expect(() => store.invitationByToken(link.token)).toThrow();
    const second = store.createInvitation(profile.id, '', 1);
    vi.advanceTimersByTime(86400001);
    expect(() => store.invitationByToken(second.token)).toThrow();
  });
  it('löscht veraltete unvollständige Prüfungen und speichert keine Roh-Tokens', () => {
    vi.useFakeTimers();
    const profile = store.createProfile(markdown);
    const link = store.createInvitation(profile.id, 'Anna', 14);
    store.startInvitation(link.token, 'session-1', 'text');
    vi.advanceTimersByTime(91 * 86400000);
    store.cleanup();
    expect(store.listInvitations()).toHaveLength(0);
  });
});
