import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import { styles, COLORS } from '../../styles';

type ChatRoom = {
  id: string;
  name: string;
};

export default function ChatPage() {
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();

  // "Broadcast" is always present
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([
    { id: '1', name: 'Broadcast' },
  ]);

  const createChatRoom = () => {
    // Add a new chatroom with a unique name
    const newId = (chatRooms.length + 1).toString();
    setChatRooms([...chatRooms, { id: newId, name: `Chat Room ${newId}` }]);
  };

  const openChatRoom = (room: ChatRoom) => {
    Alert.alert('Open Chat', `Open chat room: ${room.name}`);
    // Here you would navigate to the chat room screen
  };

  return (
    <View style={styles.container}>
      {/* Header row with sidebar, title, plus */}
      <View style={styles.chatHeaderRow}>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleSidebar}>
          <Ionicons name={sidebarVisible ? "close" : "menu"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle}>Chat Rooms</Text>
        <TouchableOpacity style={styles.chatPlusButton} onPress={createChatRoom}>
          <Ionicons name="add" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={chatRooms}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatRoom} onPress={() => openChatRoom(item)}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.primary} style={{ marginRight: 10 }} />
            <Text style={styles.chatRoomText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingVertical: 10 }}
      />

      {/* Sidebar */}
      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
    </View>
  );
}