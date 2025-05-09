import React, { useRef, useState, useEffect } from 'react';
import { Text, ScrollView, TouchableOpacity, Animated, Dimensions, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { styles, colors } from '../styles';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.7;
const SHIFT_STATUS_KEY = 'worker_app_shift_status';

type SidebarProps = {
  isVisible: boolean;
  onClose: () => void;
};

export function Sidebar({ isVisible, onClose }: SidebarProps) {
  const slideAnim = useRef(new Animated.Value(isVisible ? 0 : -SIDEBAR_WIDTH)).current;
  const [shiftActive, setShiftActive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadShiftStatus();
  }, []);

  useEffect(() => {
    const toValue = isVisible ? 0 : -SIDEBAR_WIDTH;
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, slideAnim]);

  const loadShiftStatus = async () => {
    try {
      const savedStatus = await AsyncStorage.getItem(SHIFT_STATUS_KEY);
      if (savedStatus !== null) {
        setShiftActive(savedStatus === 'true');
      }
    } catch (error) {
      console.error('Error loading shift status:', error);
    }
  };

  const toggleShift = async () => {
    const newStatus = !shiftActive;
    setShiftActive(newStatus);
    try {
      await AsyncStorage.setItem(SHIFT_STATUS_KEY, newStatus.toString());
    } catch (error) {
      console.error('Error saving shift status:', error);
    }
  };

  const handlePageNavigation = (path: string) => {
    router.push(path);
    onClose(); // Collapse the sidebar when navigating to a page
  };

  return (
    <>
      {isVisible && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      <Animated.View
        style={[
          styles.sidebar,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Navigation</Text>
          <TouchableOpacity 
            style={localStyles.closeButton} 
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={24} color="#1B5E20" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.sidebarLinks}>
          {/* Orders button - redirects to home */}
          <TouchableOpacity style={styles.sidebarLink} onPress={() => handlePageNavigation('/')}>
            <Ionicons name="list" size={24} color={colors.text} />
            <Text style={styles.sidebarLinkText}>Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarLink} onPress={() => handlePageNavigation('/shifts')}>
            <Ionicons name="calendar" size={24} color="#1B5E20" />
            <Text style={styles.sidebarLinkText}>Shifts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarLink} onPress={() => handlePageNavigation('/map')}>
            <Ionicons name="map" size={24} color="#1B5E20" />
            <Text style={styles.sidebarLinkText}>Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarLink} onPress={() => handlePageNavigation('/support')}>
            <Ionicons name="help-circle" size={24} color="#1B5E20" />
            <Text style={styles.sidebarLinkText}>Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarLink} onPress={() => handlePageNavigation('/history')}>
            <Ionicons name="time" size={24} color={colors.text} />
            <Text style={styles.sidebarLinkText}>History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarLink} onPress={() => handlePageNavigation('/settings')}>
            <Ionicons name="settings" size={24} color="#1B5E20" />
            <Text style={styles.sidebarLinkText}>Settings</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={localStyles.shiftButtonContainer}>
          <TouchableOpacity
            style={[
              localStyles.shiftButton,
              { backgroundColor: shiftActive ? '#e53935' : '#2cb673' }
            ]}
            onPress={toggleShift} // Do not collapse the sidebar when toggling the shift
          >
            <Ionicons 
              name={shiftActive ? "stop-circle" : "play-circle"} 
              size={24} 
              color="white" 
            />
            <Text style={localStyles.shiftButtonText}>
              {shiftActive ? "End Shift" : "Start Shift"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

const localStyles = StyleSheet.create({
  closeButton: {
    position: 'absolute',
    right: 10,
    top: 15,
    padding: 5,
  },
  shiftButtonContainer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  shiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    width: '50%',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  shiftButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  }
});