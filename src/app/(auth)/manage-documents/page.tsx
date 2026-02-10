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
  const [category, setCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createCustomCategory, setCreateCustomCategory] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 100;
  const [documentStatuses, setDocumentStatuses] = useState<Record<string, 'uploading' | 'uploaded' | 'deleting' | 'deleted'>>({});

  useEffect(() => {
    if (status === "authenticated") {
      fetchDocuments();
    }
  }, [status]);

  // Poll document status until it's available in both bucket and database
  const pollDocumentStatus = async (documentId: string, maxAttempts = 30, intervalMs = 1000) => {
    setDocumentStatuses(prev => ({ ...prev, [documentId]: 'uploading' }));
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await apiClient.checkDocumentStatus(documentId);
        
        if (status.available && status.exists_in_storage && status.exists_in_db) {
          setDocumentStatuses(prev => ({ ...prev, [documentId]: 'uploaded' }));
          return;
        }
        
        // Still uploading if not available in both
        setDocumentStatuses(prev => ({ ...prev, [documentId]: 'uploading' }));
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (err) {
        console.error(`Error checking status for document ${documentId}:`, err);
        // Continue polling on error, keep as uploading
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    // If max attempts reached, check one more time and set final status
    try {
      const status = await apiClient.checkDocumentStatus(documentId);
      if (status.available && status.exists_in_storage && status.exists_in_db) {
        setDocumentStatuses(prev => ({ ...prev, [documentId]: 'uploaded' }));
      } else {
        setDocumentStatuses(prev => ({ ...prev, [documentId]: 'uploading' }));
      }
    } catch (err) {
      // On error, assume still uploading
      setDocumentStatuses(prev => ({ ...prev, [documentId]: 'uploading' }));
    }
  };

  // Poll to verify document is deleted from both bucket and database
  const pollDeleteStatus = async (documentId: string, maxAttempts = 30, intervalMs = 1000): Promise<boolean> => {
    setDocumentStatuses(prev => ({ ...prev, [documentId]: 'deleting' }));
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await apiClient.checkDocumentStatus(documentId);
        
        // Document is deleted when it doesn't exist in database (DB deletion is final step)
        // Once DB is deleted, we can't verify storage (no bucket_path), so DB deletion = fully deleted
        if (!status.exists_in_db) {
          setDocumentStatuses(prev => ({ ...prev, [documentId]: 'deleted' }));
          // Remove from status tracking after a short delay to show "deleted" status
          setTimeout(() => {
            setDocumentStatuses(prev => {
              const newStatuses = { ...prev };
              delete newStatuses[documentId];
              return newStatuses;
            });
          }, 2000);
          return true; // Successfully deleted
        }
        
        // Still deleting if exists in database (even if storage is already deleted)
        setDocumentStatuses(prev => ({ ...prev, [documentId]: 'deleting' }));
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (err: any) {
        // If we get a 404 or document not found, it's deleted
        if (err?.response?.status === 404 || err?.message?.includes('not found')) {
          setDocumentStatuses(prev => ({ ...prev, [documentId]: 'deleted' }));
          setTimeout(() => {
            setDocumentStatuses(prev => {
              const newStatuses = { ...prev };
              delete newStatuses[documentId];
              return newStatuses;
            });
          }, 2000);
          return true;
        }
        console.error(`Error checking delete status for document ${documentId}:`, err);
        // Continue polling on error, keep as deleting
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    // If max attempts reached, check one more time
    try {
      const status = await apiClient.checkDocumentStatus(documentId);
      if (!status.exists_in_db) {
        setDocumentStatuses(prev => ({ ...prev, [documentId]: 'deleted' }));
        setTimeout(() => {
          setDocumentStatuses(prev => {
            const newStatuses = { ...prev };
            delete newStatuses[documentId];
            return newStatuses;
          });
        }, 2000);
        return true;
      } else {
        setDocumentStatuses(prev => ({ ...prev, [documentId]: 'deleting' }));
      }
    } catch (err: any) {
      // On 404, assume deleted
      if (err?.response?.status === 404 || err?.message?.includes('not found')) {
        setDocumentStatuses(prev => ({ ...prev, [documentId]: 'deleted' }));
        setTimeout(() => {
          setDocumentStatuses(prev => {
            const newStatuses = { ...prev };
            delete newStatuses[documentId];
            return newStatuses;
          });
        }, 2000);
        return true;
      }
      // Otherwise keep as deleting
      setDocumentStatuses(prev => ({ ...prev, [documentId]: 'deleting' }));
    }
    return false; // Timeout
  };

  const fetchDocuments = async (append = false) => {
    try {
      setLoading(true);
      const currentOffset = append ? offset : 0;
      const response = await apiClient.getDocuments("MY", limit, currentOffset);
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
      const currentCount = append ? documents.length + fetchedDocs.length : fetchedDocs.length;
      setHasMore(currentCount < (response.total || 0));
      
      // For the UI, treat all fetched documents as "uploaded" immediately so
      // the status column turns green right away. We still rely on backend
      // validation for actual storage/DB consistency, but we don't block the
      // user on that background sync.
      for (const doc of fetchedDocs) {
        setDocumentStatuses((prev) => ({ ...prev, [doc.id]: "uploaded" }));
      }
    } catch (err: any) {
      console.error("Error fetching documents:", err);
      if (!append) {
        setDocuments([]);
        setOffset(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const title = createTitle.trim();
    const baseCategory = createCategory.trim();
    const custom = createCustomCategory.trim();
    const content = createContent.trim();

    if (!title) {
      setError("Title is required.");
      return;
    }

    if (!baseCategory) {
      setError("Please select a category for the new document.");
      return;
    }

    let finalCategory = baseCategory;
    if (baseCategory.toLowerCase() === "other") {
      finalCategory = custom || "";
    }

    if (!finalCategory) {
      setError("Please enter a custom category for the new document.");
      return;
    }

    if (!content) {
      setError("Content is required.");
      return;
    }

    // Enforce same 10 MB content limit on the client
    const maxSizeMB = 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const contentBytes = new Blob([content]).size;
    if (contentBytes > maxSizeBytes) {
      setError(`Content size exceeds maximum allowed size of ${maxSizeMB} MB.`);
      return;
    }

    try {
      setCreating(true);
      const createdDoc = await apiClient.createDocument({
        title,
        category: baseCategory,
        custom_category: custom || undefined,
        content,
        is_company_doc: false,
      });

      setCreateTitle("");
      setCreateCategory("");
      setCreateCustomCategory("");
      setCreateContent("");
      setShowCreateForm(false);

      await fetchDocuments();
      
      // Start polling for the newly created document
      if (createdDoc?.id) {
        pollDocumentStatus(createdDoc.id);
      }
    } catch (err: any) {
      console.error("Error creating document:", err);
      const errorMessage =
        err?.response?.data?.detail || err?.message || "Failed to create document.";
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    setError(null);

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate category selection
    const normalizedCategory = category.trim();
    const normalizedCustomCategory = customCategory.trim();

    let finalCategory = normalizedCategory;
    if (normalizedCategory.toLowerCase() === "other") {
      finalCategory = normalizedCustomCategory || "";
    }

    if (!finalCategory) {
      setError("Please select a category (or enter a custom category).");
      e.target.value = "";
      return;
    }

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
      const uploadedDoc = await apiClient.uploadDocument(
        file,
        false,
        normalizedCategory,
        normalizedCustomCategory || undefined
      );
      e.target.value = "";
      // Refresh document list
      await fetchDocuments();
      
      // Start polling for the newly uploaded document
      if (uploadedDoc?.id) {
        pollDocumentStatus(uploadedDoc.id);
      }
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
      <div className="border-b bg-white px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Manage Documents
          </h1>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-56"
            >
              <option value="">Select category</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Architecture">Architecture</option>
              <option value="DevOps">DevOps</option>
              <option value="Testing">Testing</option>
              <option value="Product">Product</option>
              <option value="Design">Design</option>
              <option value="Data">Data</option>
              <option value="Process">Process</option>
              <option value="Other">Other</option>
            </select>
            {category === "Other" && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm md:w-56"
              />
            )}
            <div className="flex flex-row gap-2 w-full md:w-auto justify-end">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <span>📤</span>
                <span>Upload&nbsp;Document</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border-blue-600 hover:bg-blue-50"
                onClick={() => setShowCreateForm((prev) => !prev)}
              >
                <span>✏️</span>
                <span>Create&nbsp;Document</span>
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
          </div>
        </div>
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

        {showCreateForm && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 md:p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Create Text Document</h2>
            <form onSubmit={handleCreateDocument} className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter a descriptive title"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Backend">Backend</option>
                    <option value="Architecture">Architecture</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Testing">Testing</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Data">Data</option>
                    <option value="Process">Process</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {createCategory === "Other" && (
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Custom Category</label>
                    <input
                      type="text"
                      value={createCustomCategory}
                      onChange={(e) => setCreateCustomCategory(e.target.value)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter custom category"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Content
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    (Markdown or plain text, max 10 MB)
                  </span>
                </label>
                <textarea
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  rows={8}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[160px]"
                  placeholder="Write your document content here..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                  }}
                  className="text-sm"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="text-sm">
                  {creating ? "Saving..." : "Save Document"}
                </Button>
              </div>
            </form>
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
                            <span className="text-xs text-gray-600">Uploaded</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {doc.uploaded_at
                            ? new Date(doc.uploaded_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  setError(null);
                                  const response = await apiClient.getDocumentViewUrl(doc.id);
                                  // Open the signed URL in a new tab
                                  window.open(response.url, "_blank");
                                } catch (err: any) {
                                  console.error("Error getting view URL:", err);
                                  setError(err?.message || "Failed to open document. Please try again.");
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  setDeletingId(doc.id);
                                  setError(null);
                                  
                                  // Start deletion
                                  await apiClient.deleteDocument(doc.id);
                                  
                                  // Poll to verify deletion from both bucket and database
                                  const deleted = await pollDeleteStatus(doc.id);
                                  
                                  if (deleted) {
                                    // Refresh list to remove deleted document
                                    await fetchDocuments();
                                  } else {
                                    // Still refresh even if polling timed out
                                    await fetchDocuments();
                                  }
                                } catch (err: any) {
                                  setError(err?.message || "Failed to delete document.");
                                  // Remove deleting status on error
                                  setDocumentStatuses(prev => {
                                    const newStatuses = { ...prev };
                                    delete newStatuses[doc.id];
                                    return newStatuses;
                                  });
                                } finally {
                                  setDeletingId(null);
                                }
                              }}
                              disabled={deletingId === doc.id || documentStatuses[doc.id] === 'deleting'}
                              className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingId === doc.id || documentStatuses[doc.id] === 'deleting' ? "Deleting..." : "Delete"}
                            </button>
                          </div>
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
          </div>
        )}
      </div>
    </div>
  );
}


