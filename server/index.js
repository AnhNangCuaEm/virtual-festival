import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);

// CORS configuration - Simple for development
app.use(cors({
  origin: '*',
  credentials: false
}));

// Socket.io configuration - Simple for development
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['websocket', 'polling']
});

// In-memory storage for players
const players = new Map();
const gameState = {
  players: {},
  mapSize: { width: 960, height: 480 } // 30*32 = 960 width, 30*16 = 480 height for isometric
};

// Utility functions
function generatePlayerId() {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getRandomSpawnPosition() {
  return {
    x: Math.random() * (gameState.mapSize.width - 100) + 50,
    y: Math.random() * (gameState.mapSize.height - 100) + 50
  };
}

function broadcastGameState() {
  io.emit('players', gameState.players);
}

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  let isPlayer = false; // Track if this connection is a player
  
  // Handle role setting with nickname
  socket.on('setRole', (roleData) => {
    const role = roleData.role || roleData; // Support both old and new format
    const nickname = roleData.name || `Player ${players.size + 1}`; // Get nickname from roleData
    
    if (role === 'player') {
      isPlayer = true;
      
      // Generate unique player ID and spawn position
      const playerId = generatePlayerId();
      const spawnPosition = getRandomSpawnPosition();
      
      // Create new player with nickname
      const newPlayer = {
        id: playerId,
        socketId: socket.id,
        x: spawnPosition.x,
        y: spawnPosition.y,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`, // Random color
        name: nickname,
        connectedAt: new Date().toISOString()
      };
      
      // Store player
      players.set(socket.id, newPlayer);
      gameState.players[socket.id] = newPlayer;
      
      console.log(`✅ Player ${newPlayer.name} spawned at (${newPlayer.x}, ${newPlayer.y})`);
      
      // Send player their own data
      socket.emit('playerData', newPlayer);
      
      // Broadcast updated game state to all clients
      broadcastGameState();
    } else if (role === 'viewer') {
      console.log(`👁️ Viewer connected: ${socket.id}`);
      // Just send current game state to viewer
      broadcastGameState();
    }
  });
  
  // Handle player movement (discrete directions)
  socket.on('move', (moveData) => {
    const player = players.get(socket.id);
    if (!player) return;
    
    const { direction, x, y } = moveData;
    
    if (direction) {
      // Handle directional movement (from controller)
      const moveSpeed = 10;
      let newX = player.x;
      let newY = player.y;
      
      switch(direction) {
        case 'up':
          newY = Math.max(0, player.y - moveSpeed);
          break;
        case 'down':
          newY = Math.min(gameState.mapSize.height, player.y + moveSpeed);
          break;
        case 'left':
          newX = Math.max(0, player.x - moveSpeed);
          break;
        case 'right':
          newX = Math.min(gameState.mapSize.width, player.x + moveSpeed);
          break;
      }
      
      player.x = newX;
      player.y = newY;
    } else if (x !== undefined && y !== undefined) {
      // Handle absolute position (from venue map clicks)
      player.x = Math.max(0, Math.min(gameState.mapSize.width, x));
      player.y = Math.max(0, Math.min(gameState.mapSize.height, y));
    }
    
    // Update game state
    gameState.players[socket.id] = { ...player };
    broadcastGameState();
  });

  // Handle 360° vector movement (from joystick)
  socket.on('moveVector', (vectorData) => {
    const player = players.get(socket.id);
    if (!player) return;
    
    const { x, y, speed } = vectorData;
    
    if (speed > 0) {
      // Calculate movement based on vector with slow constant speed
      const moveSpeed = 5; // Slower constant speed
      const moveX = x * moveSpeed;
      const moveY = y * moveSpeed;
      
      // Update player position with bounds checking
      player.x = Math.max(0, Math.min(gameState.mapSize.width, player.x + moveX));
      player.y = Math.max(0, Math.min(gameState.mapSize.height, player.y + moveY));
      
      // Update game state
      gameState.players[socket.id] = { ...player };
      broadcastGameState();
    }
  });
  
  // Handle player name update
  socket.on('updateName', (newName) => {
    const player = players.get(socket.id);
    if (player && newName && newName.trim()) {
      player.name = newName.trim();
      gameState.players[socket.id] = { ...player };
      
      console.log(`📝 Player ${player.name} changed name to: ${player.name}`);
      broadcastGameState();
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    if (isPlayer) {
      const player = players.get(socket.id);
      if (player) {
        console.log(`❌ Player ${player.name} disconnected`);
        
        // Remove player from storage
        players.delete(socket.id);
        delete gameState.players[socket.id];
        
        // Broadcast updated game state
        broadcastGameState();
      }
    } else {
      console.log(`👁️ Viewer disconnected: ${socket.id}`);
    }
  });

  // Add manual player removal for dashboard
  socket.on('removePlayer', (targetSocketId) => {
    const player = players.get(targetSocketId);
    if (player) {
      console.log(`🗑️ Manually removing player ${player.name}`);
      
      // Remove player from storage
      players.delete(targetSocketId);
      delete gameState.players[targetSocketId];
      
      // Disconnect the target socket
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.disconnect();
      }
      
      // Broadcast updated game state
      broadcastGameState();
      
      // Confirm removal
      socket.emit('playerRemoved', { playerId: targetSocketId, playerName: player.name });
    }
  });
  
  // Handle ping/pong for connection monitoring
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// HTTP routes
app.get('/', (req, res) => {
  res.json({
    message: '🎎 Japonism Festival Server',
    status: 'running',
    players: Object.keys(gameState.players).length,
    uptime: process.uptime()
  });
});

app.get('/status', (req, res) => {
  res.json({
    players: gameState.players,
    totalPlayers: Object.keys(gameState.players).length,
    mapSize: gameState.mapSize,
    serverTime: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log('🎎 ===================================');
  console.log('🎎 Japonism Festival Server Started');
  console.log('🎎 ===================================');
  console.log(`🔗 Server running on port ${PORT} (all interfaces)`);
  console.log(`🌐 HTTP: http://localhost:${PORT}`);
  console.log(`📱 Mobile: Find your IP and use http://YOUR_IP:${PORT}`);
  console.log(`⚡ Socket.io ready for connections`);
  console.log('🎎 ===================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Server shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 Server shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
