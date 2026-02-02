/**
 * Dashboard page with modern chat interface (ChatGPT/Slack style).
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/types";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { knowledgeScope, messages, addMessage, clearMessages, setKnowledgeScope } = useAppStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showScopeMenu, setShowScopeMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scopeMenuRef = useRef<HTMLDivElement>(null);

  // Check session and redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Clear messages when navigating to dashboard (new chat)
  useEffect(() => {
    // Only clear if we're coming from a navigation (not just a refresh)
    const shouldClear = sessionStorage.getItem("clearChatOnLoad");
    if (shouldClear === "true") {
      clearMessages();
      sessionStorage.removeItem("clearChatOnLoad");
    }
  }, [clearMessages]);

  // Close scope menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (scopeMenuRef.current && !scopeMenuRef.current.contains(event.target as Node)) {
        setShowScopeMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setLoading(true);
    setError(null);

    // Add user message
    addMessage({
      id: Date.now().toString(),
      conversation_id: conversationId || "new",
      role: "USER",
      content: userMessage,
      created_at: new Date().toISOString(),
    });

    try {
      const response = await apiClient.sendChatMessage(
        userMessage,
        conversationId,
        knowledgeScope
      );

      // Add assistant message
      // Convert DocumentSource[] to string[] (extract filenames)
      const sourceFilenames = (response.sources || []).map((source) => source.filename);
      addMessage({
        id: response.message_id,
        conversation_id: response.conversation_id,
        role: "ASSISTANT",
        content: response.response,
        sources: sourceFilenames,
        created_at: new Date().toISOString(),
      });

      setConversationId(response.conversation_id);
    } catch (error: any) {
      console.error("Error sending message:", error);
      let errorMessage = error?.message || "Failed to send message. Please check if the backend is running and try again.";
      
      // Check if it's an authentication error
      if (errorMessage.includes("authentication") || errorMessage.includes("token") || errorMessage.includes("401") || errorMessage.includes("expired") || errorMessage.includes("invalid")) {
        errorMessage = "⚠️ Your session needs to be refreshed. Click 'Refresh Session' below or log out and log back in to connect to the backend.";
      }
      
      if (errorMessage.includes("\n")) {
        errorMessage = errorMessage.split("\n").join(" ");
      }
      
      setError(errorMessage);
      
      addMessage({
        id: `error-${Date.now()}`,
        conversation_id: conversationId || "error",
        role: "ASSISTANT",
        content: `❌ ${errorMessage}`,
        created_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const getScopeLabel = () => {
    switch (knowledgeScope) {
      case "MY":
        return "My Knowledge Only";
      case "COMPANY":
        return "Company Knowledge Only";
      case "ALL":
        return "All (My + Company Knowledge)";
      default:
        return "All Knowledge";
    }
  };

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return null;
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Chat</h1>
          
          {/* Knowledge Scope Dropdown */}
          <div className="relative" ref={scopeMenuRef}>
            <Button
              onClick={() => setShowScopeMenu(!showScopeMenu)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <span>🔍</span>
              <span>{getScopeLabel()}</span>
              <span className="text-gray-400">▼</span>
            </Button>
            
            {showScopeMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setKnowledgeScope("MY");
                      setShowScopeMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      knowledgeScope === "MY" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                    }`}
                  >
                    My Knowledge Only
                  </button>
                  <button
                    onClick={() => {
                      setKnowledgeScope("COMPANY");
                      setShowScopeMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      knowledgeScope === "COMPANY" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                    }`}
                  >
                    Company Knowledge Only
                  </button>
                  <button
                    onClick={() => {
                      setKnowledgeScope("ALL");
                      setShowScopeMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      knowledgeScope === "ALL" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                    }`}
                  >
                    All (My + Company Knowledge)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-red-800 whitespace-pre-line flex-1">{error}</p>
              {(error.includes("session needs to be refreshed") || error.includes("log out and log back in") || error.includes("Refresh Session")) ? (
                <Button
                  onClick={async () => {
                    await signOut({ callbackUrl: "/login" });
                  }}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  Refresh Session
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-6 md:px-6 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-md">
              <div className="mb-4 inline-block rounded-full bg-blue-100 p-4">
                <span className="text-4xl">💬</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Janki!</h2>
              <p className="text-gray-600 mb-4">
                Start a conversation by asking a question about your documents.
              </p>
              <p className="text-sm text-gray-500">
                Select your knowledge scope from the dropdown above to filter results.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${
                  msg.role === "USER" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "ASSISTANT" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-medium">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "USER"
                      ? "bg-blue-600 text-white"
                      : msg.content.startsWith("❌")
                      ? "bg-red-50 border border-red-200 text-red-800"
                      : "bg-white shadow-sm border border-gray-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                </div>
                {msg.role === "USER" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-300 text-gray-700 text-xs font-medium">
                    {session?.user?.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-medium">
                  AI
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white px-4 py-4 md:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !loading && input.trim()) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Ask a question about your documents..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              disabled={loading}
            />
            <Button 
              onClick={(e) => handleSend(e)} 
              disabled={loading || !input.trim()}
              className="px-6"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Sending...
                </span>
              ) : (
                "Send"
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

