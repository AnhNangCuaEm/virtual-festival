'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  x: number;
  y: number;
  color: string;
  name: string;
}

class VenueScene extends Phaser.Scene {
  private socket: Socket | null = null;
  private players: Map<string, Phaser.GameObjects.Container> = new Map();
  private currentPlayer: Player | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private mapInstance: Phaser.Tilemaps.Tilemap | null = null;
  private mapBounds: any = null;

  constructor() {
    super({ key: 'VenueScene' });
  }

  preload() {
    // Load the actual tileset as a spritesheet instead of using the JSON map
    this.load.spritesheet('spritesheet', '/tilesets/spritesheet.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    
    // Load the map data - we'll create a simpler version since external tilesets aren't supported
    this.load.json('mapData', '/map/demoMap.tmj');
    
    // Load avatar
    this.load.image('avatar', '/avatar.svg');
  }

  create() {
    // Create map background
    this.createMap();
    
    // Initialize input
    this.cursors = this.input.keyboard?.createCursorKeys() || null;
    
    // Add click-to-move functionality
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.socket && this.mapBounds) {
        // Convert screen coordinates to world coordinates
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        
        console.log('Click at screen:', { x: pointer.x, y: pointer.y });
        console.log('Click at world:', worldPoint);
        
        // Convert world coordinates to isometric tile coordinates
        const offsetX = (worldPoint.x - this.mapBounds.centerX) / (this.mapBounds.scale || 1);
        const offsetY = (worldPoint.y - this.mapBounds.centerY) / (this.mapBounds.scale || 1);
        
        // Convert to tile coordinates for isometric map
        const tileX = Math.round((offsetX / (this.mapBounds.tileWidth / 2) + offsetY / (this.mapBounds.tileHeight / 2)) / 2);
        const tileY = Math.round((offsetY / (this.mapBounds.tileHeight / 2) - offsetX / (this.mapBounds.tileWidth / 2)) / 2);
        
        // Clamp to map bounds
        const clampedTileX = Math.max(0, Math.min(this.mapBounds.mapWidth - 1, tileX));
        const clampedTileY = Math.max(0, Math.min(this.mapBounds.mapHeight - 1, tileY));
        
        console.log('Calculated tile:', { tileX, tileY, clamped: { x: clampedTileX, y: clampedTileY } });
        
        // Convert back to world position on the map
        const isoX = (clampedTileX - clampedTileY) * (this.mapBounds.tileWidth / 2) * (this.mapBounds.scale || 1);
        const isoY = (clampedTileX + clampedTileY) * (this.mapBounds.tileHeight / 2) * (this.mapBounds.scale || 1);
        const targetX = isoX + this.mapBounds.centerX;
        const targetY = isoY + this.mapBounds.centerY;
        
        console.log('Target world position:', { targetX, targetY });
        
        // Emit move to target position
        this.socket.emit('moveToTarget', { 
          x: targetX, 
          y: targetY,
          tileX: clampedTileX,
          tileY: clampedTileY
        });
      }
    });
    
    // Initialize socket connection
    this.initSocket();
    
  }

  createMap() {
    try {
      // Get the map data
      const mapData = this.cache.json.get('mapData');
      
      if (!mapData || !mapData.layers) {
        console.error('Map data not found or invalid');
        this.createFallbackMap();
        return;
      }
      
      console.log('Map data loaded:', mapData);
      
      // Find the Bottom layer
      const bottomLayer = mapData.layers.find((layer: any) => layer.name === 'Bottom');
      const topLayer = mapData.layers.find((layer: any) => layer.name === 'Top');
      
      if (!bottomLayer) {
        console.error('Bottom layer not found');
        this.createFallbackMap();
        return;
      }
      
      const mapWidth = mapData.width || 30;
      const mapHeight = mapData.height || 30;
      const tileWidth = mapData.tilewidth || 32;
      const tileHeight = mapData.tileheight || 16;
      
      // Create tiles from the bottom layer data
      this.renderMapLayer(bottomLayer.data, mapWidth, mapHeight, tileWidth, tileHeight, 0);
      
      // Create tiles from the top layer if it exists
      if (topLayer && topLayer.data) {
        this.renderMapLayer(topLayer.data, mapWidth, mapHeight, tileWidth, tileHeight, 1);
      }
      
      console.log('Map rendered successfully!');
      
    } catch (error) {
      console.error('Error loading map:', error);
      this.createFallbackMap();
    }
    
    // Add UI elements
    this.addUIElements();
  }

  renderMapLayer(layerData: number[], mapWidth: number, mapHeight: number, tileWidth: number, tileHeight: number, layerIndex: number) {
    // Calculate center offset to center the map on screen
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    // Calculate map dimensions in pixels for centering
    const mapPixelWidth = mapWidth * tileWidth;
    const mapPixelHeight = mapHeight * tileHeight;
    
    console.log('Map centering info:', {
      screenWidth: this.cameras.main.width,
      screenHeight: this.cameras.main.height,
      mapWidth, mapHeight, tileWidth, tileHeight,
      mapPixelWidth, mapPixelHeight,
      centerX, centerY
    });
    
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tileIndex = y * mapWidth + x;
        const tileId = layerData[tileIndex];
        
        if (tileId === 0) continue; // Skip empty tiles
        
        // Convert to isometric coordinates
        // For isometric: screenX = (gridX - gridY) * tileWidth/2, screenY = (gridX + gridY) * tileHeight/2
        const isoX = (x - y) * (tileWidth / 2);
        const isoY = (x + y) * (tileHeight / 2);
        
        // Center the entire map on screen
        const finalX = isoX + centerX;
        const finalY = isoY + centerY - (mapPixelHeight / 4); // Offset to account for isometric height
        
        // Create tile sprite (tileId - 1 because Tiled uses 1-based indexing)
        const frameIndex = Math.max(0, (tileId - 1) % 121); // 121 is total frames in spritesheet (11x11)
        const tile = this.add.image(finalX, finalY, 'spritesheet', frameIndex);
        tile.setDepth(layerIndex * 1000 + y); // Set depth for proper rendering order
        
        // Scale up tiles to make them more visible for now
        tile.setScale(1.5); // Temporary scale until you make larger tiles
      }
    }
    
    // Store map bounds for player positioning
    this.mapBounds = {
      centerX: centerX,
      centerY: centerY - (mapPixelHeight / 4),
      mapWidth: mapWidth,
      mapHeight: mapHeight,
      tileWidth: tileWidth,
      tileHeight: tileHeight,
      scale: 1.5 // Store the scale factor
    };
    
    console.log('Map bounds set:', this.mapBounds);
  }

  createFallbackMap() {
    console.log('Creating fallback map...');
    const tileSize = 32;
    const mapWidth = 30;
    const mapHeight = 30;
    
    // Calculate center offset
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    // Create a simple isometric pattern using the spritesheet
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        // Convert to isometric coordinates and center on screen
        const isoX = (x - y) * (tileSize / 2) + centerX;
        const isoY = (x + y) * (tileSize / 4) + centerY - (mapHeight * tileSize / 8);
        
        // Use different frames from spritesheet for variety
        let frameIndex = 0; // Default grass tile
        
        // Border tiles
        if (x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1) {
          frameIndex = 14; // Different frame for borders
        }
        // Center area
        else if (x > mapWidth/3 && x < 2*mapWidth/3 && y > mapHeight/3 && y < 2*mapHeight/3) {
          frameIndex = 1; // Different frame for center
        }
        
        const tile = this.add.image(isoX, isoY, 'spritesheet', frameIndex);
        tile.setDepth(y);
      }
    }
    
    // Store map bounds for fallback map
    this.mapBounds = {
      centerX: centerX,
      centerY: centerY - (mapHeight * tileSize / 8),
      mapWidth: mapWidth,
      mapHeight: mapHeight,
      tileWidth: tileSize,
      tileHeight: tileSize / 2
    };
  }

  addUIElements() {
    // Add festival decorations - positioned relative to screen, not map
    this.add.text(this.cameras.main.width / 2, 50, '🎎 Japonism Festival', {
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0); // UI stays fixed on screen
    
    this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 50, 'Click to move or use arrow keys', {
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0); // UI stays fixed on screen
  }

  initSocket() {
    // Get the current host and construct server URL
    const getServerUrl = () => {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // If accessing via IP, use that IP for server connection
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          return `http://${hostname}:3001`;
        }
      }
      return 'http://localhost:3001';
    };

    const serverUrl = getServerUrl();
    console.log('Venue connecting to server:', serverUrl);

    this.socket = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: true
    });

    // Mark this connection as viewer only (not a player)
    this.socket.on('connect', () => {
      console.log('Venue connected to server successfully as viewer');
      // Tell server this is a viewer, not a player
      this.socket?.emit('setRole', 'viewer');
    });

    this.socket.on('playerData', (player: Player) => {
      this.currentPlayer = player;
      console.log('Received player data:', player);
    });

    this.socket.on('players', (playersData: Record<string, Player>) => {
      this.updatePlayers(playersData);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  updatePlayers(playersData: Record<string, Player>) {
    // Remove players that are no longer connected
    this.players.forEach((playerSprite, playerId) => {
      if (!playersData[playerId]) {
        playerSprite.destroy();
        this.players.delete(playerId);
      }
    });

    // Update or create player sprites
    Object.entries(playersData).forEach(([socketId, player]) => {
      let playerContainer = this.players.get(socketId);
      
      if (!playerContainer) {
        // Create new player
        // Convert player position to isometric if needed
        let playerX = player.x;
        let playerY = player.y;
        
        // If mapBounds exists, adjust player position to be on the map
        if (this.mapBounds) {
          // If player position seems to be in tile coordinates, convert to world
          if (player.x < 100 && player.y < 100) {
            const isoX = (player.x - player.y) * (this.mapBounds.tileWidth / 2) * (this.mapBounds.scale || 1);
            const isoY = (player.x + player.y) * (this.mapBounds.tileHeight / 2) * (this.mapBounds.scale || 1);
            playerX = isoX + this.mapBounds.centerX;
            playerY = isoY + this.mapBounds.centerY;
          }
        }
        
        playerContainer = this.add.container(playerX, playerY);
        
        // Avatar sprite - scale to match tile scale
        const avatarScale = (this.mapBounds?.scale || 1) * 0.8;
        const avatar = this.add.image(0, -16 * avatarScale, 'avatar').setScale(avatarScale);
        avatar.setTint(parseInt(player.color.replace('#', ''), 16) || 0xffffff);
        
        // Name label
        const nameText = this.add.text(0, -35 * avatarScale, player.name, {
          fontSize: `${12 * avatarScale}px`,
          color: '#000000',
          backgroundColor: '#ffffff',
          padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
        
        playerContainer.add([avatar, nameText]);
        playerContainer.setDepth(10000 + playerY); // High depth to be above tiles
        this.players.set(socketId, playerContainer);
        
        console.log('Player created at:', { playerX, playerY, originalPos: { x: player.x, y: player.y } });
      } else {
        // Update position
        let playerX = player.x;
        let playerY = player.y;
        
        // If mapBounds exists, adjust player position to be on the map
        if (this.mapBounds) {
          // If player position seems to be in tile coordinates, convert to world
          if (player.x < 100 && player.y < 100) {
            const isoX = (player.x - player.y) * (this.mapBounds.tileWidth / 2) * (this.mapBounds.scale || 1);
            const isoY = (player.x + player.y) * (this.mapBounds.tileHeight / 2) * (this.mapBounds.scale || 1);
            playerX = isoX + this.mapBounds.centerX;
            playerY = isoY + this.mapBounds.centerY;
          }
        }
        
        playerContainer.setPosition(playerX, playerY);
        playerContainer.setDepth(10000 + playerY); // Update depth based on Y position
      }
    });
  }


  update() {
    if (this.cursors && this.socket && this.currentPlayer) {
      let moved = false;
      
      if (this.cursors.left?.isDown) {
        this.socket.emit('move', { direction: 'left' });
        moved = true;
      } else if (this.cursors.right?.isDown) {
        this.socket.emit('move', { direction: 'right' });
        moved = true;
      }
      
      if (this.cursors.up?.isDown) {
        this.socket.emit('move', { direction: 'up' });
        moved = true;
      } else if (this.cursors.down?.isDown) {
        this.socket.emit('move', { direction: 'down' });
        moved = true;
      }
      
      // For isometric maps, also support diagonal movement
      if (this.cursors.left?.isDown && this.cursors.up?.isDown) {
        this.socket.emit('move', { direction: 'northwest' });
      } else if (this.cursors.right?.isDown && this.cursors.up?.isDown) {
        this.socket.emit('move', { direction: 'northeast' });
      } else if (this.cursors.left?.isDown && this.cursors.down?.isDown) {
        this.socket.emit('move', { direction: 'southwest' });
      } else if (this.cursors.right?.isDown && this.cursors.down?.isDown) {
        this.socket.emit('move', { direction: 'southeast' });
      }
    }
    
    // Smoothly follow current player if we have one
    if (this.currentPlayer) {
      const playerContainer = this.players.get(this.currentPlayer.id);
      if (playerContainer) {
        // Smooth camera follow with lerp
        const lerpFactor = 0.05;
        const targetX = playerContainer.x;
        const targetY = playerContainer.y;
        const currentX = this.cameras.main.scrollX + this.cameras.main.width / 2;
        const currentY = this.cameras.main.scrollY + this.cameras.main.height / 2;
        
        const newX = Phaser.Math.Linear(currentX, targetX, lerpFactor);
        const newY = Phaser.Math.Linear(currentY, targetY, lerpFactor);
        
        this.cameras.main.centerOn(newX, newY);
      }
    }
  }

  destroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default function VenuePage() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !gameRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: 'phaser-game',
        backgroundColor: '#87CEEB',
        scene: VenueScene,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0, x: 0 },
            debug: false
          }
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        }
      };

      gameRef.current = new Phaser.Game(config);

      // Handle window resize
      const handleResize = () => {
        if (gameRef.current) {
          gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Get the current host and construct server URL
    const getServerUrl = () => {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // If accessing via IP, use that IP for server connection
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          return `http://${hostname}:3001`;
        }
      }
      return 'http://localhost:3001';
    };

    const serverUrl = getServerUrl();
    console.log('Venue connecting to server:', serverUrl);

    const newSocket = io(serverUrl, {
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
    });

    newSocket.on('playerData', (player: Player) => {
      // Handle player data
    });

    newSocket.on('players', (playersData: Record<string, Player>) => {
      // Handle players data
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <>
      <Link href="/" className="home-button" title="Go to Home">
        🏠
      </Link>

      <div className="game-container-fullscreen">
        <div id="phaser-game" style={{ width: '100%', height: '100%' }} />
      </div>
    </>
  );
}
