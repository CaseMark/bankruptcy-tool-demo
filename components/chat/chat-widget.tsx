"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  User,
  Bot,
  Phone,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatContext {
  verifiedClient?: {
    firstName: string;
    lastName: string;
    ssnLast4: string;
    caseId: string;
  };
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ChatContext>({});
  const [connectionString, setConnectionString] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setConnectionString(localStorage.getItem("bankruptcy_db_connection"));
    setApiKey(localStorage.getItem("casedev_api_key"));
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  // Add welcome message when chat is first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello! I'm your bankruptcy case assistant. I can help you with:\n\n" +
            "- **Client Intake**: Start or continue your case intake\n" +
            "- **Case Questions**: Ask about your existing case\n" +
            "- **Platform Help**: Learn about our features\n\n" +
            "Do you have an existing case with us, or would you like to start a new one?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !connectionString || !apiKey) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/chat?connectionString=${encodeURIComponent(connectionString)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            context,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      // Update context if returned
      if (data.context) {
        setContext(data.context);
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "I'm sorry, I encountered an error. Please try again or contact support if the issue persists.",
          timestamp: new Date(),
        },
      ]);
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

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  // Format message content with markdown-like styling
  const formatMessage = (content: string) => {
    return content.split("\n").map((line, i) => {
      // Bold text
      let formatted = line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      // Bullet points
      if (formatted.startsWith("- ")) {
        formatted = `<span class="flex gap-2"><span class="text-primary">•</span><span>${formatted.substring(2)}</span></span>`;
      }
      return (
        <span
          key={i}
          className="block"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  };

  // FAB Button when closed
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105 flex items-center justify-center z-50"
        title="Chat with assistant"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2 px-4 py-3 z-50"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="font-medium">Chat</span>
        {messages.length > 1 && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  // Full chat panel
  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-background rounded-xl shadow-2xl border overflow-hidden z-50 flex flex-col max-h-[600px]">
      {/* Header */}
      <div className="bg-primary p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Case Assistant</h3>
            <p className="text-white/70 text-sm">
              {context.verifiedClient
                ? `Verified: ${context.verifiedClient.firstName}`
                : "Intake & Support"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleMinimize}
            className="text-white/70 hover:text-white p-1.5 rounded hover:bg-white/10"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="text-white/70 hover:text-white p-1.5 rounded hover:bg-white/10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Verification badge */}
      {context.verifiedClient && (
        <div className="bg-green-50 border-b border-green-100 px-4 py-2 flex items-center gap-2 text-green-700 text-sm flex-shrink-0">
          <User className="w-4 h-4" />
          <span>
            Verified as {context.verifiedClient.firstName}{" "}
            {context.verifiedClient.lastName}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-primary text-white"
                  : "bg-muted text-foreground"
              }`}
            >
              {formatMessage(message.content)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 flex-shrink-0">
        {!connectionString || !apiKey ? (
          <div className="text-center text-muted-foreground text-sm py-2">
            Please log in to use the chat assistant.
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
