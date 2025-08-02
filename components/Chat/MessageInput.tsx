
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Icon } from '../Icon';
import { MESSAGE_TTL_MS, TTL_OPTIONS } from '../../constants';

export const MessageInput: React.FC = () => {
  const { handleSendMessage, handleFileSelect, currentRoom } = useAppContext();
  const [message, setMessage] = useState('');
  const [selectedTtl, setSelectedTtl] = useState<number>(MESSAGE_TTL_MS);
  const [isTtlMenuOpen, setIsTtlMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ttlMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        textarea.style.height = `${scrollHeight}px`;
    }
  }, [message]);

  // Close TTL menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (ttlMenuRef.current && !ttlMenuRef.current.contains(event.target as Node)) {
            setIsTtlMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onSendMessage = () => {
    if (message.trim()) {
      handleSendMessage(message, selectedTtl);
      setMessage('');
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, selectedTtl);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleFormat = (type: 'bold' | 'italic' | 'code') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);

    let markdown: string;
    let cursorPos: number;

    switch (type) {
        case 'bold':
            markdown = `**${selectedText}**`;
            cursorPos = start === end ? start + 2 : end + 4;
            break;
        case 'italic':
            markdown = `*${selectedText}*`;
            cursorPos = start === end ? start + 1 : end + 2;
            break;
        case 'code':
            markdown = `\`\`\`\n${selectedText}\n\`\`\``;
            cursorPos = start === end ? start + 4 : start + markdown.length;
            break;
    }
    
    const newMessage = `${message.substring(0, start)}${markdown}${message.substring(end)}`;
    setMessage(newMessage);

    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };
  
  const selectedTtlLabel = Object.keys(TTL_OPTIONS).find(key => TTL_OPTIONS[key] === selectedTtl) || 'Custom';

  return (
    <div className="p-4 border-t border-gray-700">
      <div className="bg-gray-700 rounded-lg flex flex-col border border-gray-600 focus-within:ring-2 focus-within:ring-cyan-500 transition">
        <div className="flex items-center p-1 border-b border-gray-600">
            <button onClick={() => handleFormat('bold')} title="Bold" className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded">
                <Icon name="bold" className="w-5 h-5" />
            </button>
            <button onClick={() => handleFormat('italic')} title="Italic" className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded">
                <Icon name="italic" className="w-5 h-5" />
            </button>
            <button onClick={() => handleFormat('code')} title="Code Block" className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded">
                <Icon name="code-bracket" className="w-5 h-5" />
            </button>
        </div>
        <div className="flex items-start p-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSendMessage();
                }
              }}
              placeholder={`Message #${currentRoom.name} (Shift+Enter for new line)`}
              className="w-full p-2 bg-transparent focus:outline-none resize-none font-mono"
              rows={1}
              style={{maxHeight: '20rem'}}
            />
            <div className="relative self-end" ref={ttlMenuRef}>
                <button onClick={() => setIsTtlMenuOpen(prev => !prev)} className="p-2 text-gray-400 hover:text-white" title={`Time-to-Live: ${selectedTtlLabel}`}>
                    <Icon name="clock" />
                </button>
                {isTtlMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-36 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20">
                        {Object.entries(TTL_OPTIONS).map(([label, value]) => (
                            <button
                                key={value}
                                onClick={() => {
                                    setSelectedTtl(value);
                                    setIsTtlMenuOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-cyan-600 ${selectedTtl === value ? 'bg-cyan-700' : ''}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white self-end" title="Attach file">
                <Icon name="paper-clip" />
            </button>
            <button onClick={onSendMessage} disabled={!message.trim()} className="p-2 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed self-end" title="Send message">
                <Icon name="paper-airplane" />
            </button>
        </div>
      </div>
    </div>
  );
};
