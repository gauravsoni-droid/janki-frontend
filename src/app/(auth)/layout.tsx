/**
 * Authenticated layout with modern sidebar navigation.
 */
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { useAppStore } from "@/store/appStore";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const { clearMessages } = useAppStore();
  
  const handleNewChat = () => {
    clearMessages();
    // Set flag to clear chat when dashboard loads
    if (typeof window !== "undefined") {
      sessionStorage.setItem("clearChatOnLoad", "true");
    }
    router.push("/dashboard");
  };

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return null;
  }

  const navItems = [
    { href: "/dashboard", label: "New Chat", icon: "➕", onClick: handleNewChat },
    { href: "/dashboard", label: "Chat", icon: "💬" },
    { href: "/manage-documents", label: "Manage Documents", icon: "📝" },
    { href: "/documents", label: "View Documents", icon: "📁" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r bg-white shadow-sm">
        {/* Logo */}
        <div className="border-b p-4">
          <h2 className="text-xl font-bold text-gray-900">Janki</h2>
          <p className="text-xs text-gray-500 mt-1">Knowledge Base Chatbot</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={item.onClick}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t bg-gray-50 p-4">
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Logged in as</p>
            <p className="text-sm text-gray-900 truncate" title={session.user?.email || ""}>
              {session.user?.email || "Unknown"}
            </p>
          </div>
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            variant="outline"
            size="sm"
            className="w-full"
            type="button"
          >
            {isLoggingOut ? "Logging out..." : "🚪 Logout"}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}

