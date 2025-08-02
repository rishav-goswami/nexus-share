
import React, { createContext, useContext } from 'react';
import type { User, Room, SharedItem, FileAnnouncement, FileTransferProgress } from '../types';

interface AppContextType {
  user: User;
  currentRoom: Room;
  rooms: Room[]; // All discoverable rooms
  joinedRooms: Room[]; // Rooms the user has joined
  peers: User[];
  items: SharedItem[];
  isConnected: boolean;
  fileTransfers: Record<string, FileTransferProgress>;
  now: number;
  unreadRooms: Set<string>;
  handleJoinOrCreateRoom: () => void;
  handleDeleteItem: (item: SharedItem) => Promise<void>;
  handleFileDownload: (item: FileAnnouncement) => void;
  handleFileSelect: (file: File, ttlMs: number) => void;
  handleLogout: () => void;
  handleRoomChange: (room: Room) => void;
  handleSaveFile: (fileId: string) => Promise<void>;
  handleSendMessage: (message: string, ttlMs: number) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};