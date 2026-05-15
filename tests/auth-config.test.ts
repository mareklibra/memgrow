import { describe, it, expect } from 'vitest';
import { authConfig } from '@/auth.config';

type AuthParam = Parameters<
  NonNullable<NonNullable<typeof authConfig.callbacks>['authorized']>
>[0];

function callAuthorized(
  pathname: string,
  user: object | null,
): ReturnType<NonNullable<NonNullable<typeof authConfig.callbacks>['authorized']>> {
  const auth = user ? ({ user } as AuthParam['auth']) : null;
  const request = { nextUrl: { pathname } } as AuthParam['request'];
  return authConfig.callbacks!.authorized!({ auth, request } as AuthParam);
}

describe('auth.config authorized callback', () => {
  // ── Home page (public) ──────────────────────────────────────────────
  it('allows unauthenticated access to home page (/)', () => {
    expect(callAuthorized('/', null)).toBe(true);
  });

  it('allows authenticated access to home page (/)', () => {
    expect(callAuthorized('/', { id: '1', name: 'User' })).toBe(true);
  });

  // ── Protected routes ────────────────────────────────────────────────
  it('denies unauthenticated access to /learn', () => {
    expect(callAuthorized('/learn', null)).toBe(false);
  });

  it('denies unauthenticated access to /test', () => {
    expect(callAuthorized('/test', null)).toBe(false);
  });

  it('denies unauthenticated access to /edit', () => {
    expect(callAuthorized('/edit', null)).toBe(false);
  });

  it('denies unauthenticated access to /settings', () => {
    expect(callAuthorized('/settings', null)).toBe(false);
  });

  it('denies unauthenticated access to nested paths', () => {
    expect(callAuthorized('/learn/some-course-id', null)).toBe(false);
  });

  // ── Authenticated access ───────────────────────────────────────────
  it('allows authenticated access to /learn', () => {
    expect(callAuthorized('/learn', { id: '1' })).toBe(true);
  });

  it('allows authenticated access to /test', () => {
    expect(callAuthorized('/test', { id: '1' })).toBe(true);
  });

  it('allows authenticated access to /edit', () => {
    expect(callAuthorized('/edit', { id: '1' })).toBe(true);
  });

  it('allows authenticated access to /settings', () => {
    expect(callAuthorized('/settings', { id: '1' })).toBe(true);
  });

  it('allows authenticated access to nested paths', () => {
    expect(callAuthorized('/learn/course-id/next', { id: '1' })).toBe(true);
  });

  // ── Edge cases ─────────────────────────────────────────────────────
  it('denies unauthenticated access to /login (login page itself is protected by routing)', () => {
    expect(callAuthorized('/login', null)).toBe(false);
  });

  it('treats auth with no user as unauthenticated', () => {
    expect(callAuthorized('/learn', null)).toBe(false);
  });
});

describe('auth.config jwt callback', () => {
  const jwtCallback = authConfig.callbacks!.jwt!;

  it('copies account fields to token on initial sign-in', () => {
    const token = { sub: 'user-id' } as Record<string, unknown>;
    const account = { access_token: 'at-123' } as Record<string, unknown>;
    const user = { id: 'u1', is_admin: true } as Record<string, unknown>;
    const result = jwtCallback({ token, account, user } as never);
    expect(result).toMatchObject({
      accessToken: 'at-123',
      id: 'u1',
      is_admin: true,
    });
  });

  it('defaults is_admin to false when user has no is_admin', () => {
    const token = {} as Record<string, unknown>;
    const account = {} as Record<string, unknown>;
    const user = { id: 'u1' } as Record<string, unknown>;
    const result = jwtCallback({ token, account, user } as never);
    expect(result).toMatchObject({ is_admin: false });
  });

  it('returns token unchanged when no account (subsequent requests)', () => {
    const token = { sub: 'user-id', existing: 'data' } as Record<string, unknown>;
    const result = jwtCallback({ token, account: null, user: undefined } as never);
    expect(result).toEqual(token);
  });
});

describe('auth.config session callback', () => {
  const sessionCallback = authConfig.callbacks!.session!;

  function callSession(
    session: Record<string, Record<string, unknown>>,
    token: Record<string, unknown>,
  ) {
    return sessionCallback({ session, token } as never) as unknown as {
      user: Record<string, unknown>;
    };
  }

  it('sets session.user.id from token.sub', () => {
    const result = callSession({ user: {} }, { sub: 'user-uuid', is_admin: false });
    expect(result.user.id).toBe('user-uuid');
  });

  it('sets session.user.is_admin from token', () => {
    const result = callSession({ user: {} }, { sub: 'user-uuid', is_admin: true });
    expect(result.user.is_admin).toBe(true);
  });

  it('defaults is_admin to false when token has no is_admin', () => {
    const result = callSession({ user: {} }, { sub: 'user-uuid' });
    expect(result.user.is_admin).toBe(false);
  });
});
