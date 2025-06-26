import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  MessageCircle,
  Upload,
  Trash2,
  Download,
  Book,
  Clock,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import PDFUploader from "./PDFUploader";
import { DocumentAPI, type Document as ApiDocument } from "@/services/api";
import { formatFileSize, truncateText } from "@/lib/utils";
import ChatInterface from "./ChatInterface";
import { ChatAPI, type Conversation as ApiConversation } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { type Library as ApiLibrary } from "@/services/api";

interface LibraryViewProps {
  library: ApiLibrary;
  onBack: () => void;
}

const LibraryView = ({ library, onBack }: LibraryViewProps) => {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [chatSessions, setChatSessions] = useState<ApiConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("documents");
  const [selectedDocument, setSelectedDocument] = useState<ApiDocument | null>(
    null
  );
  const [selectedChatSession, setSelectedChatSession] =
    useState<ApiConversation | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchLibraryData();
  }, [library.id]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await DocumentAPI.getByLibrary(Number(library.id));
      setDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const fetchLibraryData = async () => {
    try {
      // Fetch chat sessions from backend
      const sessions = await ChatAPI.getConversations(Number(library.id));
      setChatSessions(sessions || []);
    } catch (error) {
      console.error("Error fetching library data:", error);
      toast.error("Failed to load library data");
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      await DocumentAPI.delete(documentId);
      toast.success("Document deleted successfully");
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleDownloadPdf = async (doc: ApiDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("pdfs")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const startChatWithPdf = (doc: ApiDocument) => {
    setSelectedDocument(doc);
    setSelectedChatSession(null);
    setActiveTab("chat");
  };

  const startChatWithLibrary = () => {
    setSelectedDocument(null);
    setSelectedChatSession(null);
    setActiveTab("chat");
  };

  const openChatSession = (session: ApiConversation) => {
    setSelectedChatSession(session);
    setSelectedDocument(null);
    setActiveTab("chat");
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "processed":
        return "bg-green-800 text-green-200";
      case "processing":
        return "bg-blue-800 text-blue-200";
      case "error":
        return "bg-red-800 text-red-200";
      default:
        return "bg-gray-800 text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading library...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-white hover:text-gray-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Libraries
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">{library.name}</h1>
          {library.description && (
            <p className="text-gray-400 mt-1">{library.description}</p>
          )}
          {library.tags && library.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {library.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-gray-800 text-gray-300"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger
            value="documents"
            className="data-[state=active]:bg-red-600"
          >
            Documents
          </TabsTrigger>
          <TabsTrigger
            value="upload"
            className="data-[state=active]:bg-red-600"
          >
            Upload
          </TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-red-600">
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-red-600"
          >
            History ({chatSessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">
              Documents in this Library
            </h2>
            <Button
              onClick={startChatWithLibrary}
              className="bg-red-600 hover:bg-red-700"
              disabled={documents.length === 0}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat with Library
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((document) => (
              <Card
                key={document.id}
                className="bg-gray-900 border-gray-700 hover:border-red-500 transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-12 bg-red-900/60 rounded flex items-center justify-center">
                        <FileText className="w-5 h-5 text-red-300" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">
                          {truncateText(
                            document.title || document.filename,
                            20
                          )}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {document.page_count || "?"} pages
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusBadgeColor(document.status)}>
                      {document.status}
                    </Badge>
                  </div>

                  <div className="mt-4 text-sm text-gray-400 space-y-2">
                    <div className="flex justify-between">
                      <span className="flex items-center">
                        <Book className="w-3 h-3 mr-2" />
                        {document.filename}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-2" />
                        {new Date(
                          document.created_at || Date.now()
                        ).toLocaleDateString()}
                      </span>
                      <span>{formatFileSize(document.file_size || 0)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-white hover:bg-red-900"
                      onClick={() => handleDeleteDocument(document.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>

                    {document.is_web_document ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-white hover:bg-blue-900"
                        onClick={() =>
                          window.open(document.file_path, "_blank")
                        }
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Source
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                        disabled={document.status !== "processed"}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-white hover:bg-blue-900"
                      onClick={() => startChatWithPdf(document)}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {documents.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No Documents Yet
              </h3>
              <p className="text-gray-500 mb-4">
                Upload your first PDF to get started
              </p>
              <Button
                onClick={() => setShowUploader(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload PDFs
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload">
          <PDFUploader
            libraryId={library.id}
            onUploadComplete={fetchDocuments}
          />
        </TabsContent>

        <TabsContent value="chat">
          <ChatInterface
            selectedLibrary={library}
            selectedDocument={selectedDocument || undefined}
            initialConversation={selectedChatSession || undefined}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Chat History</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chatSessions.map((session) => (
              <Card
                key={session.id}
                className="bg-gray-900 border-gray-700 hover:border-red-500 transition-colors cursor-pointer"
                onClick={() => openChatSession(session)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg">
                    {session.title || "Untitled Conversation"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-gray-400">
                    <span>
                      {session.messages && session.messages.length > 0
                        ? "Conversation"
                        : "Conversation"}
                    </span>
                    <span>
                      {new Date(session.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {chatSessions.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No Chat History
              </h3>
              <p className="text-gray-500">
                Start chatting with your PDFs to see history here
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LibraryView;
