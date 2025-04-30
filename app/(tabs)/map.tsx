import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { styles, COLORS } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';

export default function MapScreen() {
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [destination, setDestination] = useState<string | null>(null);
  const [destinationType, setDestinationType] = useState<string | null>(null);

  useEffect(() => {
    if (params.address) {
      setDestination(params.address as string);
    }
    if (params.type) {
      setDestinationType(params.type as string);
    }
  }, [params]);

  const openInMapsApp = () => {
    if (destination) {
      // Encode the address for URL
      const encodedAddress = encodeURIComponent(destination);
      // Create a maps URL that works on both iOS and Android
      const mapsUrl = `https://maps.google.com/maps?q=${encodedAddress}`;
      
      Linking.canOpenURL(mapsUrl)
        .then(supported => {
          if (supported) {
            return Linking.openURL(mapsUrl);
          } else {
            alert('Cannot open maps application');
          }
        })
        .catch(error => alert('An error occurred: ' + error));
    }
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
          onPress={() => alert("Chat functionality coming soon!")}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <Text style={styles.welcomeText}>Map Navigation</Text>
        
        <View style={styles.mapContainer}>
          {/* This is where an actual map would be integrated */}
          <View style={styles.placeholderMap}>
            <Ionicons name="map" size={60} color={COLORS.accent} />
            <Text style={styles.mapDestinationLabel}>
              {destinationType === 'restaurant' ? 'Restaurant Location:' : 'Customer Location:'}
            </Text>
            <Text style={styles.mapDestinationText}>{destination}</Text>
            <Text style={styles.mapPlaceholder}>
              Map navigation would be implemented here with the Google Maps or MapView component
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={openInMapsApp}
          >
            <Ionicons name="navigate" size={20} color="white" />
            <Text style={styles.actionButtonText}>Open in Maps App</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
    </ThemedView>
  );
}