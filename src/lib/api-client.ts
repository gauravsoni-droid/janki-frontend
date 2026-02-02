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
        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/fa958d08-04cf-412f-8e65-265079308f96",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: "debug-session",
              runId: "post-fix",
              hypothesisId: "H1",
              location: "api-client.ts:request_interceptor:formdata_fix",
              message: "Removed Content-Type header for FormData",
              data: {
                isFormData: true,
                contentTypeRemoved: true,
              },
              timestamp: Date.now(),
            }),
          },
        ).catch(() => {});
        // #endregion
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
  async getDocuments(scope: KnowledgeScope): Promise<DocumentListResponse> {
    const response = await this.client.get<DocumentListResponse>(
      `/api/v1/documents`,
      {
        params: { scope },
      },
    );
    return response.data;
  }

  async uploadDocument(file: File, isCompanyDoc: boolean): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("is_company_doc", String(isCompanyDoc));

    // #region agent log
    // Debug log: document upload request details (hypotheses H1-H4)
    fetch("http://127.0.0.1:7242/ingest/fa958d08-04cf-412f-8e65-265079308f96", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H1-H4",
        location: "api-client.ts:uploadDocument:before_request",
        message: "UploadDocument request preparation",
        data: {
          baseURL: this.client.defaults.baseURL,
          path: "/api/v1/documents",
          isCompanyDoc,
          isCompanyDocType: typeof isCompanyDoc,
          isCompanyDocString: String(isCompanyDoc),
          fileName: file?.name,
          fileSize: file?.size,
          fileType: file?.type,
          formDataHasFile: formData.has("file"),
          formDataHasIsCompanyDoc: formData.has("is_company_doc"),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    // NOTE:
    // Do NOT set the Content-Type header manually for multipart/form-data.
    // Let the browser/XHR set the correct boundary; otherwise FastAPI cannot
    // parse the upload and the menu appears "not working".

    // #region agent log
    // Debug log: about to send request (hypotheses H1-H4)
    fetch("http://127.0.0.1:7242/ingest/fa958d08-04cf-412f-8e65-265079308f96", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H1-H4",
        location: "api-client.ts:uploadDocument:about_to_send",
        message: "About to send POST request",
        data: {
          url: `${this.client.defaults.baseURL}/api/v1/documents`,
          hasAuthHeader: !!this.client.defaults.headers.common["Authorization"],
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    try {
      const response = await this.client.post<Document>(
        `/api/v1/documents`,
        formData,
      );

      // #region agent log
      // Debug log: successful response (hypotheses H1-H4)
      fetch(
        "http://127.0.0.1:7242/ingest/fa958d08-04cf-412f-8e65-265079308f96",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "debug-session",
            runId: "pre-fix",
            hypothesisId: "H1-H4",
            location: "api-client.ts:uploadDocument:success",
            message: "Upload successful",
            data: {
              status: response.status,
              hasData: !!response.data,
            },
            timestamp: Date.now(),
          }),
        },
      ).catch(() => {});
      // #endregion

      return response.data;
    } catch (error: any) {
      // #region agent log
      // Debug log: error response (hypotheses H1-H4)
      fetch(
        "http://127.0.0.1:7242/ingest/fa958d08-04cf-412f-8e65-265079308f96",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "debug-session",
            runId: "pre-fix",
            hypothesisId: "H1-H4",
            location: "api-client.ts:uploadDocument:error",
            message: "Upload error caught",
            data: {
              errorMessage: error?.message,
              errorStatus: error?.response?.status,
              errorStatusText: error?.response?.statusText,
              errorData: error?.response?.data,
              hasResponse: !!error?.response,
            },
            timestamp: Date.now(),
          }),
        },
      ).catch(() => {});
      // #endregion

      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.client.delete(`/api/v1/documents/${documentId}`);
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
}

// Export singleton instance
export const apiClient = new ApiClient();
