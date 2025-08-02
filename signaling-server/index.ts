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

interface Room {
    id: string;
    name: string;
}

interface Connection {
  ws: WebSocket;
  user: User;
}

const wss = new WebSocketServer({ port: 8080 });
const rooms = new Map<string, { room: Room, connections: Map<string, Connection> }>(); // roomId -> { roomInfo, connections }

console.log('Signaling server started on ws://localhost:8080');

wss.on('error', console.error);

const broadcastRoomList = () => {
    const roomList = Array.from(rooms.values()).map(r => r.room);
    const message = JSON.stringify({ type: 'room-list', payload: { rooms: roomList } });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
    console.log('Broadcasted updated room list:', roomList.map(r => r.name));
};


wss.on('connection', ws => {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  // Send initial room list to the new client
  const initialRoomList = Array.from(rooms.values()).map(r => r.room);
  ws.send(JSON.stringify({ type: 'room-list', payload: { rooms: initialRoomList } }));

  ws.on('message', message => {
    try {
      const { type, payload } = JSON.parse(message.toString());

      switch (type) {
        case 'join-room': {
          const { room: newRoom, user } = payload;
          
          // Leave previous room if any
          if (currentRoomId && currentUserId) {
            const oldRoomData = rooms.get(currentRoomId);
            if (oldRoomData) {
                oldRoomData.connections.delete(currentUserId);
                if (oldRoomData.connections.size === 0) {
                    rooms.delete(currentRoomId);
                    broadcastRoomList();
                } else {
                    // Notify others in old room
                    oldRoomData.connections.forEach(conn => conn.ws.send(JSON.stringify({ type: 'user-left', payload: { userId: currentUserId } })));
                }
            }
          }

          currentRoomId = newRoom.id;
          currentUserId = user.id;

          let isNewRoom = false;
          if (!rooms.has(currentRoomId)) {
            rooms.set(currentRoomId, { room: newRoom, connections: new Map() });
            isNewRoom = true;
          }
          
          const roomData = rooms.get(currentRoomId)!;
          const roomConnections = roomData.connections;


          // Notify existing users about the new peer
          roomConnections.forEach(conn => conn.ws.send(JSON.stringify({ type: 'user-joined', payload: { user } })));

          // Send list of existing peers to the new peer
          ws.send(JSON.stringify({ type: 'room-peers', payload: { peers: Array.from(roomConnections.values()).map(c => c.user) } }));
          
          roomConnections.set(user.id, { ws, user });
          console.log(`User ${user.name} joined room ${newRoom.name}`);

          if (isNewRoom) {
            broadcastRoomList();
          }
          break;
        }

        case 'relay-message': {
          const { targetId, message: relayMessage } = payload;
          if (currentRoomId) {
            const roomData = rooms.get(currentRoomId);
            const targetConn = roomData?.connections.get(targetId);
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
      const roomData = rooms.get(currentRoomId);
      if(roomData) {
        roomData.connections.delete(currentUserId);
        if (roomData.connections.size === 0) {
            rooms.delete(currentRoomId);
            broadcastRoomList();
        } else {
            // Notify other users in the room
            roomData.connections.forEach(conn => conn.ws.send(JSON.stringify({ type: 'user-left', payload: { userId: currentUserId } })));
        }
        console.log(`User ${currentUserId} left room ${currentRoomId}`);
      }
    }
  });
});