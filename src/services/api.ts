import { API_BASE_URL, handleApiResponse } from "@/lib/utils";

// Types
export interface Library {
  id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  created_at: string;
  _count?: {
    pdfs: number;
  };
}

export interface Document {
  id: number;
  filename: string;
  file_path: string;
  file_size: number | null;
  status: string;
  library_id: number;
  title?: string;
  page_count?: number;
  author?: string;
  created_at: string;
  is_web_document: boolean;
}

export interface Conversation {
  id: number;
  title: string | null;
  library_id: number;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  source_reference?: string | null;
}

export interface ChatResponse {
  answer: string;
  sources: Array<{
    document_id: string;
    document_name: string;
    page_number: number;
    text: string;
  }>;
}

// Library API functions
export const LibraryAPI = {
  getAll: async (): Promise<Library[]> => {
    const response = await fetch(`${API_BASE_URL}/libraries`);
    return handleApiResponse<Library[]>(response);
  },

  create: async (library: {
    name: string;
    description?: string;
    tags?: string[];
  }): Promise<Library> => {
    const response = await fetch(`${API_BASE_URL}/libraries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(library),
    });
    return handleApiResponse<Library>(response);
  },

  update: async (
    id: number,
    library: { name?: string; description?: string; tags?: string[] }
  ): Promise<Library> => {
    const response = await fetch(`${API_BASE_URL}/libraries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(library),
    });
    return handleApiResponse<Library>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/libraries/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete library");
    }
  },
};

// Document API functions
export const DocumentAPI = {
  getByLibrary: async (libraryId: number): Promise<Document[]> => {
    const response = await fetch(`${API_BASE_URL}/documents/${libraryId}`);
    return handleApiResponse<Document[]>(response);
  },

  upload: async (
    libraryId: number,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<Document> => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.open("POST", `${API_BASE_URL}/upload/${libraryId}`, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  },

  uploadWebPage: async (
    libraryId: number,
    url: string,
    cssSelectors?: string[]
  ): Promise<Document> => {
    const response = await fetch(`${API_BASE_URL}/upload-web/${libraryId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, css_selectors: cssSelectors }),
    });
    return handleApiResponse<Document>(response);
  },

  delete: async (documentId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete document");
    }
  },
};

// Chat API functions
export const ChatAPI = {
  getConversations: async (
    libraryId: number,
    documentId?: number
  ): Promise<Conversation[]> => {
    let url = `${API_BASE_URL}/conversations/${libraryId}`;
    if (documentId !== undefined) {
      url += `?document_id=${documentId}`;
    }
    const response = await fetch(url);
    return handleApiResponse<Conversation[]>(response);
  },

  getConversationMessages: async (
    conversationId: number
  ): Promise<Message[]> => {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/messages`
    );
    return handleApiResponse<Message[]>(response);
  },

  createConversation: async (
    libraryId: number,
    title?: string,
    documentId?: number
  ): Promise<Conversation> => {
    const body: { title?: string; document_id?: number } = { title };
    if (documentId !== undefined) {
      body.document_id = documentId;
    }
    const response = await fetch(`${API_BASE_URL}/conversations/${libraryId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handleApiResponse<Conversation>(response);
  },

  sendMessage: async (
    conversationId: number,
    content: string
  ): Promise<Message> => {
    const response = await fetch(`${API_BASE_URL}/chat/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    return handleApiResponse<Message>(response);
  },

  simplifiedChat: async (
    query: string,
    libraryId: number,
    conversationId?: number
  ): Promise<ChatResponse> => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        library_id: libraryId,
        conversation_id: conversationId,
      }),
    });
    return handleApiResponse<ChatResponse>(response);
  },

  streamMessage: (conversationId: number, content: string): EventSource => {
    const params = new URLSearchParams({
      content,
    });
    return new EventSource(
      `${API_BASE_URL}/chat/${conversationId}/stream?${params}`
    );
  },

  deleteConversation: async (conversationId: number): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        method: "DELETE",
      }
    );
    if (!response.ok) {
      throw new Error("Failed to delete conversation");
    }
  },

  updateConversation: async (
    conversationId: number,
    title: string
  ): Promise<Conversation> => {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }
    );
    return handleApiResponse<Conversation>(response);
  },
};
