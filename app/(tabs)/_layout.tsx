import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      // Hide the tab bar completely for all screens
      tabBarStyle: { display: 'none' },
      // Remove header as well if you don't want it
      headerShown: false,
    }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="support" />
      <Tabs.Screen name="shifts" />
    </Tabs>
  );
}