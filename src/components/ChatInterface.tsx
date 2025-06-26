
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, FileText, User, Bot } from "lucide-react";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source?: string;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI reading assistant. Ask me anything about your uploaded PDFs and I\'ll help you find the information you need.',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I understand you're asking about "${inputMessage}". Based on your uploaded PDFs, here's what I found...`,
        timestamp: new Date(),
        source: 'Clean Code - Chapter 3',
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">AI Chat</h1>

      <Card className="bg-gray-900/80 border-gray-700 h-[70vh] flex flex-col backdrop-blur-sm">
        <CardHeader className="border-b border-gray-700 bg-gray-800/50">
          <CardTitle className="text-white flex items-center text-lg">
            <Bot className="w-5 h-5 mr-2 text-red-500" />
            Chat with your PDFs
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-100 border border-gray-700'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {message.type === 'assistant' && (
                      <Bot className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    )}
                    {message.type === 'user' && (
                      <User className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      {message.source && (
                        <div className="mt-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                          <p className="text-xs text-gray-300 flex items-center">
                            <FileText className="w-3 h-3 mr-2 text-red-400" />
                            Source: {message.source}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-gray-700 p-6 bg-gray-800/30">
            <div className="flex space-x-4">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask a question about your PDFs..."
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button
                onClick={handleSendMessage}
                className="bg-red-600 hover:bg-red-700 px-6"
                disabled={!inputMessage.trim()}
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

export default ChatInterface;
