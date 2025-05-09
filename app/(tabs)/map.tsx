import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Alert, Button, TouchableOpacity, Modal, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import { styles, colors } from '../../styles';

const ORS_API_KEY = '5b3ce3597851110001cf6248a34c97c85734448898d10ca158d7e9b3';

// Define types for location and region
type LatLng = { latitude: number; longitude: number };
type Region = LatLng & { latitudeDelta: number; longitudeDelta: number };

// Helper: Haversine distance in meters
function getDistance(a: LatLng, b: LatLng) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const aVal =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

// Helper: interpolate points every 10m between two coordinates
function interpolatePoints(a: LatLng, b: LatLng, step = 10): LatLng[] {
  const dist = getDistance(a, b);
  if (dist <= 20) return [];
  const points: LatLng[] = [];
  const steps = Math.floor(dist / step);
  for (let i = 1; i < steps; i++) {
    const fraction = i / steps;
    const lat = a.latitude + (b.latitude - a.latitude) * fraction;
    const lng = a.longitude + (b.longitude - a.longitude) * fraction;
    points.push({ latitude: lat, longitude: lng });
  }
  return points;
}

// Helper: generate micropoints for the whole route
function generateMicropoints(route: LatLng[]): LatLng[] {
  let micropoints: LatLng[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    micropoints = micropoints.concat(interpolatePoints(route[i], route[i + 1]));
  }
  return micropoints;
}

// Helper: find index of closest point on route to user
function getClosestPointIndex(user: LatLng, route: LatLng[]) {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < route.length; i++) {
    const dist = getDistance(user, route[i]);
    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }
  return minIdx;
}

