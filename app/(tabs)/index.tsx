import React, { useState, useEffect } from 'react';
import { Text, ScrollView, TouchableOpacity, View, Linking, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { styles, COLORS } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

export type OrderDetails = {
  id: string;
  restaurant: {
    name: string;
    address: string;
    distance: number;
    phoneNumber: string;
  };
  client: {
    name: string;
    address: string;
    distance: number;
    phoneNumber: string;
  };
  items: string[];
  pickedUp: boolean;
  completed?: boolean;
  deliveryTime?: string;
  tipped?: boolean;
  tipAmount?: number;
  deliveryPhoto?: string;
  contactlessDelivery?: boolean;
};

// Add storage key for history
const ORDER_HISTORY_KEY = 'worker_app_order_history';

export default function HomeScreen() {
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();
  const router = useRouter();
  const [currentOrder, setCurrentOrder] = useState<OrderDetails | null>({
    id: "#A1B2C3",
    restaurant: {
      name: "Burger Palace",
      address: "Alfavej 502, Odense",
      distance: 2.3,
      phoneNumber: "+45 12 34 56 78"
    },
    client: {
      name: "John Doe",
      address: "456 Park Avenue, Odense",
      distance: 4.1,
      phoneNumber: "+45 87 65 43 21"
    },
    items: ["Double Cheeseburger", "French Fries", "Large Soda"],
    pickedUp: false,
    contactlessDelivery: true
  });

  const handlePhoneCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const confirmPickup = () => {
    if (currentOrder) {
      setCurrentOrder({
        ...currentOrder,
        pickedUp: true
      });
    }
  };

  const confirmDelivery = async () => {
    if (!currentOrder) return;
    
    try {
      // If contactless delivery, require a photo
      if (currentOrder.contactlessDelivery) {
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            "Camera Permission",
            "We need camera permission to take delivery confirmation photos for contactless deliveries.",
            [{ text: "OK" }]
          );
          return;
        }
        
        // Launch camera
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.5,
          base64: true,
        });
        
        if (result.canceled) {
          Alert.alert(
            "Photo Required",
            "A photo confirmation is required for contactless deliveries.",
            [{ text: "OK" }]
          );
          return;
        }
        
        // Get the base64 string of the photo
        const photoBase64 = result.assets && result.assets[0].base64 
          ? `data:image/jpeg;base64,${result.assets[0].base64}`
          : null;
        
        if (!photoBase64) {
          Alert.alert(
            "Photo Required",
            "Unable to process photo. Please try again.",
            [{ text: "OK" }]
          );
          return;
        }
        
        // Create completed order object with photo
        const completedOrder: OrderDetails = {
          ...currentOrder,
          completed: true,
          deliveryTime: new Date().toISOString(),
          tipped: true,  // For demo
          tipAmount: 25, // For demo
          deliveryPhoto: photoBase64
        };
        
        // Save to history and clear current order
        await saveOrderToHistory(completedOrder);
      } else {
        // For non-contactless delivery - no photo and no additional confirmation needed
        const completedOrder: OrderDetails = {
          ...currentOrder,
          completed: true,
          deliveryTime: new Date().toISOString(),
          tipped: true,  // For demo
          tipAmount: 25  // For demo
        };
        
        // Save to history and clear current order
        await saveOrderToHistory(completedOrder);
      }
    } catch (error) {
      console.error('Error processing delivery:', error);
      Alert.alert(
        "Error",
        "There was a problem saving this delivery. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const saveOrderToHistory = async (completedOrder: OrderDetails) => {
    try {
      const historyString = await AsyncStorage.getItem(ORDER_HISTORY_KEY);
      const history: OrderDetails[] = historyString ? JSON.parse(historyString) : [];
      history.unshift(completedOrder);
      await AsyncStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history));
      setCurrentOrder(null);
    } catch (error) {
      console.error('Error saving to history:', error);
      throw error;
    }
  };

  const navigateToMap = (address: string, type: 'restaurant' | 'client') => {
    router.push({
      pathname: '/map',
      params: { address, type }
    });
  };

  if (!currentOrder) {
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
          
          <View style={styles.centerContent}>
            <Ionicons name="time-outline" size={80} color={COLORS.primary} />
            <Text style={styles.awaitingOrderText}>Awaiting order</Text>
          </View>
        </View>
        <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mainContent}>
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={toggleSidebar}
        >
          <Ionicons name={sidebarVisible ? "close" : "menu"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        {/* Add new chat icon button */}
        <TouchableOpacity 
          style={styles.chatButton}
          onPress={() => Alert.alert("Chat", "Chat functionality coming soon!")}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <Text style={styles.welcomeText}>Orders</Text>
        
        
        <ScrollView style={styles.ordersMainList} contentContainerStyle={styles.ordersContentContainer}>
          {/* Restaurant pickup details */}
          <View style={styles.orderCard}>
            <View style={styles.orderCardHeader}>
              <Ionicons name="restaurant" size={24} color={COLORS.primary} />
              <Text style={styles.orderCardTitle}>Restaurant Pickup</Text>
            </View>
            
            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Restaurant:</Text>
              <Text style={styles.orderDetailValue}>{currentOrder.restaurant.name}</Text>
            </View>
            
            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Order ID:</Text>
              <Text style={styles.orderDetailValue}>{currentOrder.id}</Text>
            </View>
            
            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Address:</Text>
              <TouchableOpacity onPress={() => navigateToMap(currentOrder.restaurant.address, 'restaurant')}>
                <Text style={[styles.orderDetailValue, styles.phoneLink]}>
                  {currentOrder.restaurant.address}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Distance:</Text>
              <Text style={styles.orderDetailValue}>{currentOrder.restaurant.distance} km</Text>
            </View>
            
            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Phone:</Text>
              <TouchableOpacity onPress={() => handlePhoneCall(currentOrder.restaurant.phoneNumber)}>
                <Text style={[styles.orderDetailValue, styles.phoneLink]}>
                  {currentOrder.restaurant.phoneNumber}
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.actionButton,
                currentOrder.pickedUp && styles.disabledButton
              ]}
              onPress={confirmPickup}
              disabled={currentOrder.pickedUp}
            >
              <Ionicons name="checkbox" size={20} color="white" />
              <Text style={styles.actionButtonText}>
                {currentOrder.pickedUp ? "Picked Up ✓" : "Confirm Pickup"}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Client delivery details */}
          <View style={styles.orderCard}>
            <View style={styles.orderCardHeader}>
              <Ionicons name="person" size={24} color={COLORS.primary} />
              <Text style={styles.orderCardTitle}>Client Delivery</Text>
            </View>
            
            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Name:</Text>
              <Text style={styles.orderDetailValue}>{currentOrder.client.name}</Text>
            </View>
            
            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Address:</Text>
              <TouchableOpacity onPress={() => navigateToMap(currentOrder.client.address, 'client')}>
                <Text style={[styles.orderDetailValue, styles.phoneLink]}>
                  {currentOrder.client.address}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Distance:</Text>
              <Text style={styles.orderDetailValue}>{currentOrder.client.distance} km</Text>
            </View>
            
            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Phone:</Text>
              <TouchableOpacity onPress={() => handlePhoneCall(currentOrder.client.phoneNumber)}>
                <Text style={[styles.orderDetailValue, styles.phoneLink]}>
                  {currentOrder.client.phoneNumber}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Delivery Type:</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons 
                  name={currentOrder.contactlessDelivery ? "hand-left-outline" : "people"} 
                  size={18} 
                  color={COLORS.primary} 
                  style={{marginRight: 6}}
                />
                <Text style={styles.orderDetailValue}>
                  {currentOrder.contactlessDelivery ? "Contactless Delivery" : "Regular Delivery"}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.actionButton,
                !currentOrder.pickedUp && styles.disabledButton
              ]}
              onPress={confirmDelivery}
              disabled={!currentOrder.pickedUp}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.actionButtonText}>Confirm Delivery</Text>
            </TouchableOpacity>
          </View>
          
          {/* Order items */}
          <View style={styles.orderCard}>
            <View style={styles.orderCardHeader}>
              <Ionicons name="fast-food" size={24} color={COLORS.primary} />
              <Text style={styles.orderCardTitle}>Order Items</Text>
            </View>
            
            {currentOrder.items.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.orderItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Sidebar Component */}
      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
    </ThemedView>
  );
}