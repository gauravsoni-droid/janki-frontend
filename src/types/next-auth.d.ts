/**
 * Extend NextAuth types.
 */
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    backendToken?: string | null;
    user: {
      id?: string;
      isAdmin?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string | null;
    userId?: string | null;
    isAdmin?: boolean;
    email?: string;
    backendError?: string;
  }
}

