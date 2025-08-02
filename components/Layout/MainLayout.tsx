import React from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../Chat/ChatWindow';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-800 text-gray-200 font-sans">
      <Sidebar />
      <ChatWindow />
    </div>
  );
};
