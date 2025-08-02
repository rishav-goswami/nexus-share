
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppContext } from './contexts/AppContext';
import type { User, Room, SharedItem, FileAnnouncement, FileTransferProgress } from './types';
import { P2PService } from './services/p2p.service';
import { storageService } from './services/storage.service';
import { PUBLIC_SQUARE_ROOM } from './constants';
import { MainLayout } from './components/Layout/MainLayout';

interface MainApplicationProps {
  user: User;
  onLogout: () => void;
}

const MainApplication: React.FC<MainApplicationProps> = ({ user, onLogout }) => {
  const [currentRoom, setCurrentRoom] = useState<Room>(PUBLIC_SQUARE_ROOM);
  const [rooms, setRooms] = useState<Room[]>([PUBLIC_SQUARE_ROOM]);
  const [peers, setPeers] = useState<User[]>([]);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [fileTransfers, setFileTransfers] = useState<Record<string, FileTransferProgress>>({});
  const [now, setNow] = useState(() => Date.now());
  
  const p2pServiceRef = useRef<P2PService | null>(null);

  // TTL update timer
  useEffect(() => {
    // This timer updates the "now" state, which forces re-rendering of TTL countdowns
    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      // Also, check if any visible items have expired and remove them
      setItems(prevItems => prevItems.filter(item => currentTime < item.expiresAt));
    }, 60 * 1000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const p2p = new P2PService(user, {
      onPeerListUpdate: setPeers,
      onItemReceived: (item) => {
        if(item.roomId === p2pServiceRef.current?.currentRoomId) {
          setItems(prev => [...prev, item]);
        }
      },
      onFileProgress: (progress) => {
        setFileTransfers(prev => ({ ...prev, [progress.fileId]: progress }));
      },
      onConnected: () => {
        setIsConnected(true);
        p2p.joinRoom(currentRoom.id);
      },
      onDisconnected: () => setIsConnected(false),
    });
    p2pServiceRef.current = p2p;
    p2p.connect();

    return () => {
      p2p.disconnect();
      p2pServiceRef.current = null;
    };
  }, [user]);

  // Load items for the current room
  useEffect(() => {
    storageService.getItems(currentRoom.id).then(setItems);
  }, [currentRoom]);

  const handleLogout = () => {
    p2pServiceRef.current?.disconnect();
    onLogout();
  };

  const handleSendMessage = (messageContent: string, ttlMs: number) => {
    if (!messageContent.trim()) return;
    const now = Date.now();
    const newItem: SharedItem = {
      id: crypto.randomUUID(),
      type: 'text',
      content: messageContent,
      sender: user,
      createdAt: now,
      expiresAt: now + ttlMs,
      roomId: currentRoom.id,
    };
    storageService.addItem(newItem).then(() => {
        setItems(prev => [...prev, newItem]);
        p2pServiceRef.current?.broadcastItem(newItem);
    });
  };

  const handleFileSelect = (file: File, ttlMs: number) => {
    const fileId = crypto.randomUUID();
    const fileInfo = { name: file.name, size: file.size, type: file.type };
    const now = Date.now();
    const announcement: FileAnnouncement = {
      id: fileId,
      type: 'file',
      fileInfo,
      sender: user,
      createdAt: now,
      expiresAt: now + ttlMs,
      roomId: currentRoom.id,
    };

    storageService.storeFile(fileId, file).then(() => {
      storageService.addItem(announcement).then(() => {
        setItems(prev => [...prev, announcement]);
        p2pServiceRef.current?.broadcastItem(announcement);
      });
    });
  };

  const handleDeleteItem = async (item: SharedItem) => {
    if (!window.confirm("Are you sure you want to delete this? It will be removed from your local storage.")) return;
    
    try {
        setItems(prev => prev.filter(i => i.id !== item.id));
        await storageService.deleteItem(item.id);
        if (item.type === 'file') {
            await storageService.deleteFile(item.id);
            setFileTransfers(prev => {
                const updated = { ...prev };
                delete updated[item.id];
                return updated;
            });
        }
    } catch (err) {
        console.error("Failed to delete item:", err);
    }
  };

  const handleRoomChange = (room: Room) => {
    setCurrentRoom(room);
    p2pServiceRef.current?.joinRoom(room.id);
  };

  const handleCreateRoom = () => {
    const name = prompt("Enter new room name:");
    if (name) {
      const newRoom: Room = { id: crypto.randomUUID(), name };
      setRooms(prev => [...prev, newRoom]);
      handleRoomChange(newRoom);
    }
  };

  const handleFileDownload = useCallback((item: FileAnnouncement) => {
    p2pServiceRef.current?.requestFile(item);
  }, []);
  
  const handleSaveFile = useCallback(async (fileId: string) => {
    const blob = await storageService.getFile(fileId);
    const transfer = fileTransfers[fileId];
    if (blob && transfer) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = transfer.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    }
  }, [fileTransfers]);

  const visibleItems = items.filter(item => now < item.expiresAt);

  return (
    <AppContext.Provider value={{
      user,
      currentRoom,
      rooms,
      peers,
      items: visibleItems,
      isConnected,
      fileTransfers,
      now,
      handleCreateRoom,
      handleDeleteItem,
      handleFileDownload,
      handleFileSelect,
      handleLogout,
      handleRoomChange,
      handleSaveFile,
      handleSendMessage,
    }}>
      <MainLayout />
    </AppContext.Provider>
  );
};

export default MainApplication;
