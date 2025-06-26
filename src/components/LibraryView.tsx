
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, MessageCircle, Upload, Trash2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PDFUploader from './PDFUploader';
import EnhancedChatInterface from './EnhancedChatInterface';

interface Library {
  id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
}

interface PDF {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  page_count: number | null;
  upload_date: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  library_id: string | null;
  pdf_id: string | null;
}

interface LibraryViewProps {
  library: Library;
  onBack: () => void;
}

const LibraryView = ({ library, onBack }: LibraryViewProps) => {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pdfs');
  const [selectedPdfForChat, setSelectedPdfForChat] = useState<PDF | null>(null);
  const [selectedChatSession, setSelectedChatSession] = useState<ChatSession | null>(null);

  useEffect(() => {
    fetchLibraryData();
  }, [library.id]);

  const fetchLibraryData = async () => {
    try {
      // Fetch PDFs
      const { data: pdfsData, error: pdfsError } = await supabase
        .from('pdfs')
        .select('*')
        .eq('library_id', library.id)
        .order('upload_date', { ascending: false });

      if (pdfsError) throw pdfsError;

      // Fetch chat sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('library_id', library.id)
        .order('updated_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      setPdfs(pdfsData || []);
      setChatSessions(sessionsData || []);
    } catch (error) {
      console.error('Error fetching library data:', error);
      toast.error('Failed to load library data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePdf = async (pdfId: string) => {
    if (!confirm('Are you sure you want to delete this PDF?')) return;

    try {
      const pdf = pdfs.find(p => p.id === pdfId);
      if (pdf) {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('pdfs')
          .remove([pdf.file_path]);

        if (storageError) throw storageError;

        // Delete from database
        const { error: dbError } = await supabase
          .from('pdfs')
          .delete()
          .eq('id', pdfId);

        if (dbError) throw dbError;

        toast.success('PDF deleted successfully');
        fetchLibraryData();
      }
    } catch (error) {
      console.error('Error deleting PDF:', error);
      toast.error('Failed to delete PDF');
    }
  };

  const handleDownloadPdf = async (pdf: PDF) => {
    try {
      const { data, error } = await supabase.storage
        .from('pdfs')
        .download(pdf.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdf.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const startChatWithPdf = (pdf: PDF) => {
    setSelectedPdfForChat(pdf);
    setSelectedChatSession(null);
    setActiveTab('chat');
  };

  const startChatWithLibrary = () => {
    setSelectedPdfForChat(null);
    setSelectedChatSession(null);
    setActiveTab('chat');
  };

  const openChatSession = (session: ChatSession) => {
    setSelectedChatSession(session);
    setSelectedPdfForChat(null);
    setActiveTab('chat');
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
                <Badge key={index} variant="secondary" className="bg-gray-800 text-gray-300">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="pdfs" className="data-[state=active]:bg-red-600">
            PDFs ({pdfs.length})
          </TabsTrigger>
          <TabsTrigger value="upload" className="data-[state=active]:bg-red-600">
            Upload
          </TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-red-600">
            Chat
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-red-600">
            History ({chatSessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdfs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">PDFs in this Library</h2>
            <Button
              onClick={startChatWithLibrary}
              className="bg-red-600 hover:bg-red-700"
              disabled={pdfs.length === 0}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat with Library
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pdfs.map((pdf) => (
              <Card key={pdf.id} className="bg-gray-900 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-start justify-between">
                    <span className="truncate">{pdf.title}</span>
                    <div className="flex space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPdf(pdf)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePdf(pdf.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-400">
                      <FileText className="w-4 h-4 mr-2" />
                      {pdf.file_name}
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>
                        {pdf.file_size ? `${(pdf.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                      </span>
                      <span>{new Date(pdf.upload_date).toLocaleDateString()}</span>
                    </div>

                    <Button
                      onClick={() => startChatWithPdf(pdf)}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Chat with PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pdfs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No PDFs Yet</h3>
              <p className="text-gray-500 mb-4">Upload your first PDF to get started</p>
              <Button
                onClick={() => setActiveTab('upload')}
                className="bg-red-600 hover:bg-red-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload">
          <PDFUploader
            libraryId={library.id}
            onUploadComplete={fetchLibraryData}
          />
        </TabsContent>

        <TabsContent value="chat">
          <EnhancedChatInterface
            library={library}
            selectedPdf={selectedPdfForChat}
            selectedSession={selectedChatSession}
            onSessionCreated={fetchLibraryData}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Chat History</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chatSessions.map((session) => (
              <Card key={session.id} className="bg-gray-900 border-gray-700 hover:border-red-500 transition-colors cursor-pointer"
                onClick={() => openChatSession(session)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg">{session.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-gray-400">
                    <span>
                      {session.pdf_id ? 'PDF Chat' : 'Library Chat'}
                    </span>
                    <span>{new Date(session.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {chatSessions.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No Chat History</h3>
              <p className="text-gray-500">Start chatting with your PDFs to see history here</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LibraryView;
