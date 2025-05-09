import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import { styles, colors } from '../../styles';
import * as ImagePicker from 'expo-image-picker';

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

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([
    { id: '1', name: 'Broadcast' },
  ]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<{ [roomId: string]: Message[] }>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const createChatRoom = () => {
    const newId = (chatRooms.length + 1).toString();
    setChatRooms([...chatRooms, { id: newId, name: `Chat Room ${newId}` }]);
  };

  const openChatRoom = (room: ChatRoom) => {
    setActiveRoom(room);
    if (!messages[room.id]) {
      setMessages(prev => ({ ...prev, [room.id]: [] }));
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && !sending) return;
    setSending(true);
    const msg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'You',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => ({
      ...prev,
      [activeRoom!.id]: [...(prev[activeRoom!.id] || []), msg],
    }));
    setInput('');
    setSending(false);
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
        <TouchableOpacity style={styles.toggleButton} onPress={() => setActiveRoom(null)}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle}>{activeRoom?.name}</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={messages[activeRoom!.id] || []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.chatMessageRow}>
            <Text style={styles.chatMessageSender}>{item.sender}:</Text>
            {item.text ? (
              <Text style={styles.chatMessageText}>{item.text}</Text>
            ) : null}
            {item.image ? (
              <Image source={{ uri: item.image }} style={{ width: 120, height: 90, borderRadius: 8, marginTop: 4 }} />
            ) : null}
          </View>
        )}
        contentContainerStyle={{ padding: 12 }}
        inverted
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