import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, ScrollView, TouchableOpacity, View, Linking, Alert, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { styles, colors } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { API_BASE } from '@/constants/API';

export type OrderDetails = {
  id: string;
  restaurant: {
    name: string;
    address: string;
    phoneNumber: string;
  };
  client: {
    name: string;
    address: string;
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
const USER_DATA_KEY = 'worker_app_user_data'; // Add this if not already present

// Add a geocoding cache object outside component
const geocodeCache: Record<string, { latitude: number; longitude: number }> = {};

export default function HomeScreen() {
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();
  const router = useRouter();
  const [currentOrder, setCurrentOrder] = useState<OrderDetails | null>(null);

  const [workerLocation, setWorkerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [restaurantCoords, setRestaurantCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [clientCoords, setClientCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distances, setDistances] = useState<{ toRestaurant: number | null; toClient: number | null }>({ toRestaurant: null, toClient: null });
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Check login status on mount and redirect if not logged in
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const savedUserData = await AsyncStorage.getItem(USER_DATA_KEY);
        if (!savedUserData) {
          router.replace('/settings');
          return;
        }
        const parsedData = JSON.parse(savedUserData);
        if (!parsedData.isLoggedIn) {
          router.replace('/settings');
        }
      } catch (error) {
        router.replace('/settings');
      }
    };
    checkLogin();
  }, [router]);

  // Request permission only once when component mounts
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionGranted(status === 'granted');
      
      if (status === 'granted') {
        // Set up a location subscription for faster updates
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced, // Use balanced accuracy (faster)
            distanceInterval: 10, // Update every 10 meters
            timeInterval: 5000 // Or every 5 seconds
          },
          (location) => {
            setWorkerLocation(location.coords);
          }
        );
        
        // Clean up subscription when component unmounts
        return () => {
          subscription.remove();
        };
      }
    })();
  }, []);

  // Geocode function with caching
  const geocodeAddress = useCallback(async (address: string) => {
    if (!address || address === 'string') return null;
    if (geocodeCache[address]) {
      return geocodeCache[address];
    }
    try {
      const [result] = await Location.geocodeAsync(address);
      if (result) {
        geocodeCache[address] = { 
          latitude: result.latitude, 
          longitude: result.longitude 
        };
        return geocodeCache[address];
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  }, []);

  const sendStatusUpdate = (deliveryId: string, newStatus: string, photoBase64?: string) => {
  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
    const payload: any = {
      type: 'status_update',
      delivery_id: deliveryId,
      status: newStatus,
    };
    if (photoBase64) {
      payload.photo = photoBase64;
    }
    wsRef.current.send(JSON.stringify(payload));
  }
};
  // Update distances when locations change
  useEffect(() => {
    const updateDistances = async () => {
      if (!currentOrder || !workerLocation) return;
      
      try {
        // Geocode both addresses in parallel for speed
        const [restaurantLocation, clientLocation] = await Promise.all([
          geocodeAddress(currentOrder.restaurant.address),
          geocodeAddress(currentOrder.client.address)
        ]);
        
        if (restaurantLocation) {
          setRestaurantCoords(restaurantLocation);
          const toRestaurant = getDistance(
            workerLocation.latitude,
            workerLocation.longitude,
            restaurantLocation.latitude,
            restaurantLocation.longitude
          );
          setDistances(prev => ({ ...prev, toRestaurant }));
        }
        
        if (restaurantLocation && clientLocation) {
          setClientCoords(clientLocation);
          const toClient = getDistance(
            restaurantLocation.latitude,
            restaurantLocation.longitude,
            clientLocation.latitude,
            clientLocation.longitude
          );
          setDistances(prev => ({ ...prev, toClient }));
        }
      } catch (error) {
        console.error('Error updating distances:', error);
      }
    };
    
    updateDistances();
  }, [currentOrder, workerLocation, geocodeAddress]);

  // Haversine formula for distance in km
  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // round to 1 decimal
  }

  const handlePhoneCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

const confirmPickup = () => {
  if (currentOrder) {
    setCurrentOrder({
      ...currentOrder,
      pickedUp: true
    });
    sendStatusUpdate(currentOrder.id, 'picked_up');
    // Send in_transit status after picked_up
    setTimeout(() => {
      sendStatusUpdate(currentOrder.id, 'in_transit');
    }, 500);
  }
};

  const confirmDelivery = async () => {
    if (!currentOrder) return;

    try {
      let photoBase64: string | undefined = undefined;

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

        photoBase64 = result.assets && result.assets[0].base64 
          ? `data:image/jpeg;base64,${result.assets[0].base64}`
          : undefined;

        if (!photoBase64) {
          Alert.alert(
            "Photo Required",
            "Unable to process photo. Please try again.",
            [{ text: "OK" }]
          );
          return;
        }
      }

      // Send status update via WebSocket (with photo if contactless)
      sendStatusUpdate(currentOrder.id, 'delivered', photoBase64);

      // Save to history and clear current order
      const completedOrder: OrderDetails = {
        ...currentOrder,
        completed: true,
        deliveryTime: new Date().toISOString(),
        tipped: true,  // For demo
        tipAmount: 25, // For demo
        ...(photoBase64 ? { deliveryPhoto: photoBase64 } : {})
      };
      await saveOrderToHistory(completedOrder);

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
  let coords = null;
  if (type === 'restaurant' && restaurantCoords) {
    coords = restaurantCoords;
  } else if (type === 'client' && clientCoords) {
    coords = clientCoords;
  }
  router.push({
    pathname: '/map',
    params: {
      address,
      type,
      // Swap order: longitude first, then latitude
      longitude: coords ? coords.longitude.toString() : undefined,
      latitude: coords ? coords.latitude.toString() : undefined,
    }
  });
};

  // WebSocket connection for real-time order assignment
  useEffect(() => {
    // Convert API_BASE to ws:// or wss://
    const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws/courier/delivery';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      // Optionally send auth token if backend requires it
      const token = await AsyncStorage.getItem('worker_app_access_token');
      if (token) {
        ws.send(JSON.stringify({ type: 'authorization', token }));
      }
    };

    ws.onmessage = async (event) => {
      console.log('WebSocket message:', event.data);
      try {
        const data = JSON.parse(event.data);

        // Handle delivery_assigned
        if (data.type === 'delivery_assigned' && data.payload?.deliveries?.length) {
          const delivery = data.payload.deliveries[0];
          const order: OrderDetails = {
            id: delivery.id.toString(),
            restaurant: {
              name: delivery.pickup?.name || '',
              address: [
                delivery.pickup?.street,
                delivery.pickup?.address,
                delivery.pickup?.postal_code,
                delivery.pickup?.city,
                delivery.pickup?.country
              ].filter(Boolean).join(', '),
              phoneNumber: delivery.pickup?.phone || '',
            },
            client: {
              name: delivery.delivery?.customer_name || '',
              address: [
                delivery.delivery?.address,
                delivery.delivery?.postal_code,
                delivery.delivery?.city,
                delivery.delivery?.country
              ].filter(Boolean).join(', '),
              phoneNumber: delivery.delivery?.phone || '',
            },
            items: (delivery.order?.items || []).map((item: any) =>
              `${item.quantity}x ${item.item_name}${item.note && item.note !== 'string' ? ` (${item.note})` : ''}`
            ),
            pickedUp: delivery.status === 'picked_up',
            completed: delivery.status === 'delivered',
            deliveryTime: delivery.estimated_delivery_time,
            contactlessDelivery: false,
          };
          setCurrentOrder(order);
        }

        // Handle current_deliveries (NEW)
        if (data.type === 'current_deliveries' && data.payload?.deliveries?.length) {
          const delivery = data.payload.deliveries[0];
          const order: OrderDetails = {
            id: delivery.id.toString(),
            restaurant: {
              name: delivery.pickup?.name || '',
              address: [
                delivery.pickup?.street,
                delivery.pickup?.address,
                delivery.pickup?.postal_code,
                delivery.pickup?.city,
                delivery.pickup?.country
              ].filter(Boolean).join(', '),
              phoneNumber: delivery.pickup?.phone || '',
            },
            client: {
              name: delivery.delivery?.customer_name || '',
              address: [
                delivery.delivery?.address,
                delivery.delivery?.postal_code,
                delivery.delivery?.city,
                delivery.delivery?.country
              ].filter(Boolean).join(', '),
              phoneNumber: delivery.delivery?.phone || '',
            },
            items: (delivery.order?.items || []).map((item: any) =>
              `${item.quantity}x ${item.item_name}${item.note && item.note !== 'string' ? ` (${item.note})` : ''}`
            ),
            pickedUp: delivery.status === 'picked_up',
            completed: delivery.status === 'delivered',
            deliveryTime: delivery.estimated_delivery_time,
            contactlessDelivery: false,
          };
          setCurrentOrder(order);
        }

        // Handle location_request
        if (data.type === 'location_request') {
          if (workerLocation) {
            ws.send(JSON.stringify({
              type: 'location_response',
              payload: {
                latitude: workerLocation.latitude,
                longitude: workerLocation.longitude,
                timestamp: new Date().toISOString(),
                request_id: data.payload?.request_id,
              }
            }));
          }
        }

        // Handle order cancellation (status: 'canceled')
    if (
      (data.type === 'delivery_assigned' || data.type === 'current_deliveries') &&
      data.payload?.deliveries?.length
    ) {
      const delivery = data.payload.deliveries[0];
      if (delivery.status === 'canceled' && currentOrder && delivery.id.toString() === currentOrder.id) {
        setCurrentOrder(null);
        Alert.alert(
          "Order Cancelled",
          "The current order has been cancelled.",
          [{ text: "OK" }]
        );
        return; // Don't process as a new order
      }
      const order: OrderDetails = {
        id: delivery.id.toString(),
        restaurant: {
          name: delivery.pickup?.name || '',
          address: [
            delivery.pickup?.street,
            delivery.pickup?.address,
            delivery.pickup?.postal_code,
            delivery.pickup?.city,
            delivery.pickup?.country
          ].filter(Boolean).join(', '),
          phoneNumber: delivery.pickup?.phone || '',
        },
        client: {
          name: delivery.delivery?.customer_name || '',
          address: [
            delivery.delivery?.address,
            delivery.delivery?.postal_code,
            delivery.delivery?.city,
            delivery.delivery?.country
          ].filter(Boolean).join(', '),
          phoneNumber: delivery.delivery?.phone || '',
        },
        items: (delivery.order?.items || []).map((item: any) =>
          `${item.quantity}x ${item.item_name}${item.note && item.note !== 'string' ? ` (${item.note})` : ''}`
        ),
        pickedUp: delivery.status === 'picked_up',
        completed: delivery.status === 'delivered',
        deliveryTime: delivery.estimated_delivery_time,
        contactlessDelivery: false,
      };
      setCurrentOrder(order);
    }

    // Optionally, handle a dedicated cancellation event if your backend sends one:
    if (
      (data.type === 'order_cancelled' || data.type === 'delivery_cancelled') &&
      data.payload?.delivery_id &&
      currentOrder &&
      data.payload.delivery_id.toString() === currentOrder.id
    ) {
      setCurrentOrder(null);
      Alert.alert(
        "Order Cancelled",
        "The current order has been cancelled.",
        [{ text: "OK" }]
      );
    }

      } catch (err) {
        console.log('WebSocket message parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.log('WebSocket error:', err);
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [workerLocation]);

  // Check check-in status on mount (optional, if you want to persist it)
  useEffect(() => {
    const fetchCheckInStatus = async () => {
      const status = await AsyncStorage.getItem('worker_app_checked_in');
      setIsCheckedIn(status === 'true');
    };
    fetchCheckInStatus();
  }, []);

  // "Start Shift" handler
  const handleStartShift = async () => {
    setCheckingIn(true);
    try {
      // Send check-in status to backend (adjust endpoint as needed)
      const token = await AsyncStorage.getItem('worker_app_access_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${API_BASE}/courier/checkin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ checked_in: true }),
      });
      setIsCheckedIn(true);
      await AsyncStorage.setItem('worker_app_checked_in', 'true');
      // Optionally notify backend via WebSocket
      wsRef.current?.send(JSON.stringify({ type: 'checked_in', payload: { checked_in: true } }));
    } catch (err) {
      Alert.alert('Error', 'Failed to check in. Try again.');
    }
    setCheckingIn(false);
  };

  if (!isCheckedIn) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="log-in-outline" size={80} color={colors.primary} />
          <Text style={styles.awaitingOrderText}>You are not checked in</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleStartShift}
            disabled={checkingIn}
          >
            {checkingIn ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="white" />
                <Text style={styles.actionButtonText}>Start Shift</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
      </ThemedView>
    );
  }

  if (!currentOrder) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.mainContent}>
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={toggleSidebar}
          >
            <Ionicons name={sidebarVisible ? "close" : "menu"} size={24} color={colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity 
          style={styles.chatButton}
          onPress={() => router.push('/chat')}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={colors.primary} />
        </TouchableOpacity>
          
          <View style={styles.centerContent}>
            <Ionicons name="time-outline" size={80} color={colors.primary} />
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
          <Ionicons name={sidebarVisible ? "close" : "menu"} size={24} color={colors.text} />
        </TouchableOpacity>
        
        {/* Add new chat icon button */}
        <TouchableOpacity 
          style={styles.chatButton}
          onPress={() => router.push('/chat')}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <Text style={styles.welcomeText}>Orders</Text>
        
        
        <ScrollView style={styles.ordersMainList} contentContainerStyle={styles.ordersContentContainer}>
          {/* Restaurant pickup details */}
          <View style={styles.orderCard}>
            <View style={styles.orderCardHeader}>
              <Ionicons name="restaurant" size={24} color={colors.primary} />
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
              <Text style={styles.orderDetailValue}>
                {distances.toRestaurant !== null ? `${distances.toRestaurant} km` : '...'}
              </Text>
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
              <Ionicons name="person" size={24} color={colors.primary} />
              <Text style={styles.orderCardTitle}>Client Delivery</Text>
            </View>
            
            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Name:</Text>
              <Text style={styles.orderDetailValue}>{currentOrder.client.name}</Text>
            </View>
            
            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Address:</Text>
              <TouchableOpacity
                onPress={() => {
                  if (currentOrder.pickedUp) {
                    navigateToMap(currentOrder.client.address, 'client');
                    sendStatusUpdate(currentOrder.id, 'in_transit');
                  }
                }}
                disabled={!currentOrder.pickedUp}
              >
                <Text
                  style={[
                    styles.orderDetailValue,
                    styles.phoneLink,
                    !currentOrder.pickedUp && { color: colors.text }
                  ]}
                >
                  {currentOrder.client.address}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.orderDetailItem}>
              <Text style={styles.orderDetailLabel}>Distance:</Text>
              <Text style={styles.orderDetailValue}>
                {distances.toClient !== null ? `${distances.toClient} km` : '...'}
              </Text>
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
                  color={colors.primary} 
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
              <Ionicons name="fast-food" size={24} color={colors.primary} />
              <Text style={styles.orderCardTitle}>Order Items</Text>
            </View>
            
            {currentOrder.items.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
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