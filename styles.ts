import { StyleSheet } from 'react-native';

// Theme colors based on brand guidelines
export const COLORS = {
  primary: '#2cb673',          // vibrant green for primary elements
  accent: '#b1e2c6',           // lighter green for accents
  background: '#ebf8f1',       // soft greenish-white for background
  backgroundDarker: '#b1e2c6', // slightly darker background for contrast
  backgroundLight: '#ebf8f1',  // light green for sections
  text: '#1B5E20',             // deep green for text
  border: '#b1e2c6',           // light green for borders
  footerBg: '#2cb673',         // vibrant green for footer background
  footerText: '#ebf8f1',       // light text for footer
  hover: '#1e8f5a',            // hover state color
  white: 'white',
  black: 'black',
  grey: '#555',
  lightGrey: '#e0e0e0',
  error: '#e53935',            // Red for error states and logout
  overlay: 'rgba(0,0,0,0.5)'
};

export const styles = StyleSheet.create({
  // Core layout styles
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: COLORS.background,
  },
  mainContent: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.primary,
  },
  toggleButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  
  // Sidebar styles
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    zIndex: 10,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '70%',
    backgroundColor: COLORS.backgroundLight,
    zIndex: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.primary,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  sidebarLinks: {
    flex: 1,
  },
  sidebarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sidebarLinkText: {
    fontSize: 16,
    marginLeft: 10,
    color: COLORS.text,
  },
  
  // Orders styles (used in index.tsx)
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  ordersMainList: {
    width: '100%',
    flex: 1,
    marginTop: 10,
  },
  ordersContentContainer: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    marginBottom: 12,
  },
  orderCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 10,
  },
  orderDetailItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  orderDetailLabel: {
    width: '30%',
    fontSize: 15,
    color: COLORS.grey,
    fontWeight: '500',
  },
  orderDetailValue: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },
  orderItemText: {
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  
  // Settings styles
  settingsList: {
    width: '100%',
    flex: 1,
    marginTop: 10,
  },
  settingsContentContainer: {
    paddingBottom: 20,
  },
  settingItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
    margin: 10,
    borderRadius: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    marginLeft: 10,
    color: COLORS.text,
  },
  settingTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // User profile section in settings
  userInfoContainer: {
    backgroundColor: COLORS.white,
    padding: 20,
    margin: 10,
    borderRadius: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTextInfo: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  userDetail: {
    fontSize: 14,
    color: COLORS.grey,
    marginBottom: 3,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 15,
    margin: 10,
    borderRadius: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },

  phoneLink: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  disabledButton: {
    backgroundColor: COLORS.grey,
    opacity: 0.7,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: COLORS.grey,
    marginTop: 10,
    textAlign: 'center',
  },
  
  chatButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },

  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeholderMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  },
  mapPlaceholder: {
    textAlign: 'center',
    color: COLORS.grey,
    marginTop: 20,
    padding: 10,
  },
  mapDestinationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
  },
  mapDestinationText: {
    fontSize: 18,
    color: COLORS.primary,
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalCloseButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  orderDetailSection: {
    marginBottom: 20,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    padding: 15,
  },
  sectionTitle1: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipAmount: {
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: 'bold',
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -60,
  },
  awaitingOrderText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
  },
  historyOrderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 10,
    width: '94%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    elevation: 0,
  },
  
  historyDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    flexWrap: 'wrap',
    paddingVertical: 4,
  },
  
  historyDetailLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: 10,
    minWidth: 90,
  },
  
  historyDetailValue: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
  },

  photoThumbnailContainer: {
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.backgroundLight,
    paddingTop: 16,
  },

  photoThumbnail: {
    width: '100%',
    height: 140,
    borderRadius: 8,
  },
  deliveryPhoto: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginTop: 8,
  },
  noPhotoContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    marginTop: 10,
  },
  noPhotoText: {
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 10,
    fontSize: 15,
  },
});