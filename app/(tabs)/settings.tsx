import React, { useState, useEffect } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Switch, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { styles } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import * as api from '@/constants/API';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

const USER_DATA_KEY = 'worker_app_user_data';
const ORDER_HISTORY_KEY = 'worker_app_order_history';
const REFRESH_TOKEN_KEY = 'worker_app_refresh_token';

export default function SettingsScreen() {
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();
  const [notifications, setNotifications] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [changePwModalVisible, setChangePwModalVisible] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const savedUserData = await AsyncStorage.getItem(USER_DATA_KEY);
      const savedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (savedUserData) {
        const parsedData = JSON.parse(savedUserData);
        setIsLoggedIn(parsedData.isLoggedIn);
        if (parsedData.email) setEmail(parsedData.email);
      }
      if (savedRefreshToken) {
        setRefreshToken(savedRefreshToken);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const suppressNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
};

const allowNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

  const saveUserData = async (token?: string, emailToRemember?: string, userId?: string) => {
    try {
      const dataToSave = {
        isLoggedIn: true,
        email: emailToRemember || email,
        user_id: userId || null,
      };
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(dataToSave));
      if (token) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
        setRefreshToken(token);
      }
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

const toggleNotifications = () => {
  setNotifications(prev => {
    const newValue = !prev;
    if (newValue) {
      allowNotifications();
    } else {
      suppressNotifications();
    }
    return newValue;
  });
};

  const sendPushToken = async () => {
    try {
      let token = null;
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus === 'granted') {
          const expoPushToken = await Notifications.getExpoPushTokenAsync({
            projectId: "8d1efc4a-d923-42cd-a6f5-b3be91938c46"
          });
          token = expoPushToken.data;
          console.log('Expo push notification token:', token);
          await api.post('users/push-token', {
            token,
            app_type: 'courier'
          })
        }
      }
    } catch (e) {
      console.log('Push token error:', e);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      let data = await api.post('auth/sign-in/?client_id=courier', {
        email: email,
        password: password
      }).then((res) => {
        console.log(res.status)
        if (res.status == 200) {
          return res.data;
        }
        throw new Error(`HTTP error! Status: ${res.status}`);
      });
      setIsLoggedIn(true);
      await saveUserData(data.refresh_token, email, data.user_id);
      await api.saveTokens(data.access_token, data.refresh_token);
      setEmail(email);
      setPassword('');
      await sendPushToken();
    } catch (error) {
      let message = 'Sign-in Failed. Please check your credentials and try again.';
      if (
        error instanceof TypeError &&
        error.message &&
        error.message.includes('Network request failed')
      ) {
        message = 'Could not connect to the server.';
      }
      Alert.alert('Sign-in Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!refreshToken) {
      setIsLoggedIn(false);
      setEmail('');
      await AsyncStorage.removeItem(USER_DATA_KEY);
      await api.clearTokens();
      return;
    }
    try {
      await api.post('auth/sign-out/', {
        refresh_token: refreshToken
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setIsLoggedIn(false);
    setEmail('');
    await AsyncStorage.removeItem(USER_DATA_KEY);
    await api.clearTokens();
    setRefreshToken(null);
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
            onPress: handleLogout
          }
        ]
      );
    }
  };

  const clearOrderHistory = async () => {
    Alert.alert(
      "Clear Order History",
      "Are you sure you want to delete all order history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(ORDER_HISTORY_KEY);
              Alert.alert("Success", "Order history has been cleared.");
            } catch (error) {
              console.error('Error clearing order history:', error);
              Alert.alert("Error", "Failed to clear order history.");
            }
          }
        }
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert('Missing Fields', 'Please fill in all password fields.');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Error', 'New password and confirmation do not match.');
      return;
    }
    setPwLoading(true);
    try {
      await api.post('auth/change-password/', {
        current_password: currentPw,
        new_password: newPw,
        confirm_password: confirmPw
      }).then((res) => {
        if (res.status === 200) {
          return res.data;
        }
        throw new Error(`HTTP error! Status: ${res.status}`);
      });
      Alert.alert('Success', 'Password changed successfully.');
      setChangePwModalVisible(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      handleLogout(); // Log out after password change
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mainContent}>
        {isLoggedIn && (
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={toggleSidebar}
          >
            <Ionicons name={sidebarVisible ? "close" : "menu"} size={24} color="#1B5E20" />
          </TouchableOpacity>
        )}
        
        <Text style={styles.welcomeText}>Settings</Text>
        
        <ScrollView style={styles.settingsList} contentContainerStyle={styles.settingsContentContainer}>
          <View style={styles.userInfoContainerWide}>
            <Ionicons name="person-circle" size={60} color="#1B5E20" />
            <View style={styles.userTextInfo}>
              <Text style={styles.userName}>
                {isLoggedIn ? `Logged in as: ${email}` : "Not logged in"}
              </Text>
            </View>
          </View>

          {isLoggedIn && (
            <>
              <View style={styles.settingItemWide}>
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
            </>
          )}

          {isLoggedIn && (
            <TouchableOpacity
              style={[styles.loginButtonSettings, { backgroundColor: "#1976d2" }]}
              onPress={() => setChangePwModalVisible(true)}
            >
              <Ionicons name="key" size={24} color="white" />
              <Text style={styles.loginButtonText}>Change Password</Text>
            </TouchableOpacity>
          )}

          {isLoggedIn ? (
            <TouchableOpacity 
              style={[
                styles.loginButtonSettings, 
                { backgroundColor: "#e53935" }
              ]}
              onPress={toggleLoginStatus}
            >
              <Ionicons 
                name="log-out" 
                size={24} 
                color="white" 
              />
              <Text style={styles.loginButtonText}>
                Log Out
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.loginFieldsContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.passwordEyeIcon}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={22}
                      color="#1B5E20"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={styles.loginButtonSettings}
                  onPress={handleSignIn}
                  disabled={loading}
                >
                  <Ionicons name="log-in" size={24} color="white" />
                  <Text style={styles.loginButtonText}>
                    {loading ? "Signing In..." : "Log In"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {isLoggedIn && (
            <TouchableOpacity 
              style={[styles.loginButtonSettings, { backgroundColor: "#e53935", marginTop: 20 }]}
              onPress={clearOrderHistory}
            >
              <Ionicons name="trash" size={24} color="white" />
              <Text style={styles.loginButtonText}>Clear Order History</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <Modal
        visible={changePwModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setChangePwModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 24,
            width: '85%',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Change Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              value={currentPw}
              onChangeText={setCurrentPw}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: "#1976d2" }]}
                onPress={handleChangePassword}
                disabled={pwLoading}
              >
                {pwLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Change</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { marginLeft: 10 }]}
                onPress={() => setChangePwModalVisible(false)}
                disabled={pwLoading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
    </ThemedView>
  );
}