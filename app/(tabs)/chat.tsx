import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, Image, Modal, ScrollView, BackHandler, TouchableWithoutFeedback, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import { styles, colors } from '../../styles';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE, getAccessToken, getPublicImageUrl } from '@/constants/API';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectWebSocket, closeWebSocket } from '@/constants/WebSocketManager';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type ChatRoom = {
  id: string;
  name: string;
  type?: 'support' | 'general' | 'order' | 'delivery'; // Add this line
};

type Message = {
  id: string;
  text?: string;
  image?: string;
  sender: string;
  senderUuid?: string; // <-- add this
  timestamp: string;
  isSender?: boolean; // <-- add this
};

type Colleague = {
  id: number;
  user_uuid: string;
  first_name: string;
  last_name: string;
};

export default function ChatPage() {
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<{ [roomId: string]: Message[] }>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [chatTypeModalVisible, setChatTypeModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [chatModalStep, setChatModalStep] = useState<'selectType' | 'selectColleagues'>('selectType');

  const [userId, setUserId] = useState<string | null>(null);
  const [userUuid, setUserUuid] = useState<string | null>(null);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [selectedColleagues, setSelectedColleagues] = useState<string[]>([]);
  const [chatType, setChatType] = useState<'support' | 'general' | 'order' | 'delivery'>('general');
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [availableCouriers, setAvailableCouriers] = useState<Colleague[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [chatMenuVisible, setChatMenuVisible] = useState(false);

  const fetchAvailableCouriers = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken || !activeRoom) return;
      const response = await fetch(`${API_BASE}/v1/couriers/colleagues/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'accept': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch colleagues');
      const data = await response.json();
      setAvailableCouriers(Array.isArray(data.couriers) ? data.couriers : []);
    } catch (err) {
      setAvailableCouriers([]);
    }
  };

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userData = await AsyncStorage.getItem('worker_app_user_data');
        if (userData) {
          const parsed = JSON.parse(userData);
          setUserId(parsed.user_id || null);
          setUserUuid(parsed.user_uuid || null);
        }
      } catch {}
    };
    fetchUserId();
  }, []);

  const fetchChats = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        Alert.alert('Authorization Error', 'You must be logged in to view chats.');
        return;
      }
      const response = await fetch(`${API_BASE}/v1/chats/`, {
        headers:
         {
          'Authorization': `Bearer ${accessToken}`,
          'accept': '*/*',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      const data = await response.json();
      const chatsArray = Array.isArray(data.chats) ? data.chats : [];
      const rooms: ChatRoom[] = chatsArray.map((chat: any) => ({
        id: String(chat.id),
        type: chat.type || (chat.is_support ? 'support' : 'general'),
        name:
          (chat.type === 'support' || chat.is_support
            ? 'Support Chat'
            : 'General Chat') + ` (${chat.id})`,
      }))
      // Sort by id descending (highest first)
      .sort((a: ChatRoom, b: ChatRoom) => Number(b.id) - Number(a.id));
      setChatRooms(rooms);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not load chats.');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchChats();
    }, [])
  );

  useEffect(() => {
    if (!activeRoom) {
      closeWebSocket();
      return;
    }

    let wsInstance: WebSocket | null = null;

    connectWebSocket(
      (data: any) => {
        try {
          console.log('Received message from WS:', data);

if (data.type === 'history' && Array.isArray(data.messages)) {
  // Log the image fields for each message in history
  data.messages.forEach((msg: any, idx: number) => {
    console.log(
      `History message[${idx}] image:`,
      msg.content?.image,
      msg.content?.images
    );
  });

  const history: Message[] = data.messages.map((msg: any, idx: number) => ({
    id: msg.id !== undefined && msg.id !== null
      ? String(msg.id)
      : `history-${msg.created_at || idx}-${Math.random().toString(36).substr(2, 9)}`,
    text: msg.content?.text,
    image:
      Array.isArray(msg.content?.images) && msg.content.images.length > 0
        ? msg.content.images[0].url
        : msg.content?.image,
    sender:
      (msg.sender_id === userUuid || msg.user_uuid === userUuid)
        ? 'You'
        : (msg.first_name && msg.last_name
            ? `${msg.first_name} ${msg.lastName}`
            : msg.sender_id || msg.user_uuid || 'User'),
    senderUuid: msg.sender_id || msg.user_uuid,
    timestamp: msg.created_at,
    isSender: msg.isSender !== undefined
      ? msg.isSender
      : (msg.sender_id === userUuid || msg.user_uuid === userUuid),
  }));
  setMessages((prev) => ({
    ...prev,
    [activeRoom.id]: history,
  }));
}

if (data.type === 'message' && data.message) {
  const msgData = data.message;
  // Log the image field received from backend
  console.log('Received image in message:', msgData.content?.image, msgData.content?.images);

  const msg: Message = {
    id:
      msgData.id !== undefined && msgData.id !== null
        ? String(msgData.id)
        : `msg-${msgData.created_at || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: msgData.content?.text,
    image:
      msgData.content?.image ||
      (Array.isArray(msgData.content?.images) && msgData.content.images.length > 0
        ? msgData.content.images[0].url
        : undefined),
    sender:
      (msgData.sender_id === userUuid || msgData.user_uuid === userUuid)
        ? 'You'
        : (msgData.first_name && msgData.last_name
            ? `${msgData.first_name} ${msgData.lastName}`
            : msgData.sender_id || msgData.user_uuid || 'User'),
    senderUuid: msgData.sender_id || msgData.user_uuid,
    timestamp: msgData.created_at,
    isSender: msgData.isSender,
  };
  setMessages((prev) => ({
    ...prev,
    [activeRoom.id]: [...(prev[activeRoom.id] || []), msg],
  }));
}
        } catch (err) {
          console.log('WebSocket message parse error:', err);
        }
      },
      () => {},
      (err) => {
        console.log('WebSocket error:', err);
      },
      activeRoom.id
    ).then(ws => {
      wsInstance = ws;
    });

    return () => {
      closeWebSocket();
    };
  }, [activeRoom, userUuid]);

  const fetchColleagues = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      const response = await fetch(`${API_BASE}/v1/couriers/colleagues/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'accept': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch colleagues');
      const data = await response.json();
      setColleagues(Array.isArray(data.couriers) ? data.couriers : []);
    } catch (err) {
      setColleagues([]);
    }
  };

  // Change handleCreateChat to accept a type
  const handleCreateChat = async (typeOverride?: 'support' | 'general' | 'order' | 'delivery') => {
    setChatTypeModalVisible(false);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        Alert.alert('Authorization Error', 'You must be logged in to create a chat.');
        return;
      }

      // Use the override if provided, otherwise fall back to state
      const type = typeOverride || chatType;

      // Only require colleagues for general chat, not support chat
      if (type === 'general' && selectedColleagues.length === 0) {
        Alert.alert('Select at least one colleague');
        return;
      }

      let endpoint = `${API_BASE}/v1/chats/`;
      let payload: any = {};

      if (type === 'support') {
        endpoint = `${API_BASE}/v1/chats/support/`;
        payload = {};
      } else {
        payload = {
          type: type,
          participants: selectedColleagues.map(uuid => ({
            user_id: uuid,
            user_role: 'courier'
          }))
        };
      }

      // Log what is being sent
      console.log('Creating chat. Endpoint:', endpoint);
      console.log('Payload:', payload);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers:
         {
          'Authorization': `Bearer ${accessToken}`,
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Log what is received
      let responseBody = null;
      try {
        responseBody = await response.json();
      } catch (e) {
        responseBody = await response.text();
      }
      console.log('Create chat response:', response.status, responseBody);

      if (!response.ok) {
        throw new Error(
          (responseBody && (responseBody.detail || responseBody.message)) ||
          'Failed to create chat'
        );
      }
      await fetchChats();
      setSelectedColleagues([]);
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

  const leaveActiveRoom = () => {
    closeWebSocket();
    setActiveRoom(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);

    const accessToken = await getAccessToken();
    if (!accessToken) {
      Alert.alert('Authorization Error', 'You must be logged in to send messages.');
      setSending(false);
      return;
    }

    const payload = {
      action: 'message',
      content: {
        text: input.trim(),
      },
    };

    console.log('Sending message via WebSocket:', JSON.stringify(payload));

    const ws = require('@/constants/WebSocketManager').getWebSocket();
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(payload));
    } else {
      Alert.alert('WebSocket Error', 'WebSocket is not connected.');
    }

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
      base64: false,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      const imageUri = result.assets[0].uri;
      const filename = imageUri.split('/').pop() || 'image.jpg';

      const uploadResult = await uploadImage(imageUri, filename);
      console.log('Upload image endpoint returned:', uploadResult);

      // Only send if backend returned a valid URL
      const uploadedUrl = uploadResult?.images?.[0]?.url;
      if (!uploadedUrl) {
        Alert.alert('Upload failed', 'Could not upload image. Please try again.');
        return;
      }
      console.log('Sending image URL:', uploadedUrl);

      const payload = {
        action: 'message',
        content: {
          images: [
            {
              url: uploadedUrl,
            },
          ],
        },
      };
      console.log('Sending image message via WebSocket:', JSON.stringify(payload));
      const ws = require('@/constants/WebSocketManager').getWebSocket();
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify(payload));
      } else {
        Alert.alert('WebSocket Error', 'WebSocket is not connected.');
      }
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const uploadImage = async (imageUri: string, filename: string) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      Alert.alert('Authorization Error', 'You must be logged in to upload images.');
      return;
    }

    const formData = new FormData();
    formData.append('images', {
      uri: imageUri,
      name: filename,
      type: 'image/jpeg', // or 'image/png', etc. You can detect this from the file extension if needed
    } as any);

    const response = await fetch(`${API_BASE}/v1/chats/upload-images/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const data = await response.json();
    console.log('Upload image endpoint returned:', data); // <-- Add this line
    return data;
  };

  const renderChatRoomList = () => (
    <View style={styles.container}>
      <View style={styles.chatHeaderRow}>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleSidebar}>
          <Ionicons name={sidebarVisible ? "close" : "menu"} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle}>Chat Rooms</Text>
        <TouchableOpacity style={styles.chatPlusButton} onPress={() => createChatRoom()}>
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
        onRequestClose={() => {
          setChatTypeModalVisible(false);
          setChatModalStep('selectType');
          setSelectedColleagues([]);
        }}
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
            width: 320,
            alignItems: 'center'
          }}>
            {chatModalStep === 'selectType' && (
              <>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Create Chat</Text>
                <TouchableOpacity
                  style={[styles.loginButton, { marginBottom: 10, width: 200 }]}
                  onPress={() => createChatRoom('support')}
                >
                  <Ionicons name="help-buoy" size={22} color="white" />
                  <Text style={styles.loginButtonText}>Create Support Ticket</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.loginButton, { width: 200 }]}
                  onPress={() => {
                    setChatType('general');
                    setChatModalStep('selectColleagues');
                    fetchColleagues();
                  }}
                >
                  <Ionicons name="chatbubbles" size={22} color="white" />
                  <Text style={styles.loginButtonText}>Create General Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginTop: 16 }}
                  onPress={() => {
                    setChatTypeModalVisible(false);
                    setChatModalStep('selectType');
                    setSelectedColleagues([]);
                  }}
                >
                  <Text style={{ color: colors.error, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
            {chatModalStep === 'selectColleagues' && (
              <>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Select colleagues:</Text>
                <ScrollView style={{ maxHeight: 180, width: '100%' }}>
                  {colleagues.map((col) => (
                    <TouchableOpacity
                      key={col.user_uuid}
                      style={[
                        styles.participantRow,
                        selectedColleagues.includes(col.user_uuid) && styles.participantRowSelected,
                        { width: 200, alignSelf: 'center' } // Match Add to Chat button width
                      ]}
                      onPress={() => toggleColleague(col.user_uuid)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={selectedColleagues.includes(col.user_uuid) ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={selectedColleagues.includes(col.user_uuid) ? 'white' : colors.primary}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[
                        styles.participantName,
                        selectedColleagues.includes(col.user_uuid) && styles.participantNameSelected
                      ]}>
                        {col.first_name} {col.last_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.loginButton, { marginTop: 12, width: 200, backgroundColor: colors.primary }]}
                  onPress={() => handleCreateChat('general')}
                >
                  <Ionicons name="chatbubble-ellipses" size={22} color="white" />
                  <Text style={styles.loginButtonText}>Create Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginTop: 16 }}
                  onPress={() => {
                    setChatModalStep('selectType');
                    setSelectedColleagues([]);
                  }}
                >
                  <Text style={{ color: colors.error, fontWeight: 'bold' }}>Back</Text>
                </TouchableOpacity>
              </>
            )}
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
          <TouchableOpacity
            style={styles.chatPlusButton}
            onPress={() => setChatMenuVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={28} color={colors.primary} />
          </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages[activeRoom!.id] || []}
        keyExtractor={(item) => item.id}
renderItem={({ item }) => {
  const isMine = typeof item.isSender === 'boolean'
    ? item.isSender
    : item.senderUuid === userUuid;
  return (
    <View
      style={[
        styles.chatMessageRow,
        isMine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
      ]}
    >
      <View
        style={[
          styles.chatMessageBubble,
          isMine
            ? { backgroundColor: colors.primary, alignSelf: 'flex-end' }
            : { backgroundColor: colors.backgroundLight, alignSelf: 'flex-start' },
        ]}
      >
        <View style={styles.chatMessageHeader}>
          <Text
            style={[
              styles.chatMessageSender,
              isMine ? { color: colors.white } : {},
            ]}
          >
            {isMine ? 'You' : item.sender}:
          </Text>
          <Text
            style={[
              styles.chatMessageTimestamp,
              isMine ? { color: colors.white } : {},
            ]}
          >
            {item.timestamp
              ? new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </Text>
        </View>
        {item.text ? (
          <Text
            style={[
              styles.chatMessageText,
              isMine ? { color: colors.white } : {},
            ]}
          >
            {item.text}
          </Text>
        ) : null}
        {item.image ? (
          <TouchableOpacity onPress={() => setEnlargedImage(getPublicImageUrl(item.image))}>
            <Image
              source={{ uri: getPublicImageUrl(item.image) }}
              style={styles.chatMessageImage}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}}
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
      <Modal
        visible={addUserModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setAddUserModalVisible(false);
          setSelectedToAdd([]);
        }}
      >
        <TouchableWithoutFeedback onPress={() => {
          setAddUserModalVisible(false);
          setSelectedToAdd([]);
        }}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <TouchableWithoutFeedback onPress={() => { /* prevent modal close when clicking inside */ }}>
              <View style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 24,
                width: 340,
                alignItems: 'center'
              }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Add participants:</Text>
                <ScrollView style={{ maxHeight: 220, width: '100%' }}>
                  {availableCouriers.map((col) => {
                    const selected = selectedToAdd.includes(col.user_uuid);
                    return (
                      <TouchableOpacity
                        key={col.user_uuid}
                        style={[
                          styles.participantRow,
                          selected && styles.participantRowSelected,
                          { width: 220, alignSelf: 'center' } // Match Add to Chat button width
                        ]}
                        onPress={() => setSelectedToAdd(prev =>
                          prev.includes(col.user_uuid)
                            ? prev.filter(id => id !== col.user_uuid)
                            : [...prev, col.user_uuid]
                        )}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={selected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={selected ? 'white' : colors.primary}
                          style={{ marginRight: 12 }}
                        />
                        <Text style={[
                          styles.participantName,
                          selected && styles.participantNameSelected
                        ]}>
                          {col.first_name} {col.last_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.loginButton, { marginTop: 16, width: 220, backgroundColor: colors.primary }]}
                  onPress={handleAddParticipants}
                  disabled={selectedToAdd.length === 0}
                >
                  <Ionicons name="person-add" size={22} color="white" />
                  <Text style={styles.loginButtonText}>Add to Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginTop: 16 }}
                  onPress={() => {
                    setAddUserModalVisible(false);
                    setSelectedToAdd([]);
                  }}
                >
                  <Text style={{ color: colors.error, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal visible={!!enlargedImage} transparent animationType="fade" onRequestClose={() => setEnlargedImage(null)}>
  <TouchableWithoutFeedback onPress={() => setEnlargedImage(null)}>
    <View style={{
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {enlargedImage && (
        <Image
          source={{ uri: enlargedImage }}
          style={{ width: '90%', height: '70%', resizeMode: 'contain' }}
        />
      )}
    </View>
  </TouchableWithoutFeedback>
</Modal>
      <Modal
        visible={chatMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChatMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setChatMenuVisible(false)}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <TouchableWithoutFeedback>
              <View style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 24,
                width: 240,
                alignItems: 'center'
              }}>
                <TouchableOpacity
                  style={[styles.loginButton, { width: '100%', marginBottom: 10 }]}
                  onPress={() => {
                    setChatMenuVisible(false);
                    setAddUserModalVisible(true);
                  }}
                >
                  <Ionicons name="person-add" size={22} color="white" />
                  <Text style={styles.loginButtonText}>Add person to chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.loginButton, { width: '100%' }]}
                  onPress={() => {
                    setChatMenuVisible(false);
                    exportChatAsPDF();
                  }}
                >
                  <Ionicons name="download" size={22} color="white" />
                  <Text style={styles.loginButtonText}>Export chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginTop: 16 }}
                  onPress={() => setChatMenuVisible(false)}
                >
                  <Text style={{ color: colors.error, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
    </KeyboardAvoidingView>
  );

// Function to add selected participants to the current chat
const handleAddParticipants = async () => {
  if (!activeRoom) return;
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      Alert.alert('Authorization Error', 'You must be logged in to add participants.');
      return;
    }
    const participants = selectedToAdd.map(uuid => ({
      user_id: uuid,
      user_role: 'courier'
    }));
    const payload = { participants };
    console.log('Sending to backend:', JSON.stringify(payload));
    const response = await fetch(`${API_BASE}/v1/chats/${activeRoom.id}/participants`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    let responseBody = null;
    try {
      responseBody = await response.json();
    } catch (e) {
      responseBody = await response.text();
    }
    console.log('Backend response:', response.status, responseBody);
    if (!response.ok) {
      throw new Error(
        (responseBody && (responseBody.detail || responseBody.message)) ||
        'Failed to add participants'
      );
    }
    setAddUserModalVisible(false);
    setSelectedToAdd([]);
    Alert.alert('Success', 'Participants added!');
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Could not add participants.');
  }
};

  // Handle Android back button to go back to chat list instead of home
  useEffect(() => {
    const onBackPress = () => {
      if (activeRoom) {
        setActiveRoom(null);
        return true; // Prevent default behavior (going back to index)
      }
      return false; // Allow default behavior
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    };
  }, [activeRoom]);

  // Export chat as PDF (move inside component to access state)
const exportChatAsPDF = async () => {
  console.log('Export chat as PDF started');
  try {
    const chatMsgs = messages[activeRoom!.id] || [];
    let html = `<h1>Chat Export</h1>`;

    for (const msg of chatMsgs) {
      let imageHtml = '';
      if (msg.image) {
        if (msg.image.startsWith('file://')) {
          try {
            const base64 = await FileSystem.readAsStringAsync(msg.image, { encoding: FileSystem.EncodingType.Base64 });
            imageHtml = `<br/><img src="data:image/jpeg;base64,${base64}" width="200"/>`;
          } catch (e) {
            console.log('Failed to read image for export:', msg.image, e);
            imageHtml = `<br/><i>[Image could not be exported]</i>`;
          }
        } else {
          imageHtml = `<br/><img src="${msg.image}" width="200"/>`;
        }
      }
      html += `<div><b>${msg.sender}:</b> ${msg.text || ''}${imageHtml}<br/><small>${msg.timestamp}</small></div><hr/>`;
    }
    console.log('Generated HTML for PDF:', html);

    // Format date as DD-MM-YYYY (not American, 4-digit year)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    const dateStr = `${day}-${month}-${year}`;
    const chatId = activeRoom?.id || 'chat';
    const fileName = `ChatExport${chatId}_${dateStr}.pdf`;

    const { uri } = await Print.printToFileAsync({ html });
    console.log('PDF file generated at URI:', uri);

    if (Platform.OS === 'android') {
      console.log('Requesting directory permissions for Android');
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      console.log('Directory permissions result:', permissions);
      if (permissions.granted) {
        const baseUri = permissions.directoryUri;
        console.log('Creating file in selected directory:', baseUri, fileName);
        const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
          baseUri,
          fileName,
          'application/pdf'
        );
        console.log('New file URI:', newUri);

        // Read the PDF as a base64 string
        const pdfBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        // Write the base64 string to the content URI
        await FileSystem.StorageAccessFramework.writeAsStringAsync(newUri, pdfBase64, { encoding: FileSystem.EncodingType.Base64 });
        console.log('File written to new URI');
        Alert.alert('Chat exported', `Chat was exported as "${fileName}" to the selected folder.`);
        return;
      }
    }

    // Fallback: share as before
    console.log('Sharing PDF file:', uri);
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (err: any) {
    console.log('Export chat as PDF failed:', err);
    Alert.alert('Export failed', err?.message || 'Could not export chat.');
  }
};

// Add this inside ChatPage, above return
const createChatRoom = (type?: 'support' | 'general' | 'order' | 'delivery') => {
  setChatTypeModalVisible(true);
  if (type === 'general') {
    setChatType('general');
    setChatModalStep('selectColleagues');
    fetchColleagues();
  } else if (type === 'support') {
    setChatType('support');
    setChatModalStep('selectType');
    handleCreateChat('support'); // Pass type here!
    setChatTypeModalVisible(false);
  } else {
    setChatModalStep('selectType');
  }
};

// Toggle colleague selection for general chat
const toggleColleague = (uuid: string) => {
  setSelectedColleagues(prev =>
    prev.includes(uuid)
      ? prev.filter(id => id !== uuid)
      : [...prev, uuid]
  );
};

  return activeRoom ? renderActiveChat() : renderChatRoomList();
}