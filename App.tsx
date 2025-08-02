
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
            <p className="mt-2 text-gray-400">Decentralized P2P Sharing for Code & Files</p>
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

// CodeFormattedMessage Component
const CodeFormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  if (!content.includes('```')) {
    return <p className="text-gray-300 whitespace-pre-wrap">{content}</p>;
  }

  const parts = content.split(/```/g);

  return (
    <div className="text-gray-300">
      {parts.map((part, index) => {
        if (index % 2 === 1) { // This is a code block
          const codeLines = part.split('\n');
          const language = codeLines[0].trim().toLowerCase();
          const code = codeLines.slice(1).join('\n').trim();
          return (
            <div key={index} className="bg-gray-900 rounded-md my-2">
              {language && <div className="text-xs text-gray-400 px-3 py-1 border-b border-gray-700">{language}</div>}
              <pre className="p-3 overflow-x-auto">
                <code className="text-sm font-mono text-cyan-300">{code}</code>
              </pre>
            </div>
          );
        } else { // This is regular text
          return <span key={index} className="whitespace-pre-wrap">{part}</span>;
        }
      })}
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
  const [isInitialized, setIsInitialized] = useState(false);
  
  const p2pServiceRef = useRef<P2PService | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);
  
  // Check for persisted user on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('nexus-user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser) as User;
        handleLogin(parsedUser.name, parsedUser.id);
      }
    } catch (error) {
        console.error("Failed to parse saved user", error);
        localStorage.removeItem('nexus-user');
    } finally {
        setIsInitialized(true);
    }
  }, []);

  // Load items for the current room
  useEffect(() => {
    if (user) {
        storageService.getItems(currentRoom.id).then(setItems);
    }
  }, [currentRoom, user]);

  const handleLogin = (name: string, existingId?: string) => {
    const newUser: User = { id: existingId || crypto.randomUUID(), name };
    localStorage.setItem('nexus-user', JSON.stringify(newUser));
    setUser(newUser);
    
    if (p2pServiceRef.current) {
        p2pServiceRef.current.disconnect();
    }

    const p2p = new P2PService(newUser, {
      onPeerListUpdate: setPeers,
      onItemReceived: (item) => {
        if(item.roomId === p2pServiceRef.current?.['currentRoomId']) {
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
  };
  
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
        p2pServiceRef.current?.disconnect();
        p2pServiceRef.current = null;
        localStorage.removeItem('nexus-user');
        setUser(null);
        setPeers([]);
        setItems([]);
        setCurrentRoom(PUBLIC_SQUARE_ROOM);
        setRooms([PUBLIC_SQUARE_ROOM]);
        setIsConnected(false);
        setFileTransfers({});
    }
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
    // Reset file input
    if(fileInputRef.current) fileInputRef.current.value = "";
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
        // Optionally, add the item back to state or show an error.
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

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={(name) => handleLogin(name)} />;
  }

  return (
    <div className="flex h-screen bg-gray-800 text-gray-200 font-sans">
      {/* Left Sidebar */}
      <aside className="w-64 bg-gray-900 p-4 flex flex-col shrink-0">
        <div className="flex items-center mb-4">
            <h2 className="text-xl font-bold text-white flex-grow">Nexus Share</h2>
            <div title={isConnected ? 'Connected' : 'Disconnected'}>
                {isConnected ? <Icon name="wifi" className="w-5 h-5 text-green-400"/> : <Icon name="wifi-off" className="w-5 h-5 text-red-400"/>}
            </div>
        </div>
        <div className="mb-2">
            <div className="flex items-center gap-2 p-2 rounded-md bg-gray-700">
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-gray-900 shrink-0">{user.name.charAt(0).toUpperCase()}</div>
                <span className="font-semibold truncate">{user.name}</span>
            </div>
             <button onClick={handleLogout} className="w-full mt-2 p-2 flex items-center justify-center gap-2 rounded-md bg-gray-700 hover:bg-red-800 transition-colors text-white font-semibold">
                <Icon name="logout" className="w-5 h-5" />
                <span>Logout</span>
            </button>
        </div>

        <h3 className="text-xs font-bold uppercase text-gray-400 mt-4 mb-2">Rooms</h3>
        <div className="flex-grow overflow-y-auto mb-4">
          {rooms.map(room => (
            <button key={room.id} onClick={() => handleRoomChange(room)} className={`w-full text-left p-2 rounded-md mb-1 truncate ${currentRoom.id === room.id ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>
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
            <div key={p.id} className="p-2 text-gray-300 truncate" title={p.name}>{p.name}</div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="p-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold truncate"># {currentRoom.name}</h2>
          <p className="text-gray-400">{currentRoom.id === PUBLIC_SQUARE_ROOM_ID ? "A global room for all users." : `Private room.`}</p>
        </header>

        <div className="flex-1 p-4 overflow-y-auto" id="chat-window">
          {items.map(item => (
            <div key={item.id} className="group flex gap-3 mb-4 relative">
               {user && item.sender.id === user.id && (
                <button onClick={() => handleDeleteItem(item)} className="absolute top-0 right-0 p-1 bg-gray-700 rounded-full text-gray-400 hover:bg-red-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Delete">
                    <Icon name="trash" className="w-4 h-4"/>
                </button>
               )}
              <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center font-bold">{item.sender.name.charAt(0).toUpperCase()}</div>
              <div className="flex-grow max-w-[calc(100%-52px)]">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white truncate">{item.sender.name}</span>
                  <span className="text-xs text-gray-500 shrink-0">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
                {item.type === 'text' ? (
                  <CodeFormattedMessage content={item.content} />
                ) : (
                  <div className="p-3 bg-gray-700 rounded-lg mt-1 flex items-center gap-4">
                    <div className="flex-grow overflow-hidden">
                      <p className="font-semibold truncate">{item.fileInfo.name}</p>
                      <p className="text-sm text-gray-400">{formatBytes(item.fileInfo.size)}</p>
                    </div>
                    {fileTransfers[item.id]?.status === 'completed' ? (
                        <button onClick={() => handleSaveFile(item.id)} className="p-2 bg-green-500 rounded-full hover:bg-green-600 transition-colors shrink-0">
                            <Icon name="check" className="w-5 h-5 text-white" />
                        </button>
                    ) : fileTransfers[item.id]?.status === 'progress' ? (
                        <div className="flex items-center gap-2 shrink-0">
                            <Spinner size="sm"/>
                            <span className="text-xs text-gray-400">{formatBytes(fileTransfers[item.id].receivedSize)}</span>
                        </div>
                    ) : (
                        <button onClick={() => handleFileDownload(item)} className="p-2 bg-cyan-600 rounded-full hover:bg-cyan-700 transition-colors shrink-0">
                            <Icon name="download" className="w-5 h-5 text-white" />
                        </button>
                    )}
                  </div>
                )}
                 {fileTransfers[item.id] && fileTransfers[item.id].status !== 'completed' && fileTransfers[item.id].totalSize > 0 && (
                    <div className="mt-2">
                        <div className="w-full bg-gray-600 rounded-full h-1.5">
                            <div className="bg-cyan-500 h-1.5 rounded-full" style={{width: `${(fileTransfers[item.id].receivedSize / fileTransfers[item.id].totalSize) * 100}%`}}></div>
                        </div>
                    </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-gray-700">
          <div className="bg-gray-700 rounded-lg flex items-center p-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
              }}
              placeholder={`Message #${currentRoom.name} (Shift+Enter for new line)`}
              className="w-full p-2 bg-transparent focus:outline-none resize-none max-h-40"
              rows={1}
            />
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white self-end">
                <Icon name="paper-clip" />
            </button>
            <button onClick={handleSendMessage} disabled={!message.trim()} className="p-2 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed self-end">
                <Icon name="paper-airplane" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
