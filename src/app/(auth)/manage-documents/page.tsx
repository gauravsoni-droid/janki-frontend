/**
 * Manage Documents page - Upload documents to Google Cloud Storage via FastAPI.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export default function ManageDocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDocuments();
    }
  }, [status]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDocuments("MY");
      setDocuments(response.documents || []);
    } catch (err: any) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    setError(null);

    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = [".pdf", ".docx", ".txt", ".md"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!allowedTypes.includes(fileExt)) {
      setError(`File type not allowed. Allowed types: ${allowedTypes.join(", ")}`);
      e.target.value = "";
      return;
    }

    // Check file size (10 MB max)
    const maxSizeMB = 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds maximum allowed size of ${maxSizeMB} MB.`);
      e.target.value = "";
      return;
    }

    try {
      setUploading(true);
      // Upload as "my knowledge" document (user-specific) by default.
      await apiClient.uploadDocument(file, false);
      setMessage(`Document "${file.name}" uploaded successfully to Google Cloud Storage and saved to database.`);
      e.target.value = "";
      // Refresh document list
      await fetchDocuments();
    } catch (err: any) {
      console.error("Error uploading document:", err);
      // Extract error message from response if available
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to upload document.";
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return null;
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b bg-white px-4 py-4 md:px-6 flex items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Manage Documents</h1>
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full md:w-auto"
        >
          {uploading ? "Uploading..." : "📤 Upload Document"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            {message}
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
            <p className="text-lg font-medium text-gray-900">
              Click &quot;Upload Document&quot; to add files to your knowledge base.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Uploaded files are stored in Google Cloud Storage using your Google user ID and saved to the database. 
              You can view them in the View Documents page.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Supported formats: PDF, DOCX, TXT, MD (Max size: 10 MB)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Uploaded Documents</h2>
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
                              setMessage(null);
                              await apiClient.deleteDocument(doc.id);
                              await fetchDocuments(); // Refresh list
                              setMessage(`Document "${doc.filename}" deleted successfully.`);
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
          </div>
        )}
      </div>
    </div>
  );
}


