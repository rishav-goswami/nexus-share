
import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Icon } from '../Icon';
import { PUBLIC_SQUARE_ROOM_ID } from '../../constants';

export const Sidebar: React.FC = () => {
  const { 
    user, 
    isConnected, 
    joinedRooms, 
    currentRoom, 
    peers,
    unreadRooms,
    handleRoomChange, 
    handleJoinOrCreateRoom, 
    handleLogout 
  } = useAppContext();

  const sortedJoinedRooms = [...joinedRooms].sort((a, b) => {
    if (a.id === PUBLIC_SQUARE_ROOM_ID) return -1;
    if (b.id === PUBLIC_SQUARE_ROOM_ID) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <aside className="w-64 bg-gray-900 p-4 flex flex-col shrink-0">
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold text-white flex-grow">Nexus Share</h2>
        <div title={isConnected ? 'Connected' : 'Disconnected'}>
          {isConnected ? <Icon name="wifi" className="w-5 h-5 text-green-400" /> : <Icon name="wifi-off" className="w-5 h-5 text-red-400" />}
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
        {sortedJoinedRooms.map(room => (
          <button 
            key={room.id} 
            onClick={() => handleRoomChange(room)} 
            className={`w-full text-left p-2 rounded-md mb-1 flex items-center justify-between ${currentRoom.id === room.id ? 'bg-cyan-600 font-semibold' : 'hover:bg-gray-700'}`}
            title={room.name}
          >
            <span className="truncate"># {room.name}</span>
            {unreadRooms.has(room.id) && (
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full shrink-0 animate-pulse"></span>
            )}
          </button>
        ))}
        <button onClick={handleJoinOrCreateRoom} className="w-full text-left p-2 rounded-md flex items-center gap-2 text-gray-400 hover:bg-gray-700 hover:text-white">
          <Icon name="plus" className="w-4 h-4" /> Join or Create Room
        </button>
      </div>

      <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 flex items-center gap-2">
        <Icon name="users" className="w-4 h-4" />
        All Connected Peers ({peers.length})
      </h3>
      <div className="overflow-y-auto">
        {peers.map(p => (
          <div key={p.id} className="p-2 text-gray-300 truncate" title={p.name}>{p.name}</div>
        ))}
      </div>
    </aside>
  );
};