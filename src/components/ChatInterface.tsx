import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Send,
  FileText,
  User,
  Bot,
  RefreshCw,
  ChevronDown,
  Edit2,
} from "lucide-react";
import {
  ChatAPI,
  type Message as ApiMessage,
  type Conversation,
  type Library,
  type Document as ApiDocument,
} from "@/services/api";
import { truncateText } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string | number;
  type: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: Date;
  source_reference?: string | null;
}

interface ChatInterfaceProps {
  selectedLibrary?: Library;
  selectedDocument?: ApiDocument;
  initialConversation?: Conversation;
}

const ChatInterface = ({
  selectedLibrary,
  selectedDocument,
  initialConversation,
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [visibleReasoning, setVisibleReasoning] = useState<{
    [key: string]: boolean;
  }>({});
  const [resumePending, setResumePending] = useState(false);

  // Initialize with passed-in conversation
  useEffect(() => {
    if (initialConversation) {
      setActiveConversation(initialConversation);
    }
  }, [initialConversation]);

  // Load conversations whenever library or specific document changes
  useEffect(() => {
    if (selectedLibrary) {
      loadConversations();
    }
  }, [selectedLibrary, selectedDocument]);

  // When a conversation is selected, prompt the user to resume
  useEffect(() => {
    if (activeConversation) {
      // Ask user to resume the loaded conversation
      setResumePending(true);
    } else {
      // If no conversation is active, show welcome message
      setResumePending(false);
      setMessages([
        {
          id: "1",
          type: "assistant",
          content:
            "Hello! I'm your AI reading assistant. Ask me anything about your uploaded PDFs and I'll help you find the information you need.",
          timestamp: new Date(),
        },
      ]);
    }
  }, [activeConversation]);

  // Scroll to bottom only if already near bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      if (isAtBottom) {
        container.scrollTo({ top: scrollHeight, behavior: "smooth" });
      }
    }
  }, [messages]);

  const loadConversations = async () => {
    if (!selectedLibrary) return;
    try {
      let data: Conversation[];
      if (selectedDocument) {
        data = await ChatAPI.getConversations(
          Number(selectedLibrary.id),
          selectedDocument.id
        );
      } else {
        data = await ChatAPI.getConversations(Number(selectedLibrary.id));
      }
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast.error("Failed to load conversation history");
    }
  };

  const loadMessages = async () => {
    if (!activeConversation) return;

    try {
      setLoading(true);
      const messagesData = await ChatAPI.getConversationMessages(
        activeConversation.id
      );

      // Convert API messages to component messages
      const formattedMessages: Message[] = messagesData.map((msg) => {
        // Parse reasoning if wrapped in <reasoning> tags
        const raw = msg.content;
        const match = raw.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
        let reasoning: string | undefined;
        let content = raw;
        if (match) {
          reasoning = match[1].trim();
          content = raw.replace(/<reasoning>[\s\S]*?<\/reasoning>/, "").trim();
        }
        return {
          id: msg.id,
          type: msg.role as "user" | "assistant",
          content,
          reasoning,
          timestamp: new Date(msg.created_at),
          source_reference: msg.source_reference,
        };
      });

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load conversation messages");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    if (!selectedLibrary) {
      toast.error("Please select a library first");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      if (!activeConversation) {
        // Create new conversation, scoped to library or specific PDF
        const newConversation = await ChatAPI.createConversation(
          Number(selectedLibrary.id),
          undefined,
          selectedDocument?.id
        );
        setActiveConversation(newConversation);

        // Add user message to the new conversation
        await ChatAPI.sendMessage(newConversation.id, inputMessage);

        // Get AI response
        const response = await ChatAPI.sendMessage(
          newConversation.id,
          inputMessage
        );

        // Parse reasoning in AI response
        let aiContent = response.content;
        let aiReasoning: string | undefined;
        const rm = aiContent.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
        if (rm) {
          aiReasoning = rm[1].trim();
          aiContent = aiContent
            .replace(/<reasoning>[\s\S]*?<\/reasoning>/, "")
            .trim();
        }
        const aiMessage: Message = {
          id: response.id,
          type: "assistant",
          content: aiContent,
          reasoning: aiReasoning,
          timestamp: new Date(response.created_at),
          source_reference: response.source_reference,
        };

        setMessages((prev) => [...prev, aiMessage]);
        loadConversations(); // Refresh conversation list
      } else {
        // Send message in existing conversation
        const response = await ChatAPI.sendMessage(
          activeConversation.id,
          inputMessage
        );

        // Parse reasoning in AI response
        let aiContent = response.content;
        let aiReasoning: string | undefined;
        const rm = aiContent.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
        if (rm) {
          aiReasoning = rm[1].trim();
          aiContent = aiContent
            .replace(/<reasoning>[\s\S]*?<\/reasoning>/, "")
            .trim();
        }
        const aiMessage: Message = {
          id: response.id,
          type: "assistant",
          content: aiContent,
          reasoning: aiReasoning,
          timestamp: new Date(response.created_at),
          source_reference: response.source_reference,
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "-error",
          type: "assistant",
          content:
            "Sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setActiveConversation(null);
    setMessages([
      {
        id: "1",
        type: "assistant",
        content:
          "Hello! I'm your AI reading assistant. Ask me anything about your uploaded PDFs and I'll help you find the information you need.",
        timestamp: new Date(),
      },
    ]);
  };

  const selectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
  };

  const deleteConversation = async (conversationId: number) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await ChatAPI.deleteConversation(conversationId);
      toast.success("Conversation deleted successfully");

      // If the deleted conversation was active, start a new one
      if (activeConversation?.id === conversationId) {
        startNewConversation();
      }

      // Refresh conversation list
      loadConversations();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  // Function to rename a conversation
  const renameConversation = async (
    conversationId: number,
    currentTitle: string
  ) => {
    const newTitle = window.prompt(
      "Enter new conversation title",
      currentTitle || ""
    );
    if (!newTitle || newTitle === currentTitle) return;
    try {
      await ChatAPI.updateConversation(conversationId, newTitle);
      loadConversations();
      if (activeConversation && activeConversation.id === conversationId) {
        setActiveConversation({ ...activeConversation, title: newTitle });
      }
      toast.success("Conversation renamed successfully");
    } catch (error) {
      console.error("Error renaming conversation:", error);
      toast.error("Failed to rename conversation");
    }
  };

  // Resume the selected conversation
  const handleResume = () => {
    setResumePending(false);
    loadMessages();
  };

  const toggleReasoning = (id: string) => {
    setVisibleReasoning((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Card className="flex flex-col h-full bg-gray-900 border-gray-800 text-white shadow-2xl rounded-lg">
      <CardHeader className="flex-row items-center justify-between border-b border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <Bot className="w-7 h-7 text-red-500" />
          <div>
            <CardTitle className="text-lg">
              {activeConversation
                ? truncateText(activeConversation.title || "Conversation", 30)
                : "New Conversation"}
            </CardTitle>
            <p className="text-xs text-gray-400">
              {selectedDocument
                ? `Chatting with: ${truncateText(
                    selectedDocument.filename,
                    25
                  )}`
                : selectedLibrary
                ? `Scope: ${selectedLibrary.name} library`
                : "No library selected"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            className="border-red-600 text-white hover:bg-red-700"
            onClick={startNewConversation}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            New Chat
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                History ({conversations.length}){" "}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
              {conversations.map((conv) => (
                <DropdownMenuItem
                  key={conv.id}
                  onSelect={() => selectConversation(conv)}
                  className="flex justify-between items-center"
                >
                  <span>{truncateText(conv.title || "Untitled", 25)}</span>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        renameConversation(conv.id, conv.title || "");
                      }}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative">
        <div
          ref={messagesContainerRef}
          className="p-6 space-y-6 overflow-y-auto"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-4 ${
                message.type === "user" ? "justify-end" : ""
              }`}
            >
              {message.type === "assistant" && (
                <Bot className="w-8 h-8 p-1.5 rounded-full bg-gray-600 text-white flex-shrink-0" />
              )}
              <div
                className={`px-4 py-3 rounded-xl max-w-xl ${
                  message.type === "user"
                    ? "bg-red-600 text-white"
                    : "bg-gray-700 text-gray-200"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.reasoning && (
                  <div className="mt-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 text-blue-300 hover:text-blue-400"
                      onClick={() => toggleReasoning(String(message.id))}
                    >
                      {visibleReasoning[String(message.id)]
                        ? "Hide Reasoning"
                        : "Show Reasoning"}
                    </Button>
                    {visibleReasoning[String(message.id)] && (
                      <div className="mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-600 text-sm">
                        <p className="whitespace-pre-wrap text-gray-300">
                          {message.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2 text-right">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
              {message.type === "user" && (
                <User className="w-8 h-8 p-1.5 rounded-full bg-red-500 text-white flex-shrink-0" />
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Resume overlay */}
        {resumePending && (
          <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-10">
            <div className="text-center p-6 bg-gray-800 rounded-lg shadow-xl">
              <h3 className="text-lg font-semibold text-white">
                Resume this conversation?
              </h3>
              <p className="text-gray-400 mt-2">
                Continue your chat about{" "}
                <span className="font-semibold text-white">
                  {activeConversation?.title || "your documents"}
                </span>
                .
              </p>
              <Button
                onClick={handleResume}
                className="mt-4 bg-red-600 hover:bg-red-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Resume Chat
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      {!resumePending && (
        <CardFooter className="pt-4 border-t border-gray-700">
          <div className="relative w-full">
            <Input
              type="text"
              placeholder="Ask a question about your PDFs..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="bg-gray-800 border-gray-600 rounded-full pl-4 pr-12 py-3 h-12"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full"
              onClick={handleSendMessage}
              disabled={loading || !inputMessage.trim()}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default ChatInterface;
