
import React from 'react';
import type { SharedItem } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { formatTimeRemaining } from '../../utils';
import { Icon } from '../Icon';
import { TextMessage } from './TextMessage';
import { FileMessage } from './FileMessage';

interface MessageItemProps {
  item: SharedItem;
}

export const MessageItem: React.FC<MessageItemProps> = ({ item }) => {
  const { user, now, handleDeleteItem } = useAppContext();
  
  return (
    <div className="group flex gap-3 mb-4 relative">
      {user && item.sender.id === user.id && (
        <button onClick={() => handleDeleteItem(item)} className="absolute top-0 right-0 p-1 bg-gray-700 rounded-full text-gray-400 hover:bg-red-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Delete">
          <Icon name="trash" className="w-4 h-4" />
        </button>
      )}
      <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center font-bold">{item.sender.name.charAt(0).toUpperCase()}</div>
      <div className="flex-grow max-w-[calc(100%-52px)]">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-white truncate">{item.sender.name}</span>
          <span className="text-xs text-gray-500 shrink-0">{new Date(item.createdAt).toLocaleTimeString()}</span>
          <span className="text-xs text-gray-500 shrink-0 select-none" title={`Expires on ${new Date(item.expiresAt).toLocaleString()}`}>
            · {formatTimeRemaining(item.expiresAt, now)}
          </span>
        </div>
        {item.type === 'text' ? (
          <TextMessage content={item.content} />
        ) : (
          <FileMessage item={item} />
        )}
      </div>
    </div>
  );
};
