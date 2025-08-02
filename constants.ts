
import { Room } from './types';

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
export const SIGNALING_SERVER_URL = `${wsProtocol}//${window.location.hostname}:8080`;

export const PUBLIC_SQUARE_ROOM_ID = 'public-square';

export const PUBLIC_SQUARE_ROOM: Room = {
  id: PUBLIC_SQUARE_ROOM_ID,
  name: 'Public Square',
};

export const DB_NAME = 'NexusShareDB';
export const DB_VERSION = 1;
export const ITEMS_STORE_NAME = 'shared_items';
export const FILES_STORE_NAME = 'files';

export const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

export const TTL_OPTIONS: Record<string, number> = {
    '5 minutes': 5 * 60 * 1000,
    '1 hour': 60 * 60 * 1000,
    '6 hours': 6 * 60 * 60 * 1000,
    '24 hours': 24 * 60 * 60 * 1000,
};
