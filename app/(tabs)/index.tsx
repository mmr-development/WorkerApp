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
import { connectWebSocket, sendStatusUpdate, sendLocationUpdate, closeWebSocket, sendLocationResponse } from '@/constants/WebSocketManager';
import * as TaskManager from 'expo-task-manager';

export type OrderDetails = {
  id: string;
  orderId?: number;
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
  status?: string;
};

const ORDER_HISTORY_KEY = 'worker_app_order_history';
const USER_DATA_KEY = 'worker_app_user_data';

const geocodeCache: Record<string, { latitude: number; longitude: number }> = {};

const LOCATION_TASK_NAME = 'background-location-task';
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const { latitude, longitude } = locations[0].coords;
      sendLocationUpdate({ latitude, longitude });
    }
  }
});

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

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionGranted(status === 'granted');
      
      if (status === 'granted') {
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
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

  useEffect(() => {
    const updateDistances = async () => {
      if (!currentOrder || !workerLocation) return;
      
      try {
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
    setCurrentOrder(prev =>
      prev ? { ...prev, pickedUp: true } : prev
    );
    console.log('[HomeScreen] Confirm Pickup pressed for delivery:', currentOrder.id);
    sendStatusUpdate(currentOrder.id, 'picked_up');
    if (workerLocation) {
      sendLocationUpdate(workerLocation);
      AsyncStorage.setItem('worker_app_in_transit', 'true');
    }
  }
};

const confirmDelivery = async () => {
  if (!currentOrder) return;

  try {
    // Always require a photo
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        "Camera Permission",
        "We need camera permission to take delivery confirmation photos.",
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
      base64: false,
    });

    if (result.canceled || !result.assets || !result.assets[0].uri) {
      Alert.alert(
        "Photo Required",
        "A photo confirmation is required for deliveries.",
        [{ text: "OK" }]
      );
      return;
    }

    const imageUri = result.assets[0].uri;
    const filename = imageUri.split('/').pop() || 'delivery.jpg';

    // Upload image to /deliveries/:delivery_id/documentation
    const accessToken = await AsyncStorage.getItem('worker_app_access_token');
    const formData = new FormData();
    formData.append('images', {
      uri: imageUri,
      name: filename,
      type: 'image/jpeg',
    } as any);

    const uploadRes = await fetch(
      `${API_BASE}/v1/deliveries/${currentOrder.id}/documentation`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      }
    );
    const uploadText = await uploadRes.text();
    console.log('Delivery documentation upload raw response:', uploadText);

    let uploadData;
    try {
      uploadData = JSON.parse(uploadText);
    } catch (e) {
      uploadData = uploadText;
    }
    console.log('Delivery response:', uploadData);

    if (!uploadRes.ok) {
      Alert.alert('Upload failed', 'Could not upload delivery documentation. Please try again.');
      return;
    }

    // Mark as delivered via WebSocket
    sendStatusUpdate(currentOrder.id, 'delivered');

    // Save to history and clear current order
    const completedOrder: OrderDetails = {
      ...currentOrder,
      completed: true,
      deliveryTime: new Date().toISOString(),
      tipped: true,  // For demo
      tipAmount: 25, // For demo
      deliveryPhoto: imageUri,
    };
    await saveOrderToHistory(completedOrder);

    // Reconnect WebSocket after finishing the order
    setTimeout(() => {
      connectWebSocket(onMessageHandler);
    }, 500);

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
      longitude: coords ? coords.longitude.toString() : undefined,
      latitude: coords ? coords.latitude.toString() : undefined,
    }
  });
};


  useEffect(() => {
    if (!isCheckedIn) {
      closeWebSocket();
      setCurrentOrder(null);
      return;
    }
    connectWebSocket(onMessageHandler);
  }, [isCheckedIn]);

  useEffect(() => {
    const fetchCheckInStatus = async () => {
      const status = await AsyncStorage.getItem('worker_app_checked_in');
      setIsCheckedIn(status === 'true');
    };

    fetchCheckInStatus();
    const interval = setInterval(fetchCheckInStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  // "Start Shift" handler
  const handleStartShift = async () => {
    setCheckingIn(true);
    try {
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
      wsRef.current?.send(JSON.stringify({ type: 'checked_in', payload: { checked_in: true } }));
    } catch (err) {
      Alert.alert('Error', 'Failed to check in. Try again.');
    }
    setCheckingIn(false);
  };

  const handleEndShift = async () => {
    setIsCheckedIn(false);
    await AsyncStorage.setItem('worker_app_checked_in', 'false');
    if (wsRef.current) {
      console.log('[HomeScreen] Closing WebSocket connection (end shift)');
      wsRef.current.close();
      wsRef.current = null;
    }
    setCurrentOrder(null); // Remove order when checking out
  };

  // Save currentOrder to AsyncStorage whenever it changes
useEffect(() => {
  if (currentOrder) {
    AsyncStorage.setItem('worker_app_current_order', JSON.stringify(currentOrder));
    AsyncStorage.setItem('worker_app_in_transit', 'true');
  } else {
    AsyncStorage.removeItem('worker_app_current_order');
    AsyncStorage.setItem('worker_app_in_transit', 'false');
  }
}, [currentOrder]);
useEffect(() => {
  if (workerLocation) {
    AsyncStorage.setItem('worker_app_last_location', JSON.stringify(workerLocation));
  }
}, [workerLocation]);

  // In your useEffect, start background updates when checked in:
useEffect(() => {
  if (isCheckedIn) {
    (async () => {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status === 'granted') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 50, // meters
          timeInterval: 60000, // ms, e.g., every 1 min
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'WorkerApp',
            notificationBody: 'Tracking your location for deliveries.',
          },
        });
      }
    })();
  } else {
    Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).then((started) => {
      if (started) {
        Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    });
  }
}, [isCheckedIn]);

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
            <Text style={styles.awaitingOrderText}>
              {isCheckedIn ? "Awaiting order" : "You are not checked in"}
            </Text>
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
        <TouchableOpacity 
          style={styles.chatButton}
          onPress={() => router.push('/chat')}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <Text style={styles.welcomeText}>Orders</Text>
        
        
        <ScrollView style={styles.ordersMainList} contentContainerStyle={styles.ordersContentContainer}>
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
              <Text style={styles.orderDetailValue}>{currentOrder.orderId ?? currentOrder.id}</Text>
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
                onPress={async () => {
                  if (currentOrder.pickedUp) {
                    await AsyncStorage.setItem('worker_app_in_transit', 'true');
                    sendStatusUpdate(currentOrder.id, 'in_transit');
                    navigateToMap(currentOrder.client.address, 'client');
                    if (workerLocation) {
                      console.log('[HomeScreen] initial location:', workerLocation);
                      sendLocationUpdate(workerLocation);
                    }
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
  
  function mapDeliveryToOrderDetails(delivery: any): OrderDetails {
    return {
      id: delivery.id?.toString() ?? '',
      orderId: delivery.order_id ?? delivery.id,
      restaurant: {
        name: delivery.pickup?.name ?? '',
        address: `${delivery.pickup?.street ?? ''} ${delivery.pickup?.address ?? ''}`.trim(),
        phoneNumber: delivery.pickup?.phone ?? '',
      },
      client: {
        name: delivery.delivery?.customer_name ?? '',
        address: `${delivery.delivery?.street ?? ''} ${delivery.delivery?.address ?? ''}`.trim(),
        phoneNumber: delivery.delivery?.phone ?? '',
      },
      items: Array.isArray(delivery.order?.items)
        ? delivery.order.items.map((item: any) => item.item_name)
        : [],
      pickedUp: !!delivery.picked_up_at,
      completed: !!delivery.delivered_at,
      deliveryTime: delivery.delivered_at,
      tipAmount: delivery.order?.tip_amount,
      contactlessDelivery: false,
      status: delivery.status,
    };
  }

  function onMessageHandler(data: any) {
    console.log('[HomeScreen] WebSocket message received:', data);

    if (data.type === 'order_assigned' && data.payload) {
      setCurrentOrder(mapDeliveryToOrderDetails(data.payload));
      console.log('[HomeScreen] Updated currentOrder from order_assigned:', data.payload);
    }
    if (data.type === 'current_deliveries' && data.payload?.deliveries?.length > 0) {
      setCurrentOrder(mapDeliveryToOrderDetails(data.payload.deliveries[0]));
      console.log('[HomeScreen] Updated currentOrder from current_deliveries:', data.payload.deliveries[0]);
    }
    // Add this block:
    if (data.type === 'delivery_assigned' && data.payload?.deliveries?.length > 0) {
      setCurrentOrder(mapDeliveryToOrderDetails(data.payload.deliveries[0]));
      console.log('[HomeScreen] Updated currentOrder from delivery_assigned:', data.payload.deliveries[0]);
    }
    // Handle location_request
    if (data.type === 'location_request') {
      const requestId = data.payload?.request_id;
      if (requestId !== undefined) {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          .then(location => {
            sendLocationResponse(
              { latitude: location.coords.latitude, longitude: location.coords.longitude },
              requestId
            );
            console.log('[HomeScreen] Sent fresh location_response for request_id:', requestId, location.coords);
          })
          .catch(err => {
            console.log('[HomeScreen] Failed to get current position for location_request', err);
          });
      } else {
        console.log('[HomeScreen] No request_id for location_request');
      }
    }
  }
}