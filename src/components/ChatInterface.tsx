import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, FileText, History, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Library as ApiLibrary, Document as ApiDocument, Conversation as ApiConversation, ChatAPI } from "@/services/api";

interface ChatInterfaceProps {
  selectedLibrary?: ApiLibrary | null;
  selectedDocument?: ApiDocument;
  initialConversation?: ApiConversation;
}

const ChatInterface = ({ selectedLibrary, selectedDocument, initialConversation }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ApiConversation | null>(initialConversation || null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (selectedLibrary) {
      loadConversations();
    }
    if (initialConversation) {
      setCurrentConversation(initialConversation);
      loadConversation(initialConversation.id);
    }
  }, [selectedLibrary, initialConversation]);

  const loadConversations = async () => {
    if (!selectedLibrary) return;
    
    try {
      const convs = await ChatAPI.getConversations(
        Number(selectedLibrary.id),
        selectedDocument?.id
      );
      setConversations(convs);
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast.error("Failed to load conversations");
    }
  };

  const loadConversation = async (conversationId: number) => {
    try {
      const msgs = await ChatAPI.getConversationMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Failed to load conversation");
    }
  };

  const createNewConversation = async () => {
    if (!selectedLibrary) return;

    try {
      const title = selectedDocument 
        ? `Chat with ${selectedDocument.title || selectedDocument.filename}`
        : `Chat with ${selectedLibrary.name}`;
      
      const conversation = await ChatAPI.createConversation(
        Number(selectedLibrary.id),
        title,
        selectedDocument?.id
      );
      
      setCurrentConversation(conversation);
      setMessages([]);
      setConversations(prev => [conversation, ...prev]);
      toast.success("New conversation started");
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading || !selectedLibrary) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setLoading(true);

    try {
      let conversation = currentConversation;
      
      if (!conversation) {
        await createNewConversation();
        conversation = currentConversation;
        if (!conversation) return;
      }

      const message = await ChatAPI.sendMessage(conversation.id, userMessage);
      setMessages(prev => [...prev, message]);
      
      // Simulate AI response
      setTimeout(() => {
        const aiResponse = {
          id: Date.now(),
          role: "assistant" as const,
          content: `I understand you're asking about "${userMessage}". Based on the content in ${selectedDocument?.title || selectedLibrary.name}, here's what I found...`,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiResponse]);
        setLoading(false);
      }, 1000);

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setLoading(false);
    }
  };

  const selectConversation = (conversation: ApiConversation) => {
    setCurrentConversation(conversation);
    loadConversation(conversation.id);
    setShowHistory(false);
  };

  const deleteConversation = async (conversationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await ChatAPI.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      toast.success("Conversation deleted");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  if (!selectedLibrary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Bot className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            Select a Library
          </h3>
          <p className="text-gray-500">Choose a library to start chatting with your PDFs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto relative">
      <Card className="bg-gray-900/80 border-gray-700 h-[70vh] flex backdrop-blur-sm">
        {/* History Sidebar */}
        <div className={`${showHistory ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-700`}>
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Chat History</h3>
              <Button
                onClick={createNewConversation}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => selectConversation(conversation)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors group relative ${
                    currentConversation?.id === conversation.id
                      ? 'bg-red-600/20 border border-red-600/50'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <h4 className="text-white text-sm font-medium truncate pr-8">
                    {conversation.title}
                  </h4>
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(conversation.created_at).toLocaleDateString()}
                  </p>
                  
                  <button
                    onClick={(e) => deleteConversation(conversation.id, e)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <CardHeader className="border-b border-gray-700 bg-gray-800/50 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center text-lg">
                {selectedDocument ? (
                  <FileText className="w-5 h-5 mr-2 text-red-500" />
                ) : (
                  <Bot className="w-5 h-5 mr-2 text-red-500" />
                )}
                {selectedDocument 
                  ? `Chat with ${selectedDocument.title || selectedDocument.filename}`
                  : `Chat with ${selectedLibrary.name}`
                }
              </CardTitle>
              {currentConversation && (
                <p className="text-sm text-gray-400 mt-1">
                  {currentConversation.title}
                </p>
              )}
            </div>
            
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <History className="w-4 h-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 chat-scroll">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-gray-400">
                    {selectedDocument 
                      ? `Start asking questions about "${selectedDocument.title || selectedDocument.filename}"`
                      : `Ask me anything about the PDFs in "${selectedLibrary.name}"`
                    }
                  </p>
                </div>
              )}
              
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-800 text-gray-100 border border-gray-700'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {message.role === 'assistant' && (
                        <Bot className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      )}
                      {message.role === 'user' && (
                        <User className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        {message.source_reference && (
                          <div className="mt-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                            <p className="text-xs text-gray-300 flex items-center">
                              <FileText className="w-3 h-3 mr-2 text-red-400" />
                              Source: {message.source_reference}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-gray-800 text-gray-100 border border-gray-700">
                    <div className="flex items-center space-x-3">
                      <Bot className="w-5 h-5 text-red-400 animate-pulse" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-700 p-6 bg-gray-800/30">
              <div className="flex space-x-4">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={`Ask a question about ${selectedDocument?.title || selectedLibrary.name}...`}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={loading}
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-red-600 hover:bg-red-700 px-6"
                  disabled={!inputMessage.trim() || loading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
};

export default ChatInterface;
