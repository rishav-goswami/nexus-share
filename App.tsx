
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User, Room, SharedItem, FileAnnouncement, FileTransferProgress } from './types';
import { P2PService } from './services/p2p.service';
import { storageService } from './services/storage.service';
import { PUBLIC_SQUARE_ROOM, PUBLIC_SQUARE_ROOM_ID } from './constants';
import { Icon } from './components/Icon';
import { Spinner } from './components/Spinner';

// Helper to format file size
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// LoginScreen Component
const LoginScreen: React.FC<{ onLogin: (name: string) => void }> = ({ onLogin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-white">Nexus Share</h1>
            <p className="mt-2 text-gray-400">Decentralized P2P Sharing</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your display name"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 px-4 font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
};

// Main App
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room>(PUBLIC_SQUARE_ROOM);
  const [rooms, setRooms] = useState<Room[]>([PUBLIC_SQUARE_ROOM]);
  const [peers, setPeers] = useState<User[]>([]);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [fileTransfers, setFileTransfers] = useState<Record<string, FileTransferProgress>>({});
  
  const p2pServiceRef = useRef<P2PService | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load items for the current room
  useEffect(() => {
    if (user) {
        storageService.getItems(currentRoom.id).then(setItems);
    }
  }, [currentRoom, user]);

  const handleLogin = (name: string) => {
    const newUser: User = { id: crypto.randomUUID(), name };
    setUser(newUser);
    
    const p2p = new P2PService(newUser, {
      onPeerListUpdate: setPeers,
      onItemReceived: (item) => {
        setItems(prev => [...prev, item]);
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
  };

  const handleSendMessage = () => {
    if (!message.trim() || !user || !p2pServiceRef.current) return;
    const newItem: SharedItem = {
      id: crypto.randomUUID(),
      type: 'text',
      content: message,
      sender: user,
      timestamp: Date.now(),
      roomId: currentRoom.id,
    };
    storageService.addItem(newItem).then(() => {
        setItems(prev => [...prev, newItem]);
        p2pServiceRef.current?.broadcastItem(newItem);
        setMessage('');
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !p2pServiceRef.current) return;
    
    const fileId = crypto.randomUUID();
    const fileInfo = { name: file.name, size: file.size, type: file.type };
    const announcement: FileAnnouncement = {
      id: fileId,
      type: 'file',
      fileInfo,
      sender: user,
      timestamp: Date.now(),
      roomId: currentRoom.id,
    };

    storageService.storeFile(fileId, file).then(() => {
      storageService.addItem(announcement).then(() => {
        setItems(prev => [...prev, announcement]);
        p2pServiceRef.current?.broadcastItem(announcement);
      });
    });
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

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-800 text-gray-200 font-sans">
      {/* Left Sidebar */}
      <aside className="w-64 bg-gray-900 p-4 flex flex-col">
        <div className="flex items-center mb-4">
            <h2 className="text-xl font-bold text-white flex-grow">Nexus Share</h2>
            <div title={isConnected ? 'Connected' : 'Disconnected'}>
                {isConnected ? <Icon name="wifi" className="w-5 h-5 text-green-400"/> : <Icon name="wifi-off" className="w-5 h-5 text-red-400"/>}
            </div>
        </div>
        <div className="mb-4">
            <div className="flex items-center gap-2 p-2 rounded-md bg-gray-700">
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-gray-900">{user.name.charAt(0).toUpperCase()}</div>
                <span className="font-semibold">{user.name}</span>
            </div>
        </div>

        <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">Rooms</h3>
        <div className="flex-grow overflow-y-auto mb-4">
          {rooms.map(room => (
            <button key={room.id} onClick={() => handleRoomChange(room)} className={`w-full text-left p-2 rounded-md mb-1 ${currentRoom.id === room.id ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>
              # {room.name}
            </button>
          ))}
          <button onClick={handleCreateRoom} className="w-full text-left p-2 rounded-md flex items-center gap-2 text-gray-400 hover:bg-gray-700 hover:text-white">
            <Icon name="plus" className="w-4 h-4" /> Create Room
          </button>
        </div>

        <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 flex items-center gap-2">
            <Icon name="users" className="w-4 h-4"/>
            Peers in room ({peers.length})
        </h3>
        <div className="overflow-y-auto">
          {peers.map(p => (
            <div key={p.id} className="p-2 text-gray-300">{p.name}</div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="p-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold"># {currentRoom.name}</h2>
          <p className="text-gray-400">{currentRoom.id === PUBLIC_SQUARE_ROOM_ID ? "A global room for all users." : `Private room.`}</p>
        </header>

        <div className="flex-1 p-4 overflow-y-auto" id="chat-window">
          {items.map(item => (
            <div key={item.id} className="flex gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center font-bold">{item.sender.name.charAt(0).toUpperCase()}</div>
              <div className="flex-grow">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white">{item.sender.name}</span>
                  <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
                {item.type === 'text' ? (
                  <p className="text-gray-300">{item.content}</p>
                ) : (
                  <div className="p-3 bg-gray-700 rounded-lg mt-1 flex items-center gap-4">
                    <div className="flex-grow">
                      <p className="font-semibold">{item.fileInfo.name}</p>
                      <p className="text-sm text-gray-400">{formatBytes(item.fileInfo.size)}</p>
                    </div>
                    {fileTransfers[item.id]?.status === 'completed' ? (
                        <button onClick={() => handleSaveFile(item.id)} className="p-2 bg-green-500 rounded-full hover:bg-green-600 transition-colors">
                            <Icon name="check" className="w-5 h-5 text-white" />
                        </button>
                    ) : fileTransfers[item.id]?.status === 'progress' ? (
                        <div className="flex items-center gap-2">
                            <Spinner size="sm"/>
                            <span className="text-xs text-gray-400">{formatBytes(fileTransfers[item.id].receivedSize)}</span>
                        </div>
                    ) : (
                        <button onClick={() => handleFileDownload(item)} className="p-2 bg-cyan-600 rounded-full hover:bg-cyan-700 transition-colors">
                            <Icon name="download" className="w-5 h-5 text-white" />
                        </button>
                    )}
                  </div>
                )}
                 {fileTransfers[item.id] && (
                    <div className="mt-2">
                        <div className="w-full bg-gray-600 rounded-full h-1.5">
                            <div className="bg-cyan-500 h-1.5 rounded-full" style={{width: `${(fileTransfers[item.id].receivedSize / fileTransfers[item.id].totalSize) * 100}%`}}></div>
                        </div>
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-700">
          <div className="bg-gray-700 rounded-lg flex items-center p-1">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Message #${currentRoom.name}`}
              className="w-full p-2 bg-transparent focus:outline-none"
            />
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white">
                <Icon name="paper-clip" />
            </button>
            <button onClick={handleSendMessage} disabled={!message.trim()} className="p-2 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed">
                <Icon name="paper-airplane" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
