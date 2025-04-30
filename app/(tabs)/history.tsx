import React, { useState, useEffect } from 'react';
import { Text, ScrollView, TouchableOpacity, View, FlatList, Modal, Alert, Image } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { styles, COLORS } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrderDetails } from './index';

const ORDER_HISTORY_KEY = 'worker_app_order_history';

export default function HistoryScreen() {
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();
  const [orderHistory, setOrderHistory] = useState<OrderDetails[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    loadOrderHistory();
  }, []);

  const loadOrderHistory = async () => {
    try {
      const historyString = await AsyncStorage.getItem(ORDER_HISTORY_KEY);
      if (historyString) {
        const history = JSON.parse(historyString);
        setOrderHistory(history);
      }
    } catch (error) {
      console.error('Error loading order history:', error);
    }
  };

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
          onPress={() => Alert.alert("Chat", "Chat functionality coming soon!")}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <Text style={styles.welcomeText}>Order History</Text>
        
        {orderHistory.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="time-outline" size={80} color={COLORS.accent} />
            <Text style={styles.emptyStateText}>No order history</Text>
            <Text style={styles.emptyStateSubtext}>Completed orders will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={orderHistory}
            keyExtractor={(item) => item.id + (item.deliveryTime || '')}
            contentContainerStyle={[styles.ordersContentContainer, { paddingHorizontal: 4 }]} // Add horizontal padding
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.historyOrderCard}
                onPress={() => viewOrderDetails(item)}
              >
                {/* Card header with ID and check icon */}
                <View style={styles.orderCardHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  <Text style={styles.orderCardTitle}>{item.id}</Text>
                </View>
                
                {/* Restaurant info */}
                <View style={styles.historyDetailItem}>
                  <Text style={styles.historyDetailLabel}>Restaurant:</Text>
                  <Text style={styles.historyDetailValue}>{item.restaurant.name}</Text>
                </View>
                
                {/* Delivery time info */}
                <View style={styles.historyDetailItem}>
                  <Text style={styles.historyDetailLabel}>Delivered:</Text>
                  <Text style={styles.historyDetailValue}>
                    {item.deliveryTime ? formatDate(item.deliveryTime) : 'Unknown'}
                  </Text>
                </View>
                
                {/* Tip info */}
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

                {/* Delivery type info */}
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

                {/* Photo thumbnail (if available) */}
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
        
        {/* Order Detail Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1} 
            onPress={() => setIsModalVisible(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
              
              {selectedOrder && (
                <ScrollView>
                  <Text style={styles.modalTitle}>Order Details</Text>
                  
                  <View style={styles.orderDetailSection}>
                    <View style={styles.orderDetailItem}>
                      <Text style={styles.orderDetailLabel}>Order ID:</Text>
                      <Text style={styles.orderDetailValue}>{selectedOrder.id}</Text>
                    </View>
                    <View style={styles.orderDetailItem}>
                      <Text style={styles.orderDetailLabel}>Name:</Text>
                      <Text style={styles.orderDetailValue}>{selectedOrder.restaurant.name}</Text>
                    </View>
                    <View style={styles.orderDetailItem}>
                      <Text style={styles.orderDetailLabel}>Address:</Text>
                      <Text style={styles.orderDetailValue}>{selectedOrder.restaurant.address}</Text>
                    </View>
                    <View style={styles.orderDetailItem}>
                      <Text style={styles.orderDetailLabel}>Phone:</Text>
                      <Text style={styles.orderDetailValue}>{selectedOrder.restaurant.phoneNumber}</Text>
                    </View>
                    <View style={styles.orderDetailItem}>
                      <Text style={styles.orderDetailLabel}>Delivered:</Text>
                      <Text style={styles.orderDetailValue}>
                        {selectedOrder.deliveryTime ? formatDate(selectedOrder.deliveryTime) : 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.orderDetailItem}>
                      <Text style={styles.orderDetailLabel}>Tipped:</Text>
                      <View style={styles.tipContainer}>
                        {selectedOrder.tipped ? (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                            <Text style={styles.tipAmount}>{selectedOrder.tipAmount} kr</Text>
                          </>
                        ) : (
                          <Ionicons name="close-circle" size={20} color={COLORS.error} />
                        )}
                      </View>
                    </View>
                    <View style={styles.orderDetailItem}>
                      <Text style={styles.orderDetailLabel}>Delivery Type:</Text>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons 
                          name={selectedOrder.contactlessDelivery ? "hand-left-outline" : "people"} 
                          size={18} 
                          color={COLORS.primary} 
                          style={{marginRight: 6}}
                        />
                        <Text style={styles.orderDetailValue}>
                          {selectedOrder.contactlessDelivery ? "Contactless Delivery" : "Regular Delivery"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {selectedOrder.contactlessDelivery ? (
                    <View style={styles.orderDetailSection}>
                      <Text style={styles.sectionTitle1}>Delivery Confirmation</Text>
                      {selectedOrder.deliveryPhoto ? (
                        <Image 
                          source={{ uri: selectedOrder.deliveryPhoto }} 
                          style={styles.deliveryPhoto}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.noPhotoContainer}>
                          <Ionicons name="alert-circle" size={40} color={COLORS.error} />
                          <Text style={styles.noPhotoText}>No photo was provided for this contactless delivery</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.orderDetailSection}>
                      <Text style={styles.sectionTitle1}>Delivery Information</Text>
                      <Text style={{color: COLORS.grey, marginTop: 5}}>
                        No photo required for regular deliveries
                      </Text>
                    </View>
                  )}                  
                </ScrollView>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>

      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
    </ThemedView>
  );
}