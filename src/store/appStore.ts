/**
 * Zustand global state store.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  KnowledgeScope,
  Conversation,
  ChatMessage,
  User,
} from "@/types";

interface AppState {
  // Knowledge scope
  knowledgeScope: KnowledgeScope;
  setKnowledgeScope: (scope: KnowledgeScope) => void;

  // Current conversation
  currentConversationId: string | null;
  setCurrentConversation: (id: string | null) => void;

  // Conversations list
  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;

  // Current conversation messages
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;

  // User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Reset conversation
  resetConversation: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Knowledge scope
      knowledgeScope: "ALL",
      setKnowledgeScope: (scope) => set({ knowledgeScope: scope }),

      // Current conversation
      currentConversationId: null,
      setCurrentConversation: (id) => set({ currentConversationId: id }),

      // Conversations list
      conversations: [],
      setConversations: (conversations) => set({ conversations }),
      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations],
        })),

      // Messages
      messages: [],
      setMessages: (messages) => set({ messages }),
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      clearMessages: () => set({ messages: [] }),

      // User
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      // Reset conversation
      resetConversation: () =>
        set({
          currentConversationId: null,
          messages: [],
        }),
    }),
    {
      name: "janki-storage",
      // Only persist knowledge scope
      partialize: (state) => ({
        knowledgeScope: state.knowledgeScope,
      }),
    }
  )
);

