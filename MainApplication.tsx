
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppContext } from './contexts/AppContext';
import type { User, Room, SharedItem, FileAnnouncement, FileTransferProgress } from './types';
import { P2PService } from './services/p2p.service';
import { storageService } from './services/storage.service';
import { PUBLIC_SQUARE_ROOM, PUBLIC_SQUARE_ROOM_ID } from './constants';
import { MainLayout } from './components/Layout/MainLayout';

interface MainApplicationProps {
  user: User;
  onLogout: () => void;
}

const MainApplication: React.FC<MainApplicationProps> = ({ user, onLogout }) => {
  const [currentRoom, setCurrentRoom] = useState<Room>(PUBLIC_SQUARE_ROOM);
  const [joinedRooms, setJoinedRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('nexus-rooms');
    try {
        const initial = saved ? JSON.parse(saved) : [PUBLIC_SQUARE_ROOM];
        if (!initial.some((r: Room) => r.id === PUBLIC_SQUARE_ROOM_ID)) {
            initial.push(PUBLIC_SQUARE_ROOM);
        }
        return initial;
    } catch {
        return [PUBLIC_SQUARE_ROOM];
    }
  });
  const [allRooms, setAllRooms] = useState<Room[]>(joinedRooms);
  const [peers, setPeers] = useState<User[]>([]);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [fileTransfers, setFileTransfers] = useState<Record<string, FileTransferProgress>>({});
  const [now, setNow] = useState(() => Date.now());
  const [unreadRooms, setUnreadRooms] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const p2pServiceRef = useRef<P2PService | null>(null);
  const currentRoomRef = useRef(currentRoom);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    localStorage.setItem('nexus-rooms', JSON.stringify(joinedRooms));
  }, [joinedRooms]);

  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      setItems(prevItems => prevItems.filter(item => currentTime < item.expiresAt));
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const p2p = new P2PService(user, {
      onPeerListUpdate: setPeers,
      onItemReceived: (item) => {
        if (item.roomId !== currentRoomRef.current.id) {
            setUnreadRooms(prev => new Set(prev).add(item.roomId));
        }
        if (item.roomId === currentRoomRef.current.id) {
            setItems(prev => {
                if (prev.some(i => i.id === item.id)) return prev;
                return [...prev, item].sort((a,b) => a.createdAt - b.createdAt);
            });
        }
      },
      onItemDeleted: (itemId, roomId) => {
        if (roomId === currentRoomRef.current.id) {
            setItems(prev => prev.filter(i => i.id !== itemId));
        }
      },
      onFileProgress: (progress) => {
        setFileTransfers(prev => ({ ...prev, [progress.fileId]: progress }));
      },
      onConnected: () => {
        setIsConnected(true);
        joinedRooms.forEach(room => p2pServiceRef.current?.joinRoom(room));
      },
      onDisconnected: () => setIsConnected(false),
      onRoomListUpdate: (receivedRooms: Room[]) => {
        setAllRooms(prevRooms => {
          const roomMap = new Map(prevRooms.map(r => [r.id, r]));
          receivedRooms.forEach(r => roomMap.set(r.id, r));
          
          if (!roomMap.has(PUBLIC_SQUARE_ROOM.id)) {
            roomMap.set(PUBLIC_SQUARE_ROOM.id, PUBLIC_SQUARE_ROOM);
          }

          const sortedRooms = Array.from(roomMap.values()).sort((a, b) => {
              if (a.id === PUBLIC_SQUARE_ROOM.id) return -1;
              if (b.id === PUBLIC_SQUARE_ROOM.id) return 1;
              return a.name.localeCompare(b.name);
          });
          return sortedRooms;
        });
      },
    });
    p2pServiceRef.current = p2p;
    p2p.connect();

    return () => {
      p2p.disconnect();
      p2pServiceRef.current = null;
    };
  }, [user, joinedRooms]);

  useEffect(() => {
    storageService.getItems(currentRoom.id)
        .then(storedItems => setItems(storedItems.sort((a,b) => a.createdAt - b.createdAt)))
        .catch(err => {
            console.error(`Failed to get items for room ${currentRoom.id}:`, err);
            setItems([]);
        });
  }, [currentRoom]);

  const handleLogout = () => {
    p2pServiceRef.current?.disconnect();
    onLogout();
  };

  const handleSendMessage = async (messageContent: string, ttlMs: number) => {
    if (!messageContent.trim()) return;
    const nowTs = Date.now();
    const newItem: SharedItem = {
      id: crypto.randomUUID(),
      type: 'text',
      content: messageContent,
      sender: user,
      createdAt: nowTs,
      expiresAt: nowTs + ttlMs,
      roomId: currentRoom.id,
    };
    try {
        await storageService.addItem(newItem);
        setItems(prev => [...prev, newItem]);
        p2pServiceRef.current?.broadcastItem(newItem);
    } catch (err) {
        console.error("Failed to store and send message:", err);
        alert("Failed to send message. See console for details.");
    }
  };

  const handleFileSelect = async (file: File, ttlMs: number) => {
    const fileId = crypto.randomUUID();
    const fileInfo = { name: file.name, size: file.size, type: file.type };
    const nowTs = Date.now();
    const announcement: FileAnnouncement = {
      id: fileId,
      type: 'file',
      fileInfo,
      sender: user,
      createdAt: nowTs,
      expiresAt: nowTs + ttlMs,
      roomId: currentRoom.id,
    };

    try {
        await storageService.storeFile(fileId, file);
        await storageService.addItem(announcement);
        setItems(prev => [...prev, announcement]);
        p2pServiceRef.current?.broadcastItem(announcement);
    } catch(err) {
        console.error("Failed to store and announce file:", err);
        alert("Failed to send file. See console for details.");
    }
  };

  const handleDeleteItem = async (item: SharedItem) => {
    if (!window.confirm("Are you sure you want to delete this? It will be removed from your local storage and for other online peers.")) return;
    
    try {
        setItems(prev => prev.filter(i => i.id !== item.id));
        p2pServiceRef.current?.broadcastDeleteItem(item);
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
    if (currentRoom.id === room.id) return;
    setCurrentRoom(room);
    setUnreadRooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(room.id);
        return newSet;
    });
    setIsSidebarOpen(false); // Close sidebar on room change on mobile
  };

  const handleJoinOrCreateRoom = () => {
    const name = prompt("Enter room name to join or create:");
    if (name && name.trim()) {
      const trimmedName = name.trim();
      const roomId = `user-room-${trimmedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
      
      const roomToJoin: Room = { id: roomId, name: trimmedName };
      if (!joinedRooms.some(r => r.id === roomToJoin.id)) {
          setJoinedRooms(prev => [...prev, roomToJoin]);
      }
      handleRoomChange(roomToJoin);
    }
  };

  const handleFileDownload = useCallback((item: FileAnnouncement) => {
    p2pServiceRef.current?.requestFile(item);
  }, []);
  
  const handleSaveFile = useCallback(async (fileId: string) => {
    try {
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
    } catch(err) {
        console.error("Failed to save file:", err);
        alert("Failed to save file. See console for details.");
    }
  }, [fileTransfers]);

  const visibleItems = items.filter(item => now < item.expiresAt);

  return (
    <AppContext.Provider value={{
      user,
      currentRoom,
      rooms: allRooms,
      joinedRooms,
      peers,
      items: visibleItems,
      isConnected,
      fileTransfers,
      now,
      unreadRooms,
      isSidebarOpen,
      setIsSidebarOpen,
      handleJoinOrCreateRoom,
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
