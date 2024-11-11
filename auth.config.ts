import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      console.log("auth.config.ts authorized() called: ", auth);
      const isLoggedIn = !!auth?.user;

      const isOnHomePage = nextUrl.pathname.startsWith("/");
      if (isOnHomePage) {
        return true;
      }

      // Response.redirect(new URL("/dashboard", nextUrl));
      return isLoggedIn;
    },
  },
  providers: [], // Add providers with an empty array for now
}; // satisfies NextAuthConfig;
