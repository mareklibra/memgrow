import type { NextAuthConfig } from 'next-auth';

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
      }
      return token;
    },
    session({ session, token }) {
      // session.accessToken = token.accessToken;
      session.user.id = token.sub as string;
      return session;
    },
  },
  providers: [], // Add providers with an empty array for now
}; // satisfies NextAuthConfig;
