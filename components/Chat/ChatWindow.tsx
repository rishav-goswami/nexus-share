import React from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export const ChatWindow: React.FC = () => {
  return (
    <main className="flex-1 flex flex-col">
      <ChatHeader />
      <MessageList />
      <MessageInput />
    </main>
  );
};
