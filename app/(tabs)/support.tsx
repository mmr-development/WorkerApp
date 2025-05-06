import React, { useState } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { styles, COLORS } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';
import { useRouter } from 'expo-router'; // Import useRouter for navigation

// FAQ Item component with dropdown functionality
const FAQItem = ({ question, answer }: { question: string; answer: string | React.ReactNode }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity 
        style={styles.faqQuestion}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.faqQuestionText}>{question}</Text>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={24} 
          color={COLORS.primary} 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.faqAnswer}>
          {typeof answer === 'string' ? (
            <View>
              <Text style={styles.faqAnswerText}>{answer.split(': ')[0]}:</Text>
              {answer.split(': ')[1].split(', ').map((item, index) => (
                <View key={index} style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            answer
          )}
        </View>
      )}
    </View>
  );
};

export default function SupportScreen() {
  const { sidebarVisible, toggleSidebar, closeSidebar } = useSidebar();
  const router = useRouter(); // Initialize router for navigation
  
  const navigateToChat = () => {
    router.push('/chat'); // Navigate to chat.tsx
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
          onPress={navigateToChat}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <Text style={styles.welcomeText}>Support & FAQ</Text>
        
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          <FAQItem 
            question="Before Starting: What do I need to do?" 
            answer={
              <View>
                <Text style={styles.faqAnswerText}>Before starting your shift as a bike delivery worker:</Text>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Check that your bike is in good working condition</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Ensure your phone is fully charged (bring a power bank)</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Wear appropriate clothing with reflective elements</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Check your delivery bag is clean and secure</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Open the app and tap "Start Shift" in the sidebar</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Ensure location services are enabled</Text>
                </View>
              </View>
            } 
          />
          
          <FAQItem 
            question="How do I complete an order?" 
            answer={
              <View>
                <Text style={styles.faqAnswerText}>To complete an order, follow these steps:</Text>
                <Text style={styles.stepTitle}>1. At the restaurant:</Text>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Navigate to the restaurant using the map</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Show the order ID to restaurant staff</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Check that the order items match what's in the app</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Tap "Confirm Pickup" in the app</Text>
                </View>
                
                <Text style={styles.stepTitle}>2. At the customer's address:</Text>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>For regular delivery: Hand the food directly to the customer</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Tap "Confirm Delivery" in the app</Text>
                </View>
                <View style={styles.bulletPoint}>
                <Ionicons name="warning-outline" size={16} color="#FFA000" />
                <Text style={styles.bulletText}>For contactless delivery: Place the order at the door, and take a clear photo of the food bag</Text>
                </View>
              </View>
            } 
          />
          
          <FAQItem 
            question="How to use the app navigation?" 
            answer={
              <View>
                <Text style={styles.faqAnswerText}>To navigate effectively:</Text>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>On the order screen, tap the address to open the map</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Use the "Navigate" button to open your preferred maps app</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>You can always return to the order by using the back button</Text>
                </View>
              </View>
            }
          />
          
          <FAQItem 
            question="The restaurant is not ready with the order" 
            answer={
              <View>
                <Text style={styles.faqAnswerText}>If the restaurant isn't ready with the order:</Text>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Let them know you've arrived</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Ask for an estimated wait time</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>If the restaurant anticipates longer than 15 minutes of wait time, contact support</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Be polite and patient - restaurants are our partners and you represent our brand</Text>
                </View>
              </View>
            }
          />
          
          <FAQItem 
            question="The address is incorrect or I can't find it" 
            answer={
              <View>
                <Text style={styles.faqAnswerText}>If you can't find the customer's address:</Text>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Double-check the address in the app</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Try using a different maps app</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Call the customer directly through the app</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>If you still can't find it after 5 minutes, contact support for assistance</Text>
                </View>
              </View>
            }
          />
          
          
          <FAQItem 
            question="My bike broke down" 
            answer={
              <View>
                <Text style={styles.faqAnswerText}>If your bike breaks down:</Text>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Immediately notify support through the app or call</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>If you have an active order, let support know so it can be reassigned</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Once the issue is resolved, notify support if you can continue or need to end your shift</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Use the sidebar menu to end your shift if needed</Text>
                </View>
              </View>
            }
          />
          
          <FAQItem 
            question="How do I view my delivery history?" 
            answer={
              <View>
                <Text style={styles.faqAnswerText}>To view your delivery history:</Text>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Open the sidebar menu by tapping the menu icon in the top-left corner</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Tap on 'History'</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>You'll see all your completed deliveries with details like time, restaurant, and customer information</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  <Text style={styles.bulletText}>Tap on any order to view the full details including delivery confirmation photos</Text>
                </View>
              </View>
            }
          />
          
          <FAQItem 
            question="The packaging got damaged during delivery" 
            answer={
                <View>
                <Text style={styles.faqAnswerText}>If the packaging is damaged during delivery:</Text>
                <View style={styles.bulletPoint}>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                    <Text style={styles.bulletText}>Ask the client if they would like to accept the order</Text>
                </View>
                <View style={{marginLeft: 25}}>
                    <View style={styles.bulletPoint}>
                    <Ionicons name="radio-button-on" size={12} color={COLORS.primary} />
                    <Text style={styles.bulletText}>If client accepts the order, thank them for using our service</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                    <Ionicons name="radio-button-on" size={12} color={COLORS.primary} />
                    <Text style={styles.bulletText}>If the client asks for a refund, ask them to visit the order confirmation and contact us through there</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                    <Ionicons name="radio-button-on" size={12} color={COLORS.primary} />
                    <Text style={styles.bulletText}>If the client refuses the meal, discard it in a hygienic and appropriate manner</Text>
                    </View>
                </View>
                </View>
            }
            />
          
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>Need immediate assistance?</Text>
            <Text style={styles.contactText}>Contact support for further questions, or call support for emergencies on +45 12 34 56 78</Text>
            
            <View style={styles.contactButtonsContainer}>
              <TouchableOpacity 
                style={[styles.contactButton, { backgroundColor: COLORS.primary }]}
                onPress={navigateToChat}
              >
                <Ionicons name="chatbubble-ellipses" size={22} color="white" />
                <Text style={styles.contactButtonText}>Ask Support</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.contactButton, { backgroundColor: "#0066cc" }]}
                onPress={() => Linking.openURL('tel:+4512345678')}
              >
                <Ionicons name="call" size={22} color="white" />
                <Text style={styles.contactButtonText}>Call Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      <Sidebar isVisible={sidebarVisible} onClose={closeSidebar} />
    </ThemedView>
  );
}