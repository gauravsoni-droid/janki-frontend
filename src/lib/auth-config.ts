/**
 * NextAuth.js configuration.
 * Google OAuth with email domain restriction and FastAPI backend integration.
 */
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import axios from "axios";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account", // Force account selection screen to always show
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile", // Explicitly request openid scope to get id_token
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Check email domain restriction - only allow company email domain
      const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || "@cloudusinfotech.com";
      
      if (!user.email?.endsWith(allowedDomain)) {
        console.error(`Email ${user.email} does not match allowed domain ${allowedDomain}`);
        // Return false to reject sign in - NextAuth will redirect to error page
        // The error will be passed as ?error=AccessDenied in the URL
        return false;
      }
      
      return true;
    },
    async jwt({ token, account, user, trigger }) {
      // Initial sign in - get backend token from FastAPI
      // Only run this logic on initial sign-in when both account and user are present
      if (account && user) {
        // Debug: Log account object to see what we have
        console.log("[NextAuth] 🔍 JWT Callback - Account object:", {
          provider: account.provider,
          type: account.type,
          hasIdToken: !!account.id_token,
          hasAccessToken: !!account.access_token,
          accountKeys: Object.keys(account),
        });
        
        // Check if we have an ID token (required for backend verification)
        let idTokenToUse = account.id_token;
        
        if (!idTokenToUse && account.provider === "google" && account.access_token) {
          console.warn("[NextAuth] ⚠️ No id_token in account, attempting to fetch from Google token endpoint...");
          try {
            // Try to get user info from Google to verify the token
            // Note: This is a workaround - ideally id_token should be in account object
            const userInfoResponse = await axios.get(
              `https://www.googleapis.com/oauth2/v2/userinfo`,
              {
                headers: {
                  Authorization: `Bearer ${account.access_token}`,
                },
              }
            );
            
            console.log("[NextAuth] ✅ Got user info from Google:", userInfoResponse.data.email);
            // We have user info, but still need id_token for backend
            // The backend expects id_token, so we'll need to handle this differently
            console.warn("[NextAuth] ⚠️ Cannot get id_token from access_token. Backend verification may fail.");
          } catch (error: any) {
            console.error("[NextAuth] ❌ Failed to get user info from Google:", error.message);
          }
        }
        
        if (!idTokenToUse) {
          console.error("[NextAuth] ❌ No ID token available in account object");
          console.error("[NextAuth] Account object keys:", Object.keys(account));
          console.error("[NextAuth] Account provider:", account.provider);
          console.error("[NextAuth] Account type:", account.type);
        }
        
        if (idTokenToUse) {
          try {
            // Call backend to verify Google token and get JWT
            // Prefer explicit env, otherwise default to 127.0.0.1 (more reliable than localhost on some Windows setups)
            const backendUrl =
              process.env.NEXT_PUBLIC_API_URL ||
              process.env.BACKEND_URL ||
              "http://127.0.0.1:8002";
            console.log("[NextAuth] 🔐 Attempting to verify token with backend:", backendUrl);
            
            const response = await axios.post(
              `${backendUrl}/api/v1/auth/verify`,
              {
                google_token: idTokenToUse,
              },
              {
                timeout: 20000, // 20 second timeout (OAuth callback can be slow on some networks)
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
            
            // Store backend JWT in token
            if (response.data?.token) {
              token.backendToken = response.data.token;
              token.userId = response.data.user?.id || user.email;
              token.isAdmin = response.data.user?.is_admin || false;
              token.email = user.email || undefined;
              console.log("[NextAuth] ✅ Backend token obtained successfully");
              console.log("[NextAuth] Token length:", response.data.token.length);
            } else {
              throw new Error("Backend response missing token");
            }
          } catch (error: any) {
            console.error("[NextAuth] ❌ Error verifying token with backend");
            console.error("[NextAuth] Error message:", error.message);
            console.error("[NextAuth] Error response:", error.response?.data);
            console.error("[NextAuth] Error status:", error.response?.status);
            console.error(
              "[NextAuth] Backend URL:",
              process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || "http://127.0.0.1:8002"
            );
            
            // If backend rejects due to email domain (403), throw error to prevent sign in
            if (error.response?.status === 403 && error.response?.data?.detail?.includes("Email domain not allowed")) {
              throw new Error("Email domain not allowed");
            }
            
            // Don't throw error - allow session to be created but mark backend as unavailable
            // If we already have a backendToken (e.g., temporary backend hiccup), preserve it.
            // Otherwise, set it to null so UI can show "backend unavailable".
            token.backendToken = token.backendToken ?? null;
            token.userId = user.id || user.email || undefined;
            token.isAdmin = false;
            token.email = user.email || undefined;
            token.backendError = error.response?.data?.detail || error.message || "Backend unavailable";
          }
        } else {
          // No ID token available - try fallback method using email
          console.warn("[NextAuth] ⚠️ No ID token available, trying fallback email verification...");
          
          if (user.email) {
            try {
              const backendUrl =
                process.env.NEXT_PUBLIC_API_URL ||
                process.env.BACKEND_URL ||
                "http://127.0.0.1:8002";
              console.log("[NextAuth] 🔐 Attempting fallback verification with email:", backendUrl);
              
              // Use user's email and a generated user ID
              const userId = user.id || user.email;
              
              const response = await axios.post(
                `${backendUrl}/api/v1/auth/verify-email`,
                {
                  email: user.email,
                  user_id: userId,
                },
                {
                  timeout: 20000,
                  headers: {
                    "Content-Type": "application/json",
                  },
                }
              );
              
              // Store backend JWT in token
              if (response.data?.token) {
                token.backendToken = response.data.token;
                token.userId = response.data.user?.id || userId;
                token.isAdmin = response.data.user?.is_admin || false;
                token.email = user.email || undefined;
                console.log("[NextAuth] ✅ Backend token obtained via fallback method");
                console.log("[NextAuth] Token length:", response.data.token.length);
              } else {
                throw new Error("Backend response missing token");
              }
            } catch (error: any) {
              console.error("[NextAuth] ❌ Error with fallback verification");
              console.error("[NextAuth] Error message:", error.message);
              console.error("[NextAuth] Error response:", error.response?.data);
              console.error("[NextAuth] Error status:", error.response?.status);
              
              // If backend rejects due to email domain, throw error to prevent sign in
              if (error.response?.status === 403 && error.response?.data?.detail?.includes("Email domain not allowed")) {
                throw new Error("Email domain not allowed");
              }
              
              token.backendToken = token.backendToken ?? null;
              token.userId = user.id || user.email || undefined;
              token.isAdmin = false;
              token.email = user.email || undefined;
              token.backendError = error.response?.data?.detail || error.message || "Backend unavailable";
            }
          } else {
            // No email either - cannot verify
            console.error("[NextAuth] ❌ Cannot verify with backend: No ID token and no email available");
            token.backendToken = null;
            token.userId = undefined;
            token.isAdmin = false;
            token.email = undefined;
            token.backendError = "No ID token or email available from Google OAuth";
          }
        }
      }
      
      // For subsequent requests (no account/user), preserve existing backendToken
      // This ensures the token persists across requests without re-running backend verification
      if (!account && !user) {
        // This is a subsequent request - just preserve the existing token
        // Don't modify anything, just return the token as-is
        if (process.env.NODE_ENV === "development" && token.backendToken) {
          console.log("[NextAuth] ✅ Preserving existing backend token on subsequent request");
        }
        return token;
      }
      
      // If we reach here, we had account/user but backend token creation failed
      // The token.backendToken should already be set (either to a string or null)
      // Return the token as-is - don't try to refresh here as we need the Google ID token
      return token;
    },
    async session({ session, token }) {
      // Add backend token and user info to session
      if (token) {
        // Handle backendToken: convert null to undefined, preserve string values
        // This ensures the API client can properly check for token existence
        const backendToken = token.backendToken;
        session.backendToken = (backendToken && typeof backendToken === "string") ? backendToken : undefined;
        session.user.id = token.userId ?? undefined;
        session.user.isAdmin = token.isAdmin ?? false;
        
        // Ensure email is set
        if (!session.user.email && token.email) {
          session.user.email = token.email;
        }
        
        // Log session data for debugging (only in development)
        if (process.env.NODE_ENV === "development") {
          console.log("[NextAuth] Session callback:", {
            hasBackendToken: !!session.backendToken,
            backendTokenLength: session.backendToken?.length || 0,
            backendTokenType: typeof session.backendToken,
            userId: session.user.id,
            email: session.user.email,
          });
        }
      }
      
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

