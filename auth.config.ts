import type { NextAuthConfig } from 'next-auth';

declare module 'next-auth' {
  interface User {
    is_admin?: boolean;
    locale?: string | null;
    impersonating?: boolean;
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
      }
      return token;
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
