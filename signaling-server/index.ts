
// This is a placeholder for the Bun/Express/WebSocket signaling server.
// It needs to be implemented separately.
//
// To run this server:
// 1. `bun install ws`
// 2. `bun run signaling-server/index.ts`
//
// The server's responsibilities are:
// 1. Manage WebSocket connections from clients.
// 2. Track which users are in which rooms.
// 3. Broadcast user join/leave events to other users in the same room.
// 4. Relay WebRTC signaling messages (offers, answers, ICE candidates) between specific peers.
//
// It should NOT store any user data, messages, or files. It's a stateless signaling relay.

import { WebSocketServer, WebSocket } from 'ws';

interface User {
  id: string;
  name: string;
}

interface Connection {
  ws: WebSocket;
  user: User;
}

const wss = new WebSocketServer({ port: 8080 });
const rooms = new Map<string, Map<string, Connection>>(); // roomId -> userId -> Connection

console.log('Signaling server started on ws://localhost:8080');

wss.on('connection', ws => {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  ws.on('message', message => {
    try {
      const { type, payload } = JSON.parse(message.toString());

      switch (type) {
        case 'join-room': {
          const { roomId, user } = payload;
          
          // Leave previous room if any
          if (currentRoomId && currentUserId) {
            const room = rooms.get(currentRoomId);
            room?.delete(currentUserId);
            if (room?.size === 0) rooms.delete(currentRoomId);
            // Notify others in old room
            room?.forEach(conn => conn.ws.send(JSON.stringify({ type: 'user-left', payload: { userId: currentUserId } })));
          }

          currentRoomId = roomId;
          currentUserId = user.id;

          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
          }
          
          const room = rooms.get(roomId)!;

          // Notify existing users about the new peer
          room.forEach(conn => conn.ws.send(JSON.stringify({ type: 'user-joined', payload: { user } })));

          // Send list of existing peers to the new peer
          ws.send(JSON.stringify({ type: 'room-peers', payload: { peers: Array.from(room.values()).map(c => c.user) } }));
          
          room.set(user.id, { ws, user });
          console.log(`User ${user.name} joined room ${roomId}`);
          break;
        }

        case 'relay-message': {
          const { targetId, message: relayMessage } = payload;
          if (currentRoomId) {
            const room = rooms.get(currentRoomId);
            const targetConn = room?.get(targetId);
            if (targetConn) {
              targetConn.ws.send(JSON.stringify({ type: 'relay-message', payload: { senderId: currentUserId, message: relayMessage } }));
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error('Failed to process message:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentUserId) {
      const room = rooms.get(currentRoomId);
      room?.delete(currentUserId);
      if (room?.size === 0) {
        rooms.delete(currentRoomId);
      }
      // Notify other users in the room
      room?.forEach(conn => conn.ws.send(JSON.stringify({ type: 'user-left', payload: { userId: currentUserId } })));
      console.log(`User ${currentUserId} left room ${currentRoomId}`);
    }
  });
});
