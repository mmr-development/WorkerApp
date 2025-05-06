import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Alert, Button } from 'react-native';
import MapView, { Marker, Polyline, MapViewProps } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';

const ORS_API_KEY = '5b3ce3597851110001cf6248a34c97c85734448898d10ca158d7e9b3';

// Define types for location and region
type LatLng = { latitude: number; longitude: number };
type Region = LatLng & { latitudeDelta: number; longitudeDelta: number };

export default function MapScreen() {
  const { address } = useLocalSearchParams();
  const [region, setRegion] = useState<Region | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [loading, setLoading] = useState(true);
  const [heading, setHeading] = useState<number | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const mapRef = useRef<MapView>(null);

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
        const geocodeUrl = `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(address)}`;
        const geocodeRes = await fetch(geocodeUrl);
        const geocodeData = await geocodeRes.json();
        if (
          !geocodeData.features ||
          !geocodeData.features[0] ||
          !geocodeData.features[0].geometry
        ) {
          throw new Error('Could not geocode destination address');
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
        if (!routeData.features || !routeData.features[0]) {
          throw new Error('No route found');
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
            const { latitude, longitude, heading: newHeading } = loc.coords;
            setUserLocation({ latitude, longitude });
            setHeading(newHeading ?? heading ?? 0);

            // Only recenter if followUser is true
            if (followUser) {
              mapRef.current?.animateCamera({
                center: { latitude, longitude },
                heading: newHeading ?? heading ?? 0,
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

  if (loading || !region) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
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
            rotation={180}
            anchor={{ x: 0.5, y: 0.5 }}
          />
        )}
        {destination && (
          <Marker coordinate={destination} title="Destination" />
        )}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="red" />
        )}
      </MapView>
      {!followUser && (
        <View style={{ position: 'absolute', top: 40, right: 20 }}>
          <Button title="Recenter" onPress={() => setFollowUser(true)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});