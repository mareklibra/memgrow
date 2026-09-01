import type { NextAuthConfig } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

declare module 'next-auth/jwt' {
  interface JWT {
    tokenVersion?: number;
  }
}

/** True when the JWT's tokenVersion matches the DB (missing claim counts as 0). */
export function isJwtTokenCurrent(
  tokenVersion: unknown,
  dbVersion: number | null,
): boolean {
  if (dbVersion == null) return false;
  const claimed = Number(tokenVersion ?? 0);
  if (!Number.isFinite(claimed)) return false;
  return claimed === dbVersion;
}

declare module 'next-auth' {
  interface User {
    is_admin?: boolean;
    locale?: string | null;
    impersonating?: boolean;
    token_version?: number;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      is_admin?: boolean;
      locale?: string | null;
      impersonating?: boolean;
    };
  }
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;

      const isOnHomePage = nextUrl.pathname === '/';

      if (isOnHomePage) {
        return true;
      }

      if (!isLoggedIn) {
        return false;
      }

      return true;
    },
    jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.id = user?.id;
        token.is_admin = user?.is_admin ?? false;
        token.locale = user?.locale ?? null;
        token.impersonating = user?.impersonating ?? false;
        token.tokenVersion = Number(user?.token_version ?? 0);
      }
      return token as JWT;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.is_admin = (token.is_admin as boolean) ?? false;
      session.user.locale = (token.locale as string | null | undefined) ?? null;
      session.user.impersonating = (token.impersonating as boolean) ?? false;
      return session;
    },
  },
  providers: [], // Add providers with an empty array for now
}; // satisfies NextAuthConfig;
