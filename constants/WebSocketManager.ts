import { API_BASE } from './API';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const wsUrl = chatId
    ? API_BASE.replace(/^http/, 'ws') + `/ws/chat/${chatId}`
    : API_BASE.replace(/^http/, 'ws') + '/ws/courier/delivery';

  ws = new WebSocket(wsUrl);
  messageHandler = onMessage;

  ws.onopen = async () => {
    console.log('[WebSocketManager] WebSocket opened');
    ws?.send(JSON.stringify({ type: 'authorization', token }));
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
        if (locationInterval) clearInterval(locationInterval);
        locationInterval = setInterval(async () => {
          const latestLocationString = await AsyncStorage.getItem('worker_app_last_location');
          if (latestLocationString) {
            const latestLocation = JSON.parse(latestLocationString);
            sendLocationUpdate(latestLocation);
          }
        }, 30000);
      }
    } catch (err) {
      console.log('[WebSocketManager] Could not send initial location_update:', err);
    }
  };

  ws.onmessage = (event) => {
    try {
      console.log('[WebSocketManager] Raw message:', event.data);
      const data = JSON.parse(event.data);
      if (messageHandler) messageHandler(data);
    } catch (err) {
      console.log('WebSocket message parse error:', err);
    }
  };

  ws.onerror = (err) => {
    console.log('WebSocket error:', err);
    if (onError) onError(err);
    ws?.close();
  };

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
      delivery_id: deliveryId,
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