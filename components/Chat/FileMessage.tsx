import React from 'react';
import type { FileAnnouncement } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { Icon } from '../Icon';
import { Spinner } from '../Spinner';

interface FileMessageProps {
  item: FileAnnouncement;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const FileMessage: React.FC<FileMessageProps> = ({ item }) => {
  const { fileTransfers, handleFileDownload, handleSaveFile } = useAppContext();
  const transfer = fileTransfers[item.id];

  return (
    <>
      <div className="p-3 bg-gray-700 rounded-lg mt-1 flex items-center gap-4">
        <div className="flex-grow overflow-hidden">
          <p className="font-semibold truncate">{item.fileInfo.name}</p>
          <p className="text-sm text-gray-400">{formatBytes(item.fileInfo.size)}</p>
        </div>
        {transfer?.status === 'completed' ? (
            <button onClick={() => handleSaveFile(item.id)} className="p-2 bg-green-500 rounded-full hover:bg-green-600 transition-colors shrink-0">
                <Icon name="check" className="w-5 h-5 text-white" />
            </button>
        ) : transfer?.status === 'progress' ? (
            <div className="flex items-center gap-2 shrink-0">
                <Spinner size="sm"/>
                <span className="text-xs text-gray-400">{formatBytes(transfer.receivedSize)}</span>
            </div>
        ) : (
            <button onClick={() => handleFileDownload(item)} className="p-2 bg-cyan-600 rounded-full hover:bg-cyan-700 transition-colors shrink-0">
                <Icon name="download" className="w-5 h-5 text-white" />
            </button>
        )}
      </div>
      {transfer && transfer.status !== 'completed' && transfer.totalSize > 0 && (
        <div className="mt-2">
            <div className="w-full bg-gray-600 rounded-full h-1.5">
                <div className="bg-cyan-500 h-1.5 rounded-full" style={{width: `${(transfer.receivedSize / transfer.totalSize) * 100}%`}}></div>
            </div>
        </div>
      )}
    </>
  );
};
