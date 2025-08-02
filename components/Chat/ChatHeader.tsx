import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { PUBLIC_SQUARE_ROOM_ID } from '../../constants';
import { Icon } from '../Icon';

export const ChatHeader: React.FC = () => {
  const { currentRoom, setIsSidebarOpen } = useAppContext();
  return (
    <header className="p-4 border-b border-gray-700 shrink-0 flex items-center gap-4">
      <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1 text-gray-400 hover:text-white">
          <Icon name="menu" className="w-6 h-6" />
      </button>
      <div>
        <h2 className="text-2xl font-bold truncate"># {currentRoom.name}</h2>
        <p className="text-gray-400">{currentRoom.id === PUBLIC_SQUARE_ROOM_ID ? "A global room for all users." : `Private room.`}</p>
      </div>
    </header>
  );
};
