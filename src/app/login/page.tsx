/**
 * Login page.
 */
"use client";

import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user is already logged in and check for error parameters
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session) {
          // User is logged in, redirect to dashboard
          router.push("/dashboard");
        }
      } catch (error) {
        // Ignore errors during session check
        console.log("Session check:", error);
      }
    };

    // Check for NextAuth error parameters in URL
    const errorParam = searchParams.get("error");

    if (errorParam === "AccessDenied" || errorParam === "Configuration") {
      // Email domain validation failed
      setError(
        "You cannot login without company email. Please use an email address ending with @cloudusinfotech.com",
      );

      // Clean up URL by removing error parameter (keeps URL clean)
      router.replace("/login");
    }

    checkSession();
  }, [router, searchParams]);

  const handleSignIn = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    try {
      setIsLoading(true);
      setError(null);

      // Trigger Google OAuth - this will redirect to Google's authentication page
      // The prompt: "consent" in the provider config ensures the OAuth screen always shows
      await signIn("google", {
        callbackUrl: "/dashboard",
        redirect: true, // Let NextAuth handle the full OAuth redirect flow
      });

      // Note: With redirect: true, code below won't execute if redirect succeeds
      // This is expected behavior - the user will be redirected to Google OAuth
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err?.message || "Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl">
        <div className="text-center">
          <div className="mb-4 inline-block rounded-full bg-blue-100 p-4">
            <span className="text-5xl">💬</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Janki</h1>
          <p className="mt-2 text-gray-600">Internal Knowledge Base Chatbot</p>
        </div>

        <div className="mt-8">
          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm"
            size="lg"
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></span>
                Signing in...
              </span>
            ) : (
              "Sign in with Google"
            )}
          </Button>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-center text-sm font-medium text-red-800">
                {error}
              </p>
            </div>
          )}

          <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-center text-xs text-blue-800">
              <span className="font-medium">Company email required</span>
              <br />
              <span className="text-blue-600">@cloudusinfotech.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl">
          <div className="text-center">
            <div className="mb-4 inline-block rounded-full bg-blue-100 p-4">
              <span className="text-5xl">💬</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Janki</h1>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
