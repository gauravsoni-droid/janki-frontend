/**
 * API client for backend communication with FastAPI.
 */
import axios, { AxiosInstance, AxiosError } from "axios";
import { getSession } from "next-auth/react";
import type {
  ChatResponse,
  KnowledgeScope,
  ApiError,
  Document,
  DocumentListResponse,
  ConversationListResponse,
  Conversation,
  ChatMessage,
} from "@/types";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      // Use the same default port as the FastAPI backend (8000), unless
      // overridden via NEXT_PUBLIC_API_URL. This must match where uvicorn is
      // actually running (see backend logs that show http://localhost:8000).
      baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
      headers: {
        "Content-Type": "application/json",
      },
      // Prevent UI from hanging indefinitely if backend is down or network is stuck
      timeout: 15000,
    });

    // Request interceptor: add auth token
    this.client.interceptors.request.use(async (config) => {
      try {
        const session = await getSession();
        // Handle both null and undefined - only add token if it's a truthy string
        const backendToken = session?.backendToken;
        if (
          backendToken &&
          typeof backendToken === "string" &&
          backendToken.trim().length > 0
        ) {
          config.headers.Authorization = `Bearer ${backendToken}`;
          if (process.env.NODE_ENV === "development") {
            console.log(
              "[API Client] ✅ Authorization header added with backend token",
            );
          }
        } else {
          // If no backend token, log detailed information for debugging
          console.error("[API Client] ❌ No backend token in session!");
          console.error("[API Client] Session data:", {
            hasSession: !!session,
            hasBackendToken: !!backendToken,
            backendTokenType: typeof backendToken,
            backendTokenValue:
              backendToken === null
                ? "null"
                : backendToken === undefined
                  ? "undefined"
                  : backendToken
                    ? "***"
                    : String(backendToken),
            email: session?.user?.email,
            userId: session?.user?.id,
          });

          // Still try the request - backend will return 401 and response interceptor will handle it
          // This allows the user to see a proper error message
        }
      } catch (error) {
        console.error(
          "[API Client] Error getting session in request interceptor:",
          error,
        );
        // Don't throw - let the request proceed and backend will return 401
      }

      // CRITICAL FIX: Remove Content-Type header for FormData so browser sets multipart/form-data with boundary
      // Axios default "application/json" header was causing FormData to be serialized as JSON
      if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
      }

      // Ensure GET/HEAD requests never have a body
      const method = config.method?.toUpperCase();
      if ((method === "GET" || method === "HEAD") && config.data) {
        delete config.data;
      }

      return config;
    });

    // Response interceptor: handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: any) => {
        if (
          error.code === "ECONNREFUSED" ||
          error.message === "Network Error"
        ) {
          throw new Error(
            "Cannot connect to backend server. Please make sure the backend is running on http://localhost:8000",
          );
        }

        // Handle FastAPI validation errors (422)
        if (error.response?.status === 422) {
          const detail = error.response.data;
          let errorMessage = "Validation error: ";

          if (detail?.detail) {
            // FastAPI validation error format
            if (Array.isArray(detail.detail)) {
              const errors = detail.detail.map((err: any) => {
                const field = err.loc?.join(".") || "field";
                return `${field}: ${err.msg}`;
              });
              errorMessage = errors.join("; ");
            } else if (typeof detail.detail === "string") {
              errorMessage = detail.detail;
            } else {
              errorMessage = JSON.stringify(detail.detail);
            }
          } else if (detail?.message) {
            errorMessage = detail.message;
          } else {
            errorMessage =
              "Invalid request format. Please check your file and try again.";
          }

          throw new Error(errorMessage);
        }

        if (error.response?.status === 401) {
          throw new Error(
            "⚠️ Your authentication token has expired or is invalid. Please try logging out and back in to refresh your session.",
          );
        } else if (error.response?.status === 403) {
          throw new Error(
            error.response.data?.message ||
              error.response.data?.detail ||
              "Permission denied",
          );
        } else if (error.response && error.response.status >= 500) {
          throw new Error(
            error.response.data?.message ||
              error.response.data?.detail ||
              "Server error. Please check backend logs and try again.",
          );
        } else if (error.response?.status === 404) {
          throw new Error(
            error.response.data?.message ||
              error.response.data?.detail ||
              "Resource not found. Please check your request.",
          );
        } else if (error.response?.status === 400) {
          throw new Error(
            error.response.data?.detail ||
              error.response.data?.message ||
              "Bad request. Please check your input.",
          );
        } else {
          throw new Error(
            error.response?.data?.detail ||
              error.response?.data?.message ||
              error.message ||
              "An error occurred. Please try again.",
          );
        }
      },
    );
  }

  // Documents
  async getDocuments(
    scope: KnowledgeScope,
    limit?: number,
    offset?: number,
  ): Promise<DocumentListResponse> {
    const params: any = { scope };
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;
    const response = await this.client.get<DocumentListResponse>(
      `/api/v1/documents`,
      { params },
    );
    return response.data;
  }

  async uploadDocument(
    file: File,
    isCompanyDoc: boolean,
    category: string,
    customCategory?: string,
  ): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("is_company_doc", String(isCompanyDoc));
    formData.append("category", category);
    if (customCategory) {
      formData.append("custom_category", customCategory);
    }

    // NOTE:
    // Do NOT set the Content-Type header manually for multipart/form-data.
    // Let the browser/XHR set the correct boundary; otherwise FastAPI cannot
    // parse the upload and the menu appears "not working".

    try {
      const response = await this.client.post<Document>(
        `/api/v1/documents`,
        formData,
      );

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async createDocument(params: {
    title: string;
    category: string;
    custom_category?: string;
    content: string;
    is_company_doc?: boolean;
  }): Promise<Document> {
    const payload = {
      title: params.title,
      category: params.category,
      custom_category: params.custom_category,
      content: params.content,
      is_company_doc: params.is_company_doc ?? false,
    };

    const response = await this.client.post<Document>(
      `/api/v1/documents/create`,
      payload,
    );

    return response.data;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.client.delete(`/api/v1/documents/${documentId}`);
  }

  async getDocumentViewUrl(documentId: string): Promise<{ url: string; expires_in: number }> {
    const response = await this.client.get<{ url: string; expires_in: number }>(
      `/api/v1/documents/${documentId}/view-url`,
    );
    return response.data;
  }

  async checkDocumentStatus(documentId: string): Promise<{ available: boolean; exists_in_storage: boolean; exists_in_db: boolean }> {
    const response = await this.client.get<{ available: boolean; exists_in_storage: boolean; exists_in_db: boolean }>(
      `/api/v1/documents/${documentId}/status`,
    );
    return response.data;
  }

  // Chat
  async sendChatMessage(
    message: string,
    conversationId: string | null,
    scope: KnowledgeScope,
  ): Promise<ChatResponse> {
    const response = await this.client.post<ChatResponse>(`/api/v1/chat`, {
      message,
      conversation_id: conversationId,
      scope,
    });
    return response.data;
  }

  async getConversations(): Promise<ConversationListResponse> {
    const response = await this.client.get<ConversationListResponse>(
      "/api/v1/chat/sessions",
    );
    return response.data;
  }

  async getConversationMessages(
    sessionId: string,
  ): Promise<ChatMessage[]> {
    const response = await this.client.get<ChatMessage[]>(
      `/api/v1/chat/sessions/${sessionId}/messages`,
    );
    return response.data;
  }

  async updateConversation(
    sessionId: string,
    payload: { title?: string; is_pinned?: boolean },
  ): Promise<Conversation> {
    const response = await this.client.patch<Conversation>(
      `/api/v1/chat/sessions/${sessionId}`,
      payload,
    );
    return response.data;
  }

  async deleteConversation(sessionId: string): Promise<void> {
    await this.client.delete(`/api/v1/chat/sessions/${sessionId}`);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
