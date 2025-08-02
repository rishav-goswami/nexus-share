import React from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../Chat/ChatWindow';
import { useAppContext } from '../../contexts/AppContext';

export const MainLayout: React.FC = () => {
  const { isSidebarOpen, setIsSidebarOpen } = useAppContext();

  return (
    <div className="relative flex h-screen bg-gray-800 text-gray-200 font-sans overflow-hidden">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden"
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`
          absolute top-0 left-0 h-full z-30 transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <ChatWindow />
      </div>
    </div>
  );
};
