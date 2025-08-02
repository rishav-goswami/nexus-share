
import { SIGNALING_SERVER_URL, ICE_SERVERS } from '../constants';
import type { User, SharedItem, FileInfo, SignalingMessage, DataChannelMessage, FileTransferProgress, FileAnnouncement } from '../types';
import { storageService } from './storage.service';

interface P2PHandlers {
  onPeerListUpdate: (peers: User[]) => void;
  onItemReceived: (item: SharedItem) => void;
  onFileProgress: (progress: FileTransferProgress) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}

export class P2PService {
  private ws: WebSocket | null = null;
  private user: User;
  private handlers: P2PHandlers;
  private peers: Map<string, { user: User; pc: RTCPeerConnection; dc?: RTCDataChannel }> = new Map();
  private incomingFileTransfers: Map<string, { chunks: BlobPart[], info: FileInfo, receivedSize: number }> = new Map();
  private _currentRoomId: string | null = null;
  
  constructor(user: User, handlers: P2PHandlers) {
    this.user = user;
    this.handlers = handlers;
  }

  public get currentRoomId(): string | null {
    return this._currentRoomId;
  }

  connect() {
    this.ws = new WebSocket(SIGNALING_SERVER_URL);
    this.ws.onopen = () => {
      console.log('Connected to signaling server.');
      this.handlers.onConnected();
    };
    this.ws.onmessage = (message) => this.handleSignalingMessage(message.data);
    this.ws.onclose = () => {
      console.log('Disconnected from signaling server.');
      this.handlers.onDisconnected();
      this.peers.clear();
      this.handlers.onPeerListUpdate([]);
    };
    this.ws.onerror = (error) => {
      console.error(`Signaling server connection error at ${this.ws?.url}. Please ensure the server is running and accessible.`, error);
      this.handlers.onDisconnected();
    };
  }

  disconnect() {
    this.ws?.close();
    this.peers.forEach(({ pc }) => pc.close());
    this.peers.clear();
    this._currentRoomId = null;
  }

  joinRoom(roomId: string) {
    this._currentRoomId = roomId;
    this.peers.forEach(({ pc }) => pc.close());
    this.peers.clear();
    this.sendToSignalingServer({
      type: 'join-room',
      payload: { roomId, user: this.user },
    });
  }

  private sendToSignalingServer(message: object) {
    this.ws?.send(JSON.stringify(message));
  }
  
