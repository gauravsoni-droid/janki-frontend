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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      let cancelled = false;
      const fetchDocuments = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await apiClient.getDocuments(knowledgeScope);
          if (!cancelled) {
            setDocuments(response.documents || []);
          }
        } catch (err: any) {
          console.error("Error fetching documents:", err);
          if (!cancelled) {
            setError(err?.message || "Failed to load documents.");
            setDocuments([]);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      fetchDocuments();
      return () => {
        cancelled = true;
      };
    }
  }, [knowledgeScope, status, router]);

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
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Scope
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Uploaded At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3 text-gray-900 break-all">
                      {doc.filename}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {doc.file_type || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {doc.is_company_doc ? "Company" : "My"}
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
                          
                          const confirmed = window.confirm(`Are you sure you want to delete "${doc.filename}"?`);
                          if (!confirmed) {
                            return;
                          }
                          
                          try {
                            setDeletingId(doc.id);
                            setError(null);
                            await apiClient.deleteDocument(doc.id);
                            setDocuments(documents.filter((d) => d.id !== doc.id));
                          } catch (err: any) {
                            setError(err?.message || "Failed to delete document.");
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === doc.id}
                        className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === doc.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

