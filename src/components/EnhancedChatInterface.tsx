
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, FileText, User, Bot, Library } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Library {
  id: string;
  name: string;
}

interface PDF {
  id: string;
  title: string;
  file_name: string;
}

interface ChatSession {
  id: string;
  title: string;
  library_id: string | null;
  pdf_id: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source_reference: string | null;
  created_at: string;
}

interface EnhancedChatInterfaceProps {
  library: Library;
  selectedPdf?: PDF | null;
  selectedSession?: ChatSession | null;
  onSessionCreated: () => void;
}

const EnhancedChatInterface = ({ 
  library, 
  selectedPdf, 
  selectedSession,
  onSessionCreated 
}: EnhancedChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(selectedSession || null);

  useEffect(() => {
    if (selectedSession) {
      setCurrentSession(selectedSession);
      loadChatHistory(selectedSession.id);
    } else {
      setCurrentSession(null);
      setMessages([]);
    }
  }, [selectedSession]);

  const loadChatHistory = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Type assertion to ensure proper typing
      const typedMessages: Message[] = (data || []).map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant'
      }));
      
      setMessages(typedMessages);
    } catch (error) {
      console.error('Error loading chat history:', error);
      toast.error('Failed to load chat history');
    }
  };

  const createNewSession = async (firstMessage: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    try {
      const sessionTitle = selectedPdf 
        ? `Chat with ${selectedPdf.title}`
        : `Chat with ${library.name}`;

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          library_id: library.id,
          pdf_id: selectedPdf?.id || null,
          title: sessionTitle
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentSession(data);
      onSessionCreated();
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create chat session');
      return null;
    }
  };

  const saveMessage = async (sessionId: string, role: 'user' | 'assistant', content: string, sourceRef?: string): Promise<Message | null> => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role,
          content,
          source_reference: sourceRef || null
        })
        .select()
        .single();

      if (error) throw error;
      
      // Type assertion to ensure proper typing
      return {
        ...data,
        role: data.role as 'user' | 'assistant'
      };
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    try {
      let sessionToUse = currentSession;
      
      // Create session if it doesn't exist
      if (!sessionToUse) {
        sessionToUse = await createNewSession(userMessage);
        if (!sessionToUse) return;
      }

      // Add user message to UI immediately
      const userMsgData = await saveMessage(sessionToUse.id, 'user', userMessage);
      if (userMsgData) {
        setMessages(prev => [...prev, userMsgData]);
      }

      // Simulate AI response (replace with actual AI integration)
      setTimeout(async () => {
        const aiResponse = generateMockResponse(userMessage, selectedPdf?.title || library.name);
        const aiMsgData = await saveMessage(sessionToUse!.id, 'assistant', aiResponse.content, aiResponse.source);
        
        if (aiMsgData) {
          setMessages(prev => [...prev, aiMsgData]);
        }
        setLoading(false);
      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setLoading(false);
    }
  };

  const generateMockResponse = (question: string, context: string) => {
    const responses = [
      {
        content: `Based on the content in "${context}", I can help you with that question. Here's what I found relevant to your query: "${question}". This appears to relate to key concepts discussed in the document.`,
        source: `${context} - Page 1-3`
      },
      {
        content: `According to the information in "${context}", your question about "${question}" touches on important points covered in the material. Let me break this down for you with specific references.`,
        source: `${context} - Chapter 2`
      },
      {
        content: `I've analyzed the content in "${context}" regarding your question: "${question}". The document provides several insights that directly address what you're asking about.`,
        source: `${context} - Section 4.2`
      }
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const contextInfo = selectedPdf 
    ? `Chatting with PDF: ${selectedPdf.title}`
    : `Chatting with Library: ${library.name}`;

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="bg-gray-900/80 border-gray-700 h-[70vh] flex flex-col backdrop-blur-sm">
        <CardHeader className="border-b border-gray-700 bg-gray-800/50">
          <CardTitle className="text-white flex items-center text-lg">
            {selectedPdf ? (
              <FileText className="w-5 h-5 mr-2 text-red-500" />
            ) : (
              <Library className="w-5 h-5 mr-2 text-red-500" />
            )}
            {contextInfo}
          </CardTitle>
          {currentSession && (
            <p className="text-sm text-gray-400">Session: {currentSession.title}</p>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-gray-400">
                  {selectedPdf 
                    ? `Start asking questions about "${selectedPdf.title}"`
                    : `Ask me anything about the PDFs in "${library.name}"`
                  }
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
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
                placeholder={`Ask a question about ${selectedPdf ? selectedPdf.title : library.name}...`}
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
      </Card>
    </div>
  );
};

export default EnhancedChatInterface;
