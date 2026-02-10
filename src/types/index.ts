/**
 * TypeScript type definitions matching backend schemas.
 */

export type KnowledgeScope = "MY" | "COMPANY" | "ALL";
export type MessageRole = "USER" | "ASSISTANT";

export interface User {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  bucket_path: string;
  user_id: string;
  is_company_doc: boolean;
  uploaded_at: string;
  category?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  knowledge_scope: KnowledgeScope;
  created_at: string;
  updated_at: string;
  message_preview?: string;
  is_pinned?: boolean;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  sources?: DocumentSource[];
  created_at: string;
}

export interface DocumentSource {
  document_id: string;
  title: string;
  author?: string;
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  response: string;
  sources: DocumentSource[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
}

export interface ApiError {
  error_code: string;
  message: string;
  details?: Record<string, any>;
}

