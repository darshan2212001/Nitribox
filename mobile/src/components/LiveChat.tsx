import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { mobileWebSocket, REALTIME_EVENTS } from '../lib/websocket';
import { useAuth } from '../hooks/useAuth';
import Button from './ui/Button';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  type: 'text' | 'image' | 'system';
  isOwn: boolean;
}

interface LiveChatProps {
  roomId: string;
  onClose?: () => void;
}

export default function LiveChat({ roomId, onClose }: LiveChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const isConnected = mobileWebSocket.isConnected;

  useEffect(() => {
    if (isConnected && user) {
      // Join chat room
      mobileWebSocket.send('join_chat_room', { roomId, userId: user.id });
    }
  }, [isConnected, roomId, user?.id]);

  useEffect(() => {
    const handleNewMessage = (data: any) => {
      const message: ChatMessage = {
        id: data.id || `msg-${Date.now()}`,
        senderId: data.senderId,
        senderName: data.senderName,
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
        type: data.type || 'text',
        isOwn: data.senderId === user?.id,
      };
      setMessages(prev => [...prev, message]);
    };

    const handleTyping = (data: any) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => {
          if (data.isTyping && !prev.includes(data.userName)) {
            return [...prev, data.userName];
          } else if (!data.isTyping) {
            return prev.filter(name => name !== data.userName);
          }
          return prev;
        });
      }
    };

    const handleUserJoined = (data: any) => {
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        message: `${data.userName || 'A user'} joined the chat`,
        timestamp: new Date().toISOString(),
        type: 'system',
        isOwn: false,
      };
      setMessages(prev => [...prev, systemMessage]);
    };

    const handleUserLeft = (data: any) => {
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        message: `${data.userName || 'A user'} left the chat`,
        timestamp: new Date().toISOString(),
        type: 'system',
        isOwn: false,
      };
      setMessages(prev => [...prev, systemMessage]);
    };

    // Subscribe to chat events
    const cleanupMessage = mobileWebSocket.on(REALTIME_EVENTS.MESSAGE, handleNewMessage);
    const cleanupTyping = mobileWebSocket.on('user_typing', handleTyping);
    const cleanupJoined = mobileWebSocket.on('user_joined', handleUserJoined);
    const cleanupLeft = mobileWebSocket.on('user_left', handleUserLeft);

    return () => {
      cleanupMessage();
      cleanupTyping();
      cleanupJoined();
      cleanupLeft();
    };
  }, [user?.id]);

  const sendMessage = () => {
    if (newMessage.trim() && isConnected && user) {
      const message = {
        roomId,
        senderId: user.id,
        senderName: user.name || 'User',
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
        type: 'text',
      };

      mobileWebSocket.send('send_message', message);
      setNewMessage('');
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    if (text.trim() && !isTyping && user) {
      setIsTyping(true);
      mobileWebSocket.send('typing', { roomId, userId: user.id, userName: user.name, isTyping: true });
    } else if (!text.trim() && isTyping && user) {
      setIsTyping(false);
      mobileWebSocket.send('typing', { roomId, userId: user.id, userName: user.name, isTyping: false });
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.messageContainer, item.isOwn ? styles.ownMessage : styles.otherMessage]}>
      {!item.isOwn && item.type !== 'system' && (
        <Text style={styles.senderName}>{item.senderName}</Text>
      )}
      <View style={[styles.messageBubble, item.isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.messageText, item.isOwn ? styles.ownText : styles.otherText]}>
          {item.message}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Live Chat</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {typingUsers.length > 0 && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={handleTyping}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <Button
          title="Send"
          onPress={sendMessage}
          disabled={!newMessage.trim() || !isConnected}
          size="small"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2d5016',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#2d5016',
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
  },
});
