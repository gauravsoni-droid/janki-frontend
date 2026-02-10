/**
 * View Documents page - Read-only document viewing.
 */
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { apiClient } from "@/lib/api-client";
import type { Document } from "@/types";

export default function ViewDocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { knowledgeScope, setKnowledgeScope } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 100;
  const [documentStatuses, setDocumentStatuses] = useState<
    Record<string, "uploading" | "uploaded">
  >({});

  // Shared loader for documents so it can be used both on initial load and
  // from the "Load More" button.
  const fetchDocuments = async (append = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentOffset = append ? offset : 0;
      const response = await apiClient.getDocuments(
        knowledgeScope,
        limit,
        currentOffset,
      );
      const fetchedDocs = response.documents || [];

      if (append) {
        setDocuments((prev) => [...prev, ...fetchedDocs]);
        setOffset((prev) => prev + fetchedDocs.length);
      } else {
        setDocuments(fetchedDocs);
        setOffset(fetchedDocs.length);
      }

      setTotal(response.total || 0);

      // Check if there are more documents to load
      const currentCount = append
        ? documents.length + fetchedDocs.length
        : fetchedDocs.length;
      setHasMore(currentCount < (response.total || 0));

      // For the view-documents page we don't need fine‑grained upload state.
      // Treat all fetched documents as "uploaded" so the status column is
      // always green and we avoid extra status API calls (which can 404 for
      // bucket‑only documents).
      for (const doc of fetchedDocs) {
        setDocumentStatuses((prev) => ({
          ...prev,
          [doc.id]: "uploaded",
        }));
      }
    } catch (err: any) {
      console.error("Error fetching documents:", err);
      setError(err?.message || "Failed to load documents.");

      if (!append) {
        setDocuments([]);
        setOffset(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchDocuments();
    }
  }, [knowledgeScope, status, router]);

  // Reset offset when scope changes
  useEffect(() => {
    setOffset(0);
  }, [knowledgeScope]);

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b bg-white px-4 py-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">View Documents</h1>
          {/* Knowledge Scope Selector */}
          <select
            value={knowledgeScope}
            onChange={(e) => {
              setKnowledgeScope(e.target.value as any);
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
          >
            <option value="MY">My Knowledge Only</option>
            <option value="COMPANY">Company Knowledge Only</option>
            <option value="ALL">All (My + Company Knowledge)</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-500">Loading documents...</p>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-gray-100 p-6 mb-4">
              <span className="text-4xl">📄</span>
            </div>
            <p className="text-lg font-medium text-gray-900">No documents found</p>
            <p className="mt-2 text-sm text-gray-500">
              Go to Manage Documents to upload files
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Filename
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Created Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {documents.map((doc) => {
                  const status = documentStatuses[doc.id] || 'uploaded'; // Default to uploaded if not tracked
                  
                  return (
                    <tr key={doc.id}>
                      <td className="px-4 py-3 text-gray-900 break-all">
                        {doc.filename}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {doc.category || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {status === 'uploading' ? (
                          <span className="text-xs text-gray-600">Uploading</span>
                        ) : status === 'uploaded' ? (
                          <span className="text-xs text-green-600">Uploaded</span>
                        ) : status === 'deleting' ? (
                          <span className="text-xs text-red-600">Deleting</span>
                        ) : status === 'deleted' ? (
                          <span className="text-xs text-gray-500">Deleted</span>
                        ) : (
                          <span className="text-xs text-green-600">Uploaded</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {doc.uploaded_at
                          ? new Date(doc.uploaded_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              setError(null);
                              const response = await apiClient.getDocumentViewUrl(
                                doc.id
                              );
                              // Open the signed URL in a new tab
                              window.open(response.url, "_blank");
                            } catch (err: any) {
                              console.error("Error getting view URL:", err);
                              setError(
                                err?.message ||
                                  "Failed to open document. Please try again."
                              );
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => fetchDocuments(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
            {total > 0 && (
              <div className="mt-2 text-center text-xs text-gray-500">
                Showing {documents.length} of {total} documents
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

