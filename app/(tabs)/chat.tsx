import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import { styles, colors } from '../../styles';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE, getAccessToken } from '@/constants/API';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ChatRoom = {
  id: string;
  name: string;
};

type Message = {
  id: string;
  text?: string;
  image?: string;
  sender: string;
  timestamp: string;
};

export default function ChatPage() {
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<{ [roomId: string]: Message[] }>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Modal for chat type selection
  const [chatTypeModalVisible, setChatTypeModalVisible] = useState(false);

  // Ref for FlatList to scroll to bottom
  const flatListRef = useRef<FlatList>(null);

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          Alert.alert('Authorization Error', 'You must be logged in to view chats.');
          return;
        }
        const response = await fetch(`${API_BASE}/v1/chats/`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'accept': '*/*',
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch chats');
        }
        const data = await response.json();
        const rooms: ChatRoom[] = data.chats.map((chat: any) => ({
          id: String(chat.id),
          name: `Chat ${chat.id}`,
        }));
        setChatRooms(rooms);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Could not load chats.');
      }
    };
    fetchChats();
  }, []);

  // Join chat room via WebSocket when activeRoom changes
  useEffect(() => {
    if (!activeRoom) {
      // Close socket if leaving room
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Connect to WebSocket server at /ws/chat/{chat_id}
    const wsUrl = API_BASE.replace(/^http/, 'ws') + `/ws/chat/${activeRoom.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        action: 'join',
        chat_id: Number(activeRoom.id),
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message from WS:', data);
        if (data.type === 'history' && Array.isArray(data.messages)) {
          const history: Message[] = data.messages.map((msg: any, idx: number) => ({
            id: msg.id !== undefined && msg.id !== null ? String(msg.id) : `history-${msg.created_at || idx}`,
            text: msg.type === 'text' ? msg.content : undefined,
            image: msg.type === 'image' ? msg.content : undefined,
            sender: msg.sender_id || 'User',
            timestamp: msg.created_at,
          }));
          setMessages(prev => ({
            ...prev,
            [activeRoom.id]: history,
          }));
        }
        if (data.type === 'message' && data.message) {
          const msgData = data.message;
          const msg: Message = {
            id: msgData.id !== undefined && msgData.id !== null ? String(msgData.id) : `msg-${Date.now()}`,
            text: msgData.type === 'text' ? msgData.content : undefined,
            image: msgData.type === 'image' ? msgData.content : undefined,
            sender: msgData.sender_id || 'User',
            timestamp: msgData.created_at,
          };
          setMessages(prev => ({
            ...prev,
            [activeRoom.id]: [...(prev[activeRoom.id] || []), msg],
          }));
        }
      } catch (err) {
        console.log('WebSocket message parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.log('WebSocket error:', err);
    };

    ws.onclose = () => {
      // Optionally handle close
    };

    wsRef.current = ws;

    // Cleanup on unmount or room change
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [activeRoom]);

  // Show modal to choose chat type
  const createChatRoom = () => {
    setChatTypeModalVisible(true);
  };

  // Actually create chat room via API
  const handleCreateChat = async (type: 'support' | 'private') => {
    setChatTypeModalVisible(false);
    try {
      const accessToken = await getAccessToken();
      console.log('Access Token:', accessToken);
      if (!accessToken) {
        Alert.alert('Authorization Error', 'You must be logged in to create a chat.');
        return;
      }
      const response = await fetch(`${API_BASE}/v1/chats/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'accept': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Chat creation error:', errorData);
        throw new Error(errorData.detail || errorData.message || 'Failed to create chat');
      }
      const data = await response.json();
      const chatName =
        type === 'support'
          ? `Support Ticket ${data.id}`
          : `Chat ${data.id}`;
      const newRoom: ChatRoom = { id: String(data.id), name: chatName };
      setChatRooms([...chatRooms, newRoom]);
      setActiveRoom(newRoom);
      if (!messages[newRoom.id]) {
        setMessages(prev => ({ ...prev, [newRoom.id]: [] }));
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not create chat.');
    }
  };

  const openChatRoom = (room: ChatRoom) => {
    setActiveRoom(room);
    if (!messages[room.id]) {
      setMessages(prev => ({ ...prev, [room.id]: [] }));
    }
  };

  // Add this function to handle leaving the chat and closing the WebSocket
  const leaveActiveRoom = () => {
    // Close the WebSocket connection if open
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setActiveRoom(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !wsRef.current || wsRef.current.readyState !== 1) return;
    setSending(true);

    const accessToken = await getAccessToken();
    if (!accessToken) {
      Alert.alert('Authorization Error', 'You must be logged in to send messages.');
      setSending(false);
      return;
    }

    let sender_id = '';
    try {
      const userData = await AsyncStorage.getItem('worker_app_user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        sender_id = parsed.user_id || '';
      }
    } catch {}

    const payload = {
      action: 'message',
      type: 'text',
      content: input,
    };

    console.log('Sending message via WS:', payload); // <-- Log sent message

    wsRef.current.send(JSON.stringify(payload));

    setInput('');
    setSending(false);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photos to send images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0].base64) {
      const imageUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const msg: Message = {
        id: Date.now().toString(),
        image: imageUri,
        sender: 'You',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => ({
        ...prev,
        [activeRoom!.id]: [...(prev[activeRoom!.id] || []), msg],
      }));
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderChatRoomList = () => (
    <View style={styles.container}>
      <View style={styles.chatHeaderRow}>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleSidebar}>
          <Ionicons name={sidebarVisible ? "close" : "menu"} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle}>Chat Rooms</Text>
        <TouchableOpacity style={styles.chatPlusButton} onPress={createChatRoom}>
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={chatRooms}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatRoom} onPress={() => openChatRoom(item)}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={styles.chatRoomText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingVertical: 10 }}
      />
      <Modal
        visible={chatTypeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChatTypeModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 24,
            width: 280,
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Create Chat</Text>
            <TouchableOpacity
              style={[styles.loginButton, { marginBottom: 10, width: 200 }]}
              onPress={() => handleCreateChat('support')}
            >
              <Ionicons name="help-buoy" size={22} color="white" />
              <Text style={styles.loginButtonText}>Create Support Ticket</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.loginButton, { width: 200 }]}
              onPress={() => handleCreateChat('private')}
            >
              <Ionicons name="person" size={22} color="white" />
              <Text style={styles.loginButtonText}>Create Private Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 16 }}
              onPress={() => setChatTypeModalVisible(false)}
            >
              <Text style={{ color: colors.error, fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
    </View>
  );

  const renderActiveChat = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.chatHeaderRow}>
        <TouchableOpacity style={styles.toggleButton} onPress={leaveActiveRoom}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle}>{activeRoom?.name}</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        ref={flatListRef}
        data={messages[activeRoom!.id] || []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.chatMessageRow}>
            <View style={styles.chatMessageBubble}>
              <View style={styles.chatMessageHeader}>
                <Text style={styles.chatMessageSender}>{item.sender}:</Text>
                <Text style={styles.chatMessageTimestamp}>
                  {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
              </View>
              {item.text ? (
                <Text style={styles.chatMessageText}>{item.text}</Text>
              ) : null}
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.chatMessageImage} />
              ) : null}
            </View>
          </View>
        )}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.chatInputRow}>
        <TouchableOpacity onPress={sendImage} style={{ marginRight: 8 }}>
          <Ionicons name="image" size={28} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.chatInput}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          onSubmitEditing={sendMessage}
          editable={!sending}
        />
        <TouchableOpacity onPress={sendMessage} disabled={sending || !input.trim()}>
          <Ionicons name="send" size={28} color={input.trim() ? colors.primary : colors.text} />
        </TouchableOpacity>
      </View>
      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
    </KeyboardAvoidingView>
  );

  return activeRoom ? renderActiveChat() : renderChatRoomList();
}