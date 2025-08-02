
import { Room } from './types';

export const SIGNALING_SERVER_URL = 'ws://localhost:8080'; // Replace with your deployed server URL

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
