import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  MessageSquare, 
  Send, 
  Search, 
  CheckCircle, 
  Clock,
  User,
  Paperclip,
  Smile
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/use-realtime";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: string;
  read: boolean;
  type?: "text" | "system";
}

interface Conversation {
  clientId: string;
  clientName: string;
  lastMessage?: Message;
  unreadCount: number;
  messages: Message[];
}

interface NutritionistMessagingProps {
  clients: any[];
  nutritionistId?: string;
  selectedClientId?: string | null;
}

const quickTemplates = [
  "How are you feeling today?",
  "Great progress! Keep it up!",
  "Let's schedule a follow-up consultation.",
  "I've updated your meal plan. Please check it out.",
  "How did you find today's meals?",
];

export default function NutritionistMessaging({ clients, nutritionistId, selectedClientId: externalSelectedClientId }: NutritionistMessagingProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // Sync with external selected client
  useEffect(() => {
    if (externalSelectedClientId) {
      setSelectedClientId(externalSelectedClientId);
    }
  }, [externalSelectedClientId]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Mock conversations - in real app, this would come from API
  const [conversations, setConversations] = useState<Record<string, Conversation>>(() => {
    const initial: Record<string, Conversation> = {};
    clients.forEach(client => {
      initial[client.id || client.user_id] = {
        clientId: client.id || client.user_id,
        clientName: client.clientName,
        unreadCount: 0,
        messages: [],
      };
    });
    return initial;
  });

  // Real-time message updates
  useRealtime({
    events: ["message.sent", "message.received"],
    channels: clients.map(c => `chat_${c.id || c.user_id}`),
    userRole: "nutritionist",
    onEvent: (event) => {
      if (event.type === "message.sent" || event.type === "message.received") {
        const message: Message = {
          id: event.data.id || Date.now().toString(),
          sender_id: event.data.sender_id,
          receiver_id: event.data.receiver_id,
          content: event.data.content,
          timestamp: event.data.timestamp || new Date().toISOString(),
          read: event.data.read || false,
        };

        const clientId = message.sender_id === nutritionistId ? message.receiver_id : message.sender_id;
        setConversations(prev => {
          const conv = prev[clientId] || {
            clientId,
            clientName: clients.find(c => (c.id || c.user_id) === clientId)?.clientName || "Client",
            unreadCount: 0,
            messages: [],
          };

          const updatedMessages = [...conv.messages, message].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          return {
            ...prev,
            [clientId]: {
              ...conv,
              messages: updatedMessages,
              lastMessage: updatedMessages[updatedMessages.length - 1],
              unreadCount: message.sender_id !== nutritionistId && !message.read 
                ? conv.unreadCount + 1 
                : conv.unreadCount,
            },
          };
        });

        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    },
  });

  // Filter conversations by search
  const filteredConversations = Object.values(conversations).filter(conv =>
    conv.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation = selectedClientId ? conversations[selectedClientId] : null;

  // Scroll to bottom when messages change
  useEffect(() => {
    if (selectedConversation) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [selectedConversation?.messages.length]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedClientId || !nutritionistId) return;

    const message: Message = {
      id: Date.now().toString(),
      sender_id: nutritionistId,
      receiver_id: selectedClientId,
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Optimistically add message
    setConversations(prev => {
      const conv = prev[selectedClientId];
      if (!conv) return prev;

      return {
        ...prev,
        [selectedClientId]: {
          ...conv,
          messages: [...conv.messages, message],
          lastMessage: message,
        },
      };
    });

    setMessageText("");

    try {
      // In real app, send to API
      // await apiRequest("POST", "/api/messages", message);
      
      toast({
        title: "Message sent",
        description: "Your message has been delivered",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleQuickTemplate = (template: string) => {
    setMessageText(template);
  };

  const totalUnread = Object.values(conversations).reduce((sum, conv) => sum + conv.unreadCount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
              {totalUnread > 0 && (
                <Badge variant="destructive">{totalUnread}</Badge>
              )}
            </CardTitle>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No conversations found
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <motion.button
                    key={conv.clientId}
                    onClick={() => {
                      setSelectedClientId(conv.clientId);
                      // Mark as read
                      setConversations(prev => ({
                        ...prev,
                        [conv.clientId]: {
                          ...conv,
                          unreadCount: 0,
                          messages: conv.messages.map(m => ({ ...m, read: true })),
                        },
                      }));
                    }}
                    className={cn(
                      "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                      selectedClientId === conv.clientId && "bg-muted"
                    )}
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {conv.clientName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm truncate">{conv.clientName}</p>
                          {conv.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.lastMessage.content}
                          </p>
                        )}
                        {conv.lastMessage && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(conv.lastMessage.timestamp).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedConversation ? (
          <>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Avatar>
                  <AvatarFallback>
                    {selectedConversation.clientName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p>{selectedConversation.clientName}</p>
                  <p className="text-xs text-muted-foreground font-normal">Online</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedConversation.messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    selectedConversation.messages.map((message) => {
                      const isOwn = message.sender_id === nutritionistId;
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "flex",
                            isOwn ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg p-3",
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            <p className="text-sm">{message.content}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className={cn(
                                "text-xs",
                                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}>
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </span>
                              {isOwn && (
                                <CheckCircle className={cn(
                                  "w-3 h-3",
                                  message.read ? "text-primary-foreground/70" : "text-primary-foreground/50"
                                )} />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick Templates */}
              {messageText === "" && (
                <div className="px-4 pb-2">
                  <div className="flex flex-wrap gap-2">
                    {quickTemplates.map((template, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickTemplate(template)}
                        className="text-xs"
                      >
                        {template}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-[60px] resize-none"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Select a client to start messaging</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

