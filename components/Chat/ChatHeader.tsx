import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { PUBLIC_SQUARE_ROOM_ID } from '../../constants';

export const ChatHeader: React.FC = () => {
  const { currentRoom } = useAppContext();
  return (
    <header className="p-4 border-b border-gray-700">
      <h2 className="text-2xl font-bold truncate"># {currentRoom.name}</h2>
      <p className="text-gray-400">{currentRoom.id === PUBLIC_SQUARE_ROOM_ID ? "A global room for all users." : `Private room.`}</p>
    </header>
  );
};
