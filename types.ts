
export interface User {
  id: string;
  name: string;
}

export interface BaseItem {
  id: string;
  sender: User;
  createdAt: number; // Changed from timestamp
  expiresAt: number; // Added for TTL
  roomId: string;
}

export interface Message extends BaseItem {
  type: 'text';
  content: string;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
}

export interface FileAnnouncement extends BaseItem {
  type: 'file';
  fileInfo: FileInfo;
}

export type SharedItem = Message | FileAnnouncement;

export interface Room {
  id: string;
  name: string;
}

// P2P Service Related Types
export type SignalingMessage =
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'candidate'; candidate: RTCIceCandidateInit };

export type DataChannelMessage =
  | { type: 'file-request'; fileId: string; }
  | { type: 'file-transfer-start'; fileId: string; fileInfo: FileInfo; }
  | { type: 'file-transfer-end'; fileId: string; }
  | SharedItem;

export interface FileTransferProgress {
    fileId: string;
    fileName: string;
    receivedSize: number;
    totalSize: number;
    status: 'starting' | 'progress' | 'completed' | 'failed';
    error?: string;
}