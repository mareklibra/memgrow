import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;

      const isOnHomePage = nextUrl.pathname === "/";

      if (isOnHomePage) {
        return true;
      }

      if (!isLoggedIn) {
        return false;
      }

      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
}; // satisfies NextAuthConfig;
