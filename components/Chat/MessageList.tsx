import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { MessageItem } from './MessageItem';

export const MessageList: React.FC = () => {
  const { items } = useAppContext();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  return (
    <div className="flex-1 p-4 overflow-y-auto" id="chat-window">
      {items.map(item => (
        <MessageItem key={item.id} item={item} />
      ))}
      <div ref={chatEndRef} />
    </div>
  );
};
