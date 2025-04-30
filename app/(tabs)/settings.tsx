import React, { useState, useEffect } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { styles } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_DATA_KEY = 'worker_app_user_data';

export default function SettingsScreen() {
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();
  const [notifications, setNotifications] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [userData, setUserData] = useState({
    name: 'John Doe',
    phone: '+45 12 34 56 78',
    city: 'Odense'
  });

  // Load user login state and data on component mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const savedUserData = await AsyncStorage.getItem(USER_DATA_KEY);
      if (savedUserData) {
        const parsedData = JSON.parse(savedUserData);
        setIsLoggedIn(parsedData.isLoggedIn);
        if (parsedData.userData) {
          setUserData(parsedData.userData);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const saveUserData = async () => {
    try {
      const dataToSave = {
        isLoggedIn,
        userData
      };
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const toggleNotifications = () => {
    setNotifications(prev => !prev);
  };

  const toggleLoginStatus = () => {
    if (isLoggedIn) {
      Alert.alert(
        "Log Out",
        "Are you sure you want to log out?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Log Out", 
            style: "destructive",
            onPress: () => {
              setIsLoggedIn(false);
              saveUserData();
            }
          }
        ]
      );
    } else {
      // In a real app, this would show a login screen
      setIsLoggedIn(true);
      saveUserData();
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Main content - Settings */}
      <View style={styles.mainContent}>
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={toggleSidebar}
        >
          <Ionicons name={sidebarVisible ? "close" : "menu"} size={24} color="#1B5E20" />
        </TouchableOpacity>
        
        <Text style={styles.welcomeText}>Settings</Text>
        
        <ScrollView style={styles.settingsList} contentContainerStyle={styles.settingsContentContainer}>
          {/* User Information */}
          <View style={styles.userInfoContainer}>
            <Ionicons name="person-circle" size={60} color="#1B5E20" />
            <View style={styles.userTextInfo}>
              <Text style={styles.userName}>
                {isLoggedIn ? `Logged in as: ${userData.name}` : "Not logged in"}
              </Text>
              {isLoggedIn && (
                <>
                  <Text style={styles.userDetail}>{userData.phone}</Text>
                  <Text style={styles.userDetail}>City: {userData.city}</Text>
                </>
              )}
            </View>
          </View>

          {/* Notifications Toggle */}
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Ionicons name="notifications" size={24} color="#1B5E20" />
              <Text style={styles.settingTitle}>Notifications</Text>
            </View>
            <Switch 
              value={notifications} 
              onValueChange={toggleNotifications}
              trackColor={{ false: "#767577", true: "#81c784" }}
              thumbColor={notifications ? "#1B5E20" : "#f4f3f4"}
            />
          </View>
          
          {/* Login/Logout Button */}
          <TouchableOpacity 
            style={[
              styles.loginButton, 
              { backgroundColor: isLoggedIn ? "#e53935" : "#1B5E20" }
            ]}
            onPress={toggleLoginStatus}
          >
            <Ionicons 
              name={isLoggedIn ? "log-out" : "log-in"} 
              size={24} 
              color="white" 
            />
            <Text style={styles.loginButtonText}>
              {isLoggedIn ? "Log Out" : "Log In"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Sidebar Component */}
      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
    </ThemedView>
  );
}