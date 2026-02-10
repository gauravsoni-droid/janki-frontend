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
import { apiClient } from "@/lib/api-client";

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

  const {
    conversations,
    setConversations,
    setCurrentConversation,
    clearMessages,
    currentConversationId,
    resetConversation,
  } = useAppStore();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [chatsCollapsed, setChatsCollapsed] = useState(false);

  // Close the chat action popup (three-dots menu) when clicking anywhere
  // outside of it on the page. Clicks that originate inside any chat menu
  // container (trigger button, menu surface, etc.) are ignored so that menu
  // actions like Rename / Pin / Delete still work reliably.
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      // If the click happened inside any element marked as a chat menu root,
      // don't close the menu. This covers the three-dots trigger and the
      // dropdown surface.
      if (target?.closest("[data-chat-menu-root='true']")) {
        return;
      }
      setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => {
      document.removeEventListener("mousedown", handleGlobalClick);
    };
  }, []);

  // Load chat history for sidebar
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await apiClient.getConversations();
        setConversations(data.conversations || []);
      } catch (err) {
        console.error("Failed to load chat history", err);
      }
    };
    loadConversations();
  }, [setConversations]);
  
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
        <div className="border-b px-3 py-3">
          <h2 className="text-lg font-bold text-gray-900">Janki</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Knowledge Base Chatbot
          </p>
        </div>

        {/* Navigation + Chat History */}
        <nav className="flex-1 overflow-y-auto px-2 pt-2 pb-3 scrollbar-thin">
          {/* Main nav items */}
          <div className="space-y-1 mb-2">
            {navItems.map((item) => {
              // Only the actual page you are on should appear "active".
              // For the chat route (/dashboard), always highlight the "Chat"
              // item instead of "New Chat" so the user sees Chat as the
              // current page.
              const isChatRoute = pathname === "/dashboard";
              const isActive =
                (isChatRoute && item.label === "Chat") ||
                (!isChatRoute && pathname === item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={item.onClick}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Chat history list */}
          <div className="mt-2 border-top pt-2">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-3 text-base font-semibold text-gray-700 hover:text-gray-900"
              onClick={() => setChatsCollapsed((prev) => !prev)}
            >
              <span>Your chats</span>
              <span
                className={`text-xs transition-transform ${
                  chatsCollapsed ? "" : "rotate-180"
                }`}
              >
                ▾
              </span>
            </button>
            {!chatsCollapsed && (
              <>
                {conversations.length === 0 ? (
                  <p className="px-3 pb-2 text-sm text-gray-400">
                    No chat history yet. Start a new chat.
                  </p>
                ) : (
                  <div className="space-y-1 pb-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="group relative rounded-lg px-3 py-2 text-sm text-left hover:bg-gray-100"
                    data-chat-menu-root="true"
                  >
                    <Link
                      href={`/dashboard?sessionId=${encodeURIComponent(
                        conv.id,
                      )}&readOnly=1`}
                      onClick={() => {
                        setCurrentConversation(conv.id);
                        setOpenMenuId(null);
                      }}
                      className="block"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {renamingId === conv.id ? (
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const newTitle = renameValue.trim().slice(0, 80);
                                  if (!newTitle) {
                                    setRenamingId(null);
                                    setRenameValue("");
                                    return;
                                  }
                                  try {
                                    await apiClient.updateConversation(conv.id, {
                                      title: newTitle,
                                    });
                                    const data = await apiClient.getConversations();
                                    setConversations(data.conversations || []);
                                  } catch (err) {
                                    console.error("Failed to rename chat", err);
                                  } finally {
                                    setRenamingId(null);
                                    setRenameValue("");
                                  }
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setRenamingId(null);
                                  setRenameValue("");
                                }
                              }}
                              onBlur={async () => {
                                // Save on blur when clicking elsewhere
                                const newTitle = renameValue.trim().slice(0, 80);
                                if (!newTitle) {
                                  setRenamingId(null);
                                  setRenameValue("");
                                  return;
                                }
                                try {
                                  await apiClient.updateConversation(conv.id, {
                                    title: newTitle,
                                  });
                                  const data = await apiClient.getConversations();
                                  setConversations(data.conversations || []);
                                } catch (err) {
                                  console.error("Failed to rename chat", err);
                                } finally {
                                  setRenamingId(null);
                                  setRenameValue("");
                                }
                              }}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
                              autoFocus
                            />
                          ) : (
                            <>
                              <div className="flex items-center gap-1">
                                <div className="font-medium text-gray-900 truncate">
                                  {conv.title}
                                </div>
                                {conv.is_pinned && (
                                  <span
                                    className="text-[11px] text-gray-400"
                                    aria-label="Pinned chat"
                                  >
                                    📌
                                  </span>
                                )}
                              </div>
                              {conv.message_preview && (
                                <div className="text-[11px] text-gray-500 truncate">
                                  {conv.message_preview}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {/* Three-dots menu trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuId((prev) =>
                              prev === conv.id ? null : conv.id,
                            );
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity ml-1 text-lg leading-none"
                        >
                          ⋯
                        </button>
                      </div>
                    </Link>

                    {openMenuId === conv.id && (
                      <div className="absolute right-2 top-8 z-20 w-40 rounded-md border border-gray-200 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setRenameValue(conv.title);
                            setRenamingId(conv.id);
                            setOpenMenuId(null);
                          }}
                          className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              await apiClient.updateConversation(conv.id, {
                                is_pinned: !conv.is_pinned,
                              });
                              const data = await apiClient.getConversations();
                              setConversations(data.conversations || []);
                            } catch (err) {
                              console.error("Failed to pin/unpin chat", err);
                            } finally {
                              setOpenMenuId(null);
                            }
                          }}
                          className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100"
                        >
                          {conv.is_pinned ? "Unpin chat" : "Pin chat"}
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              await apiClient.deleteConversation(conv.id);
                              const data = await apiClient.getConversations();
                              setConversations(data.conversations || []);
                              // If the deleted conversation is the one currently open,
                              // reset the active chat and return the user to a clean
                              // dashboard so they don't keep sending messages to a
                              // non-existent session (which causes 404 errors).
                              if (currentConversationId === conv.id) {
                                resetConversation();
                                clearMessages();
                                if (typeof window !== "undefined") {
                                  sessionStorage.setItem(
                                    "clearChatOnLoad",
                                    "true",
                                  );
                                }
                                if (pathname === "/dashboard") {
                                  router.push("/dashboard");
                                }
                              }
                            } catch (err) {
                              console.error("Failed to delete chat", err);
                            } finally {
                              setOpenMenuId(null);
                            }
                          }}
                          className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                  </div>
                )}
              </>
            )}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t bg-gray-50 px-3 py-3">
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Logged in as</p>
            <p
              className="text-sm text-gray-900 truncate"
              title={session.user?.email || ""}
            >
              {session.user?.email
                ? session.user.email.split("@")[0]
                : "Unknown"}
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