export default function MapScreen() {
  const { address } = useLocalSearchParams();
  const router = useRouter();
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();
  const [region, setRegion] = useState<Region | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [oldUserLocation, setOldUserLocation] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [micropoints, setMicropoints] = useState<LatLng[]>([]);
  const [loading, setLoading] = useState(true);
  const [heading, setHeading] = useState<number | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [lastCheck, setLastCheck] = useState(Date.now());
  const [arrivedModalVisible, setArrivedModalVisible] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);
  const [recalculationStatus, setRecalculationStatus] = useState<'idle' | 'calculating' | 'success'>('idle');
  const [refreshing, setRefreshing] = useState(false);
  const pullThreshold = 100; // Distance in pixels needed to trigger refresh
  const [pullStartY, setPullStartY] = useState(0);
  const mapRef = useRef<MapView>(null);
  const [closestPoint, setClosestPoint] = useState<LatLng | null>(null);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLoading(false);
          Alert.alert('Permission denied', 'Location permission is required for navigation.');
          return;
        }
        let location = await Location.getCurrentPositionAsync({});
        const start: LatLng = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(start);
        setHeading(location.coords.heading ?? 0);

        // Geocode destination address
        const geocodeUrl = `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(address as string)}`;
        const geocodeRes = await fetch(geocodeUrl);
        const geocodeData = await geocodeRes.json();
        if (
          !geocodeData.features ||
          !geocodeData.features[0] ||
          !geocodeData.features[0].geometry
        ) {
          setDestination(null);
          setRouteCoords([]);
          setLoading(false);
          return;
        }
        const [destLng, destLat] = geocodeData.features[0].geometry.coordinates;
        const dest: LatLng = { latitude: destLat, longitude: destLng };
        setDestination(dest);

        setRegion({
          latitude: start.latitude,
          longitude: start.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        // Fetch route
        const routeUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${start.longitude},${start.latitude}&end=${destLng},${destLat}`;
        const routeRes = await fetch(routeUrl);
        const routeData = await routeRes.json();
        if (
          !routeData.features ||
          !routeData.features[0] ||
          !routeData.features[0].geometry ||
          !routeData.features[0].geometry.coordinates
        ) {
          setRouteCoords([]);
          setLoading(false);
          return;
        }
        const coords: LatLng[] = routeData.features[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => ({
            latitude: lat,
            longitude: lng,
          })
        );
        setRouteCoords(coords);

        // Subscribe to location updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 0,
          },
          (loc) => {
            const { latitude, longitude, heading: newHeading, speed } = loc.coords;
            setUserLocation({ latitude, longitude });
            setHeading((prevHeading) => {
              if (typeof speed === "number" && speed > 0.5 && typeof newHeading === "number" && !isNaN(newHeading)) {
                return newHeading;
              }
              return prevHeading ?? 0;
            });
            if (followUser) {
              mapRef.current?.animateCamera({
                center: { latitude, longitude },
                heading: (typeof speed === "number" && speed > 0.5 && typeof newHeading === "number" && !isNaN(newHeading))
                  ? newHeading
                  : heading ?? 0,
                pitch: 0,
                zoom: 17,
              });
            }
          }
        );
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to fetch route');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [address, followUser]);

  useEffect(() => {
    if (routeCoords.length > 1) {
      setMicropoints(generateMicropoints(routeCoords));
    }
  }, [routeCoords]);

  useEffect(() => {
    if (!userLocation || (routeCoords.length < 2 && micropoints.length === 0)) return;

    const interval = setInterval(() => {
      setLastCheck(Date.now());

      // Calculate min distance to routeCoords
      let minDistCoords = Infinity;
      let closestCoord: LatLng | null = null;
      for (const pt of routeCoords) {
        const dist = getDistance(userLocation, pt);
        if (dist < minDistCoords) {
          minDistCoords = dist;
          closestCoord = pt;
        }
      }

      // Calculate min distance to micropoints
      let minDistMicropoints = Infinity;
      let closestMicro: LatLng | null = null;
      for (const pt of micropoints) {
        const dist = getDistance(userLocation, pt);
        if (dist < minDistMicropoints) {
          minDistMicropoints = dist;
          closestMicro = pt;
        }
      }

      let minDist = minDistCoords;
      let closest = closestCoord;
      if (minDistMicropoints < minDistCoords) {
        minDist = minDistMicropoints;
        closest = closestMicro;
      }
      setClosestPoint(closest);
      console.log(
        `Distance to nearest coordinate: ${minDistCoords.toFixed(2)} meters, ` +
        `to nearest micropoint: ${minDistMicropoints.toFixed(2)} meters, ` +
        `closest: ${minDist.toFixed(2)} meters`
      );

      if (minDist > 10) {
        if (oldUserLocation && getDistance(oldUserLocation, userLocation) > 10) {
          recalculateRoute();
          setOldUserLocation(userLocation);
        } else if (!oldUserLocation) {
          setOldUserLocation(userLocation);
        }

      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userLocation, destination, routeCoords, micropoints]);

  useEffect(() => {
    if (!userLocation || !destination || hasArrived) return;
    const distanceToTarget = getDistance(userLocation, destination);
    if (distanceToTarget <= 10) {
      setArrivedModalVisible(true);
      setHasArrived(true);
    }
  }, [userLocation, destination, hasArrived]);

  const recalculateRoute = async () => {

    try {
      if (!userLocation || !destination) return;
      
      setRecalculationStatus('calculating');
      const routeUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${userLocation.longitude},${userLocation.latitude}&end=${destination.longitude},${destination.latitude}`;
      const routeRes = await fetch(routeUrl);
      const routeData = await routeRes.json();
      
      if (
        !routeData.features ||
        !routeData.features[0] ||
        !routeData.features[0].geometry ||
        !routeData.features[0].geometry.coordinates
      ) {
        console.error("Invalid route data returned:", routeData);
        setRouteCoords([]);
        setRecalculationStatus('idle');
        return;
      }
      
      const coords: LatLng[] = routeData.features[0].geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        })
      );
      
      console.log(`New route calculated with ${coords.length} points`);
      setRouteCoords(coords);
      setRecalculationStatus('success');
      setTimeout(() => {
        setRecalculationStatus('idle');
        setRefreshing(false);
      }, 2000);
    } catch (error: any) {
      console.error("Route recalculation error:", error.message);
      setRecalculationStatus('idle');
      setRefreshing(false);
    }
  };

  if (loading || !region) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={styles.mapToggleButton} onPress={toggleSidebar}>
        <Ionicons name={sidebarVisible ? "close" : "menu"} size={24} color={colors.text} />
      </TouchableOpacity>

      {/* Dedicated pull-to-refresh zone */}
      <View 
        style={styles.pullRefreshZone}
        onTouchStart={e => setPullStartY(e.nativeEvent.pageY)}
        onTouchMove={e => {
          if (refreshing) return;
          const currentY = e.nativeEvent.pageY;
          const pullDistance = currentY - pullStartY;
          
          if (pullDistance > 0 && pullDistance > pullThreshold) {
            setRefreshing(true);
            recalculateRoute();
          }
        }}
      />

      {/* Pull to refresh indicator */}
      {refreshing && (
        <View style={styles.pullRefreshIndicator}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ marginLeft: 8, color: colors.text }}>Refreshing route...</Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={false}
        followsUserLocation={false}
        rotateEnabled={true}
        pitchEnabled={false}
        showsCompass={true}
        onPanDrag={() => setFollowUser(false)}
      >
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="You"
            pinColor="blue"
            rotation={followUser ? 180 : (heading ?? 0)}
            anchor={{ x: 0.5, y: 0.5 }}
          />
        )}
        {destination && (
          <Marker coordinate={destination} title="Destination" />
        )}
        {routeCoords.length > 0 && userLocation && (
          <>
            <Polyline
              coordinates={routeCoords.slice(0, getClosestPointIndex(userLocation, routeCoords) + 1)}
              strokeWidth={4}
              strokeColor="rgba(255,0,0,0.2)"
              zIndex={1}
            />
            <Polyline
              coordinates={routeCoords.slice(getClosestPointIndex(userLocation, routeCoords))}
              strokeWidth={4}
              strokeColor="red"
              zIndex={2}
            />
          </>
        )}
        {/* Closest point marker */}
        {closestPoint && (
          <Marker
            coordinate={closestPoint}
            title="Closest Point"
            pinColor="orange"
            description="This is the closest route coordinate or micropoint"
          />
        )}
      </MapView>
      {!followUser && (
        <View style={{ position: 'absolute', top: 40, right: 20 }}>
          <Button
            title="Recenter"
            onPress={() => {
              setFollowUser(true);
              if (userLocation) {
                mapRef.current?.animateCamera({
                  center: userLocation,
                  heading: heading ?? 0,
                  pitch: 0,
                  zoom: 17,
                });
              }
            }}
          />
        </View>
      )}
      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
      <Modal
        visible={arrivedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setArrivedModalVisible(false)}
      >
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalContent}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>You have arrived</Text>
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <Button
                title="Remain on map"
                onPress={() => setArrivedModalVisible(false)}
              />
              <View style={{ width: 12 }} />
              <Button
                title="Return to orders"
                onPress={() => {
                  setArrivedModalVisible(false);
                  router.replace("/");
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}