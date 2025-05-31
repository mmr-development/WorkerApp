import { API_BASE, refreshAccessToken, saveTokens } from './API';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location'; // Add this import if not present

type WebSocketEventHandler = (data: any) => void;

let ws: WebSocket | null = null;
let messageHandler: WebSocketEventHandler | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let lastToken: string | null = null;
let lastOnMessage: WebSocketEventHandler | null = null;
let lastOnClose: (() => void) | null = null;
let lastOnError: ((err: any) => void) | null = null;
let locationInterval: NodeJS.Timeout | null = null;

function tryReconnect(
  onMessage?: WebSocketEventHandler,
  onClose?: () => void,
  onError?: (err: any) => void
) {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => {
    connectWebSocket(
      onMessage || lastOnMessage!,
      onClose || lastOnClose || undefined,
      onError || lastOnError || undefined
    );
  }, 3000);
}

function handleWebSocketError(event: any) {
  if (event && event.message && event.message.includes('401')) {
    console.log('[WebSocketManager] Detected 401 error, refreshing token...');
    refreshAccessToken()
      .then(async (data) => {
        if (data.access_token && data.refresh_token) {
          await saveTokens(data.access_token, data.refresh_token);
          // Reconnect WebSocket with new token
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            connectWebSocket(
              lastOnMessage!,
              lastOnClose || undefined,
              lastOnError || undefined
            );
          }, 500); // Short delay to ensure token is saved
        }
      })
      .catch((err) => {
        console.error('[WebSocketManager] Failed to refresh token:', err);
      });
  } else {
    console.log('[WebSocketManager] WebSocket error:', event);
  }
}

// When connecting WebSocket:
export async function connectWebSocket(
  onMessage: WebSocketEventHandler,
  onClose?: () => void,
  onError?: (err: any) => void,
  chatId?: string
) {
  const token = await AsyncStorage.getItem('worker_app_access_token');
  if (!token) {
    console.log('[WebSocketManager] No access token found, cannot connect WebSocket');
    return null;
  }

  lastToken = token;
  lastOnMessage = onMessage;
  lastOnClose = onClose || null;
  lastOnError = onError || null;

  if (ws && ws.readyState === WebSocket.OPEN) return ws;

  // Use per-chat endpoint if chatId is provided
  const wsUrl = chatId
    ? API_BASE.replace(/^http/, 'ws') + `/ws/chat/${chatId}`
    : API_BASE.replace(/^http/, 'ws') + '/ws/courier/delivery';

  ws = new WebSocket(wsUrl);
  messageHandler = onMessage;

  ws.onopen = async () => {
    console.log('[WebSocketManager] WebSocket opened');
    ws?.send(JSON.stringify({ type: 'authorization', token }));

    // Send initial location update if possible
    try {
      const lastLocationString = await AsyncStorage.getItem('worker_app_last_location');
      if (lastLocationString) {
        const lastLocation = JSON.parse(lastLocationString);
        ws?.send(JSON.stringify({
          type: 'location_update',
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          timestamp: new Date().toISOString(),
        }));
        console.log('[WebSocketManager] Sent initial location_update after connect:', lastLocation);

        // Start sending location_update every 30 seconds
        if (locationInterval) clearInterval(locationInterval);
        locationInterval = setInterval(async () => {
          const checkedIn = await AsyncStorage.getItem('worker_app_checked_in');
          if (checkedIn !== 'true') return; // Only send if checked in

          const latestLocationString = await AsyncStorage.getItem('worker_app_last_location');
          if (latestLocationString) {
            const latestLocation = JSON.parse(latestLocationString);
            sendLocationUpdate(latestLocation);
            console.log("abe");
          }
        }, 30000);
      }
    } catch (err) {
      console.log('[WebSocketManager] Could not send initial location_update:', err);
    }
  };

  ws.onmessage = async (event) => {
    try {
      // Always refresh token before handling any message
      const refreshed = await refreshAccessToken();
      if (refreshed?.access_token && refreshed?.refresh_token) {
        await saveTokens(refreshed.access_token, refreshed.refresh_token);
        lastToken = refreshed.access_token;
      }

      console.log('[WebSocketManager] Raw message:', event.data);
      const data = JSON.parse(event.data);

      if (data.type === 'location_request') {
        const requestId = data.payload?.request_id;
        const lastLocationString = await AsyncStorage.getItem('worker_app_last_location');
        if (lastLocationString) {
          const lastLocation = JSON.parse(lastLocationString);
          sendLocationResponse(lastLocation, requestId);
        } else {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'location_error',
              payload: {
                error: 'Location not available',
                request_id: requestId
              }
            }));
          }
        }
        return;
      }
      if (messageHandler) messageHandler(data);
    } catch (err) {
      console.log('WebSocket message parse error:', err);
    }
  };

  ws.onerror = handleWebSocketError;

  ws.onclose = () => {
    ws = null;
    if (locationInterval) {
      clearInterval(locationInterval);
      locationInterval = null;
    }
    if (onClose) onClose();
    console.log('[WebSocketManager] WebSocket connection closed');
    tryReconnect(onMessage, onClose, onError); // <-- add this
  };

  return ws;
}

export function getWebSocket() {
  return ws;
}

export function closeWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function sendStatusUpdate(
  deliveryId: string | number,
  newStatus: string
) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = {
      type: 'status_update',
      delivery_id: deliveryId, // <-- delivery_id, not order_id, not inside payload
      status: newStatus,
    };
    console.log('[WebSocketManager] Sending status_update:', payload);
    ws.send(JSON.stringify(payload));
  } else {
    console.log('[WebSocketManager] WebSocket not open, cannot send status_update');
  }
}


export function sendLocationResponse(workerLocation: { latitude: number; longitude: number }, request_id?: string) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = {
      type: 'location_response',
      payload: {
        latitude: workerLocation.latitude,
        longitude: workerLocation.longitude,
        timestamp: new Date().toISOString(),
        request_id,
      }
    };
    console.log('[WebSocketManager] Sending location_response:', payload);
    ws.send(JSON.stringify(payload));
  }
}

export function sendCheckedIn() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = { type: 'checked_in', payload: { checked_in: true } };
    console.log('[WebSocketManager] Sending checked_in:', payload);
    ws.send(JSON.stringify(payload));
  }
}

export function sendLocationUpdate(workerLocation: { latitude: number; longitude: number }) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = {
      type: 'location_update',
      latitude: workerLocation.latitude,
      longitude: workerLocation.longitude,
      timestamp: new Date().toISOString(),
    };
    console.log('[WebSocketManager] Sending location_update:', payload);
    ws.send(JSON.stringify(payload));
  } else {
    console.log('[WebSocketManager] Cannot send location_update: WebSocket not open');
  }
}