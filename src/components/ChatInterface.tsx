
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Sparkles, MessageCircle, Clock, Search } from "lucide-react";
import { Library, ChatAPI, Conversation, Message } from "@/services/api";
import { toast } from "sonner";

interface ChatInterfaceProps {
  selectedLibrary: Library | null;
}

const ChatInterface = ({ selectedLibrary }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedLibrary) {
      fetchConversations();
    }
  }, [selectedLibrary]);

  const fetchConversations = async () => {
    if (!selectedLibrary) return;
    
    try {
      const convs = await ChatAPI.getConversations(Number(selectedLibrary.id));
      setConversations(convs);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const startNewConversation = async () => {
    if (!selectedLibrary) return;

    try {
      const newConv = await ChatAPI.createConversation(
        Number(selectedLibrary.id),
        "New Chat"
      );
      setCurrentConversation(newConv);
      setMessages([]);
      await fetchConversations();
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start new conversation");
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    try {
      const msgs = await ChatAPI.getConversationMessages(conversation.id);
      setMessages(msgs);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !selectedLibrary) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    // Add user message immediately
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // If no current conversation, create one
      let convId = currentConversation?.id;
      if (!convId) {
        const newConv = await ChatAPI.createConversation(
          Number(selectedLibrary.id),
          userMessage.slice(0, 50) + "..."
        );
        setCurrentConversation(newConv);
        convId = newConv.id;
        await fetchConversations();
      }

      // Send message to API
      const response = await ChatAPI.sendMessage(convId, userMessage);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error("Error sending message:", error);
      // Add mock response for demo
      setTimeout(() => {
        const mockResponse: Message = {
          id: Date.now() + 1,
          role: "assistant",
          content: `I understand you're asking about "${userMessage}". Based on your ${selectedLibrary.name} library, I can help you find relevant information. This is a demo response - in the full version, I would analyze your PDFs using RAG technology to provide accurate, source-cited answers.`,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, mockResponse]);
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-black rounded-lg overflow-hidden shadow-2xl animate-fade-in">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 bg-gray-900 border-r border-gray-700 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-red-600" />
              Chat History
            </h2>
            <Button
              onClick={startNewConversation}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300 hover:scale-105"
            >
              New Chat
            </Button>
          </div>
          
          {selectedLibrary && (
            <Badge variant="secondary" className="bg-red-900/30 text-red-300 border-red-600">
              {selectedLibrary.name}
            </Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Start a new chat to begin</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 border-gray-700 ${
                    currentConversation?.id === conv.id 
                      ? 'bg-red-900/30 border-red-600' 
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                  onClick={() => selectConversation(conv)}
                >
                  <CardContent className="p-3">
                    <h3 className="text-white text-sm font-medium truncate">
                      {conv.title || "Untitled Chat"}
                    </h3>
                    <div className="flex items-center text-xs text-gray-400 mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-gray-400 hover:text-white mr-3 transition-all duration-300 hover:scale-110"
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-white font-semibold flex items-center">
                  <Bot className="w-6 h-6 mr-2 text-red-600" />
                  PDFlix AI Assistant
                </h1>
                <p className="text-gray-400 text-sm">
                  {selectedLibrary ? `Chatting with ${selectedLibrary.name}` : "Ready to help with your PDFs"}
                </p>
              </div>
            </div>
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900/20 to-black/20">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
              <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-red-600/30">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Ready to Chat!</h3>
              <p className="text-gray-400 max-w-md">
                Ask me anything about your PDFs. I can help you find information, summarize content, and answer questions based on your documents.
              </p>
              {selectedLibrary && (
                <Badge className="mt-4 bg-red-900/30 text-red-300 border-red-600">
                  {selectedLibrary.name} Library Selected
                </Badge>
              )}
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div
                  className={`max-w-[80%] flex items-start space-x-3 ${
                    message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-blue-800"
                        : "bg-gradient-to-br from-red-600 to-red-800"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 shadow-lg transition-all duration-300 hover:shadow-xl ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-white border border-gray-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    {message.source_reference && (
                      <div className="mt-2 text-xs opacity-75">
                        <Badge variant="outline" className="text-xs">
                          Source: {message.source_reference}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 shadow-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={selectedLibrary ? `Ask about ${selectedLibrary.name}...` : "Select a library to start chatting..."}
                disabled={isLoading || !selectedLibrary}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 pr-12 py-3 text-lg rounded-xl focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all duration-300"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || !selectedLibrary}
              size="lg"
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-red-600/30"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Ask questions about your PDFs • Get instant AI-powered answers
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