  private async handleSignalingMessage(data: string) {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'room-peers':
          this.handleRoomPeers(message.payload.peers);
          break;
        case 'user-joined':
          this.handleUserJoined(message.payload.user);
          break;
        case 'user-left':
          this.handleUserLeft(message.payload.userId);
          break;
        case 'relay-message':
          this.handleRelayMessage(message.payload.senderId, message.payload.message);
          break;
        default:
          console.warn('Unknown signaling message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing signaling message:', error);
    }
  }

  private handleRoomPeers(peerList: User[]) {
    console.log('Received room peers:', peerList);
    peerList.forEach(peerUser => {
        if (peerUser.id !== this.user.id && !this.peers.has(peerUser.id)) {
            this.createPeerConnection(peerUser, true);
        }
    });
    this.updatePeerList();
  }
  
  private handleUserJoined(user: User) {
    if (user.id === this.user.id || this.peers.has(user.id)) return;
    console.log('User joined:', user.name);
    this.createPeerConnection(user, false);
    this.updatePeerList();
  }
  
  private handleUserLeft(userId: string) {
    if (this.peers.has(userId)) {
      console.log('User left:', this.peers.get(userId)?.user.name);
      this.peers.get(userId)?.pc.close();
      this.peers.delete(userId);
      this.updatePeerList();
    }
  }

  private async handleRelayMessage(senderId: string, message: SignalingMessage) {
    const peer = this.peers.get(senderId);
    if (!peer) {
        console.warn(`Received relay message from unknown peer: ${senderId}`);
        return;
    }

    try {
        if (message.type === 'offer') {
            await peer.pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
            const answer = await peer.pc.createAnswer();
            await peer.pc.setLocalDescription(answer);
            this.sendToSignalingServer({
                type: 'relay-message',
                payload: { targetId: senderId, message: { type: 'answer', sdp: peer.pc.localDescription } }
            });
        } else if (message.type === 'answer') {
            await peer.pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        } else if (message.type === 'candidate') {
            await peer.pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
    } catch (error) {
        console.error('Error handling relay message:', error);
    }
  }

  private createPeerConnection(peerUser: User, isInitiator: boolean) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const peer = { user: peerUser, pc };
    this.peers.set(peerUser.id, peer);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendToSignalingServer({
          type: 'relay-message',
          payload: { targetId: peerUser.id, message: { type: 'candidate', candidate: event.candidate.toJSON() } }
        });
      }
    };
    
    pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${peerUser.name}: ${pc.connectionState}`);
        if(pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            this.handleUserLeft(peerUser.id);
        }
    };

    pc.ondatachannel = (event) => {
      const dc = event.channel;
      console.log(`Data channel received from ${peerUser.name}`);
      this.peers.get(peerUser.id)!.dc = dc;
      this.setupDataChannel(dc, peerUser.id);
    };

    if (isInitiator) {
      const dc = pc.createDataChannel('main');
      this.peers.get(peerUser.id)!.dc = dc;
      this.setupDataChannel(dc, peerUser.id);
      
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          this.sendToSignalingServer({
            type: 'relay-message',
            payload: { targetId: peerUser.id, message: { type: 'offer', sdp: pc.localDescription } }
          });
        }).catch(e => console.error("Create offer error", e));
    }
    
    this.updatePeerList();
  }
  
  private setupDataChannel(dc: RTCDataChannel, peerId: string) {
    dc.onopen = () => console.log(`Data channel with ${this.peers.get(peerId)?.user.name} is open.`);
    dc.onclose = () => console.log(`Data channel with ${this.peers.get(peerId)?.user.name} is closed.`);
    dc.onerror = (e) => console.error(`Data channel error with ${this.peers.get(peerId)?.user.name}:`, e);
    
    dc.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        try {
            const message: DataChannelMessage = JSON.parse(event.data);
            if ('type' in message) {
                switch(message.type) {
                    case 'text':
                    case 'file':
                        storageService.addItem(message).then(() => this.handlers.onItemReceived(message));
                        break;
                    case 'file-request':
                        this.handleFileRequest(message.fileId, peerId);
                        break;
                    case 'file-transfer-start':
                        this.handleFileTransferStart(message);
                        break;
                    case 'file-transfer-end':
                        this.handleFileTransferEnd(message.fileId);
                        break;
                }
            }
        } catch (error) {
            console.error("Failed to parse data channel message:", error);
        }
      } else { // It's binary, should be a Blob containing fileId + chunk
        if (event.data instanceof Blob) {
            await this.handleFileChunk(event.data);
        } else if (event.data instanceof ArrayBuffer) {
            // Fallback for browsers that might send ArrayBuffer. Convert to Blob.
            await this.handleFileChunk(new Blob([event.data]));
        }
      }
    };
  }

  private updatePeerList() {
    const peerList = Array.from(this.peers.values()).map(p => p.user);
    this.handlers.onPeerListUpdate(peerList);
  }
  
  public broadcastItem(item: SharedItem) {
    this.peers.forEach(peer => {
        if (peer.dc?.readyState === 'open') {
            peer.dc.send(JSON.stringify(item));
        }
    });
  }

  public requestFile(item: FileAnnouncement) {
    const message: DataChannelMessage = { type: 'file-request', fileId: item.id };
    // Broadcast request to all peers
    this.peers.forEach(peer => {
      if (peer.dc?.readyState === 'open') {
        console.log(`Requesting file ${item.fileInfo.name} from ${peer.user.name}`);
        peer.dc.send(JSON.stringify(message));
      }
    });
    this.handlers.onFileProgress({
        fileId: item.id,
        fileName: item.fileInfo.name,
        status: 'starting',
        receivedSize: 0,
        totalSize: item.fileInfo.size
    });
  }
  
  private async handleFileRequest(fileId: string, requesterId: string) {
    const hasFile = await storageService.hasFile(fileId);
    if (!hasFile) return;

    const fileBlob = await storageService.getFile(fileId);
    const item = await storageService.getItem(fileId);

    // If we don't have the file blob or the announcement item in storage, we can't proceed.
    // Also, ensure the item is actually a file announcement. This prevents a crash.
    if (!fileBlob || !item || item.type !== 'file') {
      console.warn(`File blob or announcement not found for fileId: ${fileId}. Aborting transfer.`);
      return;
    }
    const fileAnnouncement = item as FileAnnouncement;

    const peer = this.peers.get(requesterId);
    if (!peer || !peer.dc || peer.dc.readyState !== 'open') {
      console.warn(`No open data channel to peer ${requesterId}. Aborting transfer.`);
      return;
    }

    console.log(`Peer ${this.user.name} has the file ${fileId}, starting transfer to ${requesterId}`);
    
    const dc = peer.dc;
    const startMessage: DataChannelMessage = { type: 'file-transfer-start', fileId, fileInfo: fileAnnouncement.fileInfo };
    dc.send(JSON.stringify(startMessage));

    // Chunk and send the file
    const chunkSize = 16384; // 16KB
    for (let i = 0; i < fileBlob.size; i += chunkSize) {
        const chunk = fileBlob.slice(i, i + chunkSize);
        // This is a terrible way to handle backpressure but sufficient for this example
        // A real implementation needs proper backpressure handling
        while(dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        // Prepend the fileId to the chunk to identify it on the other side
        const combinedBlob = new Blob([fileId, chunk]);
        dc.send(combinedBlob);
    }

    const endMessage: DataChannelMessage = { type: 'file-transfer-end', fileId };
    dc.send(JSON.stringify(endMessage));
    console.log(`Finished sending file ${fileId}`);
  }

  private handleFileTransferStart(message: { fileId: string; fileInfo: FileInfo; }) {
      if(this.incomingFileTransfers.has(message.fileId)) return; // Already started
      console.log(`Starting to receive file: ${message.fileInfo.name}`);
      this.incomingFileTransfers.set(message.fileId, {
          chunks: [],
          info: message.fileInfo,
          receivedSize: 0,
      });
      this.handlers.onFileProgress({
          fileId: message.fileId,
          fileName: message.fileInfo.name,
          status: 'progress',
          receivedSize: 0,
          totalSize: message.fileInfo.size
      });
  }
  
  private async handleFileChunk(dataBlob: Blob) {
      // A UUID is 36 characters long.
      const fileIdLength = 36;
      if (dataBlob.size <= fileIdLength) {
          console.error("Received a file chunk that's too small to contain a fileId.");
          return;
      }
  
      const idBlob = dataBlob.slice(0, fileIdLength);
      const chunkBlob = dataBlob.slice(fileIdLength);
  
      const fileId = await idBlob.text();
      
      const transfer = this.incomingFileTransfers.get(fileId);
      if (!transfer) {
          console.warn(`Received chunk for an unknown or completed file transfer: ${fileId}`);
          return;
      }
      
      transfer.chunks.push(chunkBlob);
      transfer.receivedSize += chunkBlob.size;
  
      this.handlers.onFileProgress({
          fileId: fileId,
          fileName: transfer.info.name,
          status: 'progress',
          receivedSize: transfer.receivedSize,
          totalSize: transfer.info.size,
      });
  }
  
  private handleFileTransferEnd(fileId: string) {
    const transfer = this.incomingFileTransfers.get(fileId);
    if (!transfer) return;

    const fileBlob = new Blob(transfer.chunks, { type: transfer.info.type });
    storageService.storeFile(fileId, fileBlob).then(() => {
      console.log(`File ${transfer.info.name} received and stored.`);
      this.handlers.onFileProgress({
        fileId,
        fileName: transfer.info.name,
        status: 'completed',
        receivedSize: transfer.info.size,
        totalSize: transfer.info.size,
      });
      this.incomingFileTransfers.delete(fileId);
    }).catch(err => {
        console.error("Error storing file", err);
         this.handlers.onFileProgress({
            fileId,
            fileName: transfer.info.name,
            status: 'failed',
            error: "Failed to save file to local storage.",
            receivedSize: transfer.receivedSize,
            totalSize: transfer.info.size,
        });
    });
  }
}
