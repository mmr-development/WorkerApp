import React, { useState, useEffect, useCallback } from 'react';
import { Text, ScrollView, TouchableOpacity, View, FlatList, Modal, Alert, Image, RefreshControl } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { styles, COLORS } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrderDetails } from './index';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

const ORDER_HISTORY_KEY = 'worker_app_order_history';

export default function HistoryScreen() {
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();
  const [orderHistory, setOrderHistory] = useState<OrderDetails[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load order history when component first mounts
  useEffect(() => {
    loadOrderHistory();
  }, []);

  // Reload history every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadOrderHistory();
      return () => {}; // cleanup function
    }, [])
  );

  const loadOrderHistory = async () => {
    try {
      const historyString = await AsyncStorage.getItem(ORDER_HISTORY_KEY);
      if (historyString) {
        const history = JSON.parse(historyString);
        setOrderHistory(history);
      } else {
        setOrderHistory([]);
      }
    } catch (error) {
      console.error('Error loading order history:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrderHistory();
    setRefreshing(false);
  }, []);

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${hours}:${minutes}, ${day}.${month}.${year}`;
  };

  const viewOrderDetails = (order: OrderDetails) => {
    setSelectedOrder(order);
    setIsModalVisible(true);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mainContent}>
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={toggleSidebar}
        >
          <Ionicons name={sidebarVisible ? "close" : "menu"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.chatButton}
          onPress={() => router.push('/chat')}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <Text style={styles.welcomeText}>Order History</Text>
        
        {orderHistory.length === 0 ? (
          <ScrollView 
            contentContainerStyle={styles.emptyStateContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <Ionicons name="time-outline" size={80} color={COLORS.accent} />
            <Text style={styles.emptyStateText}>No order history</Text>
            <Text style={styles.emptyStateSubtext}>Completed orders will appear here</Text>
            <Text style={styles.emptyStateSubtext}>Pull down to refresh</Text>
          </ScrollView>
        ) : (
          <FlatList
            data={orderHistory}
            keyExtractor={(item) => item.id + (item.deliveryTime || '')}
            contentContainerStyle={[styles.ordersContentContainer, { paddingHorizontal: 4 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.historyOrderCard}
                onPress={() => viewOrderDetails(item)}
              >
                {/* Card content remains the same */}
                <View style={styles.orderCardHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  <Text style={styles.orderCardTitle}>{item.id}</Text>
                </View>
                
                <View style={styles.historyDetailItem}>
                  <Text style={styles.historyDetailLabel}>Restaurant:</Text>
                  <Text style={styles.historyDetailValue}>{item.restaurant.name}</Text>
                </View>
                
                <View style={styles.historyDetailItem}>
                  <Text style={styles.historyDetailLabel}>Delivered:</Text>
                  <Text style={styles.historyDetailValue}>
                    {item.deliveryTime ? formatDate(item.deliveryTime) : 'Unknown'}
                  </Text>
                </View>
                
                <View style={styles.historyDetailItem}>
                  <Text style={styles.historyDetailLabel}>Tipped:</Text>
                  <View style={styles.tipContainer}>
                    {item.tipped ? (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                        <Text style={styles.tipAmount}>{item.tipAmount} kr</Text>
                      </>
                    ) : (
                      <Ionicons name="close-circle" size={20} color={COLORS.error} />
                    )}
                  </View>
                </View>

                <View style={styles.historyDetailItem}>
                  <Text style={styles.historyDetailLabel}>Delivery Type:</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons 
                      name={item.contactlessDelivery ? "hand-left-outline" : "people"} 
                      size={18} 
                      color={COLORS.primary} 
                      style={{marginRight: 6}}
                    />
                    <Text style={styles.historyDetailValue}>
                      {item.contactlessDelivery ? "Contactless" : "Regular"}
                    </Text>
                  </View>
                </View>

                {item.deliveryPhoto && (
                  <View style={styles.photoThumbnailContainer}>
                    <Image 
                      source={{ uri: item.deliveryPhoto }} 
                      style={styles.photoThumbnail} 
                      resizeMode="cover"
                    />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
        </Modal>
      </View>

      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
    </ThemedView>
  );
}