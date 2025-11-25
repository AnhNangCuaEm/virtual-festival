'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { io, type Socket } from 'socket.io-client';

interface MapBounds {
  centerX: number;
  centerY: number;
  mapWidth: number;
  mapHeight: number;
  tileWidth: number;
  tileHeight: number;
  scale: number;
}

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
  private mapBounds: MapBounds | null = null;

  constructor() {
    super({ key: 'VenueScene' });
  }

  preload() {
    // Load both tilesets from Tiled
    this.load.spritesheet('spritesheet', '/map/isometric tileset/spritesheet.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    
    this.load.spritesheet('spritesheet02', '/map/isometric tileset/spritesheet02.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    
    // Load the map data from Tiled
    this.load.json('mapData', '/map/map..tmj');
    
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
      const mapData = this.cache.json.get('mapData');
      
      if (!mapData || !mapData.layers || !mapData.tilesets) {
        console.error('Map data not found or invalid');
        this.createFallbackMap();
        return;
      }
      
      console.log('Map loaded:', { width: mapData.width, height: mapData.height, tileWidth: mapData.tilewidth, tileHeight: mapData.tileheight });
      console.log('Tilesets:', mapData.tilesets);
      
      const mapWidth = mapData.width;
      const mapHeight = mapData.height;
      const tileWidth = mapData.tilewidth;
      const tileHeight = 16; // For isometric, height is typically half of width
      
      // Calculate the visible map size in world coordinates
      // For isometric: map world width = (mapWidth + mapHeight) * (tileWidth / 2)
      // For isometric: map world height = (mapWidth + mapHeight) * (tileHeight / 2)
      const mapWorldWidth = (mapWidth + mapHeight) * (tileWidth / 2);
      const mapWorldHeight = (mapWidth + mapHeight) * (tileHeight / 2);
      
      // Set world bounds
      this.physics.world.setBounds(0, 0, mapWorldWidth * 1.5, mapWorldHeight * 1.5);
      this.cameras.main.setBounds(0, 0, mapWorldWidth * 1.5, mapWorldHeight * 1.5);
      
      const centerX = mapWorldWidth / 2;
      const centerY = mapWorldHeight / 2;
      
      // Store map bounds
      this.mapBounds = {
        centerX,
        centerY,
        mapWidth,
        mapHeight,
        tileWidth,
        tileHeight,
        scale: 1
      };
      
      // Build tileset map: gid -> {tilesetKey, frameIndex}
      const tilesetMap: Map<number, { key: string; frameIndex: number }> = new Map();
      
      // Sort tilesets by firstgid to handle gid ranges correctly
      const sortedTilesets = [...mapData.tilesets].sort((a, b) => a.firstgid - b.firstgid);
      
      for (let tsIdx = 0; tsIdx < sortedTilesets.length; tsIdx++) {
        const ts = sortedTilesets[tsIdx];
        const nextTileset = sortedTilesets[tsIdx + 1];
        const tilesetKey = ts.source.replace('.tsx', '');
        const firstgid = ts.firstgid;
        
        // Calculate how many tiles are in this tileset
        // Either until the next tileset's firstgid, or use predetermined counts
        let tileCount = 0;
        if (nextTileset) {
          // tileCount = nextTileset.firstgid - firstgid;
          // But we'll use explicit counts to be safe
          if (tilesetKey === 'spritesheet') tileCount = 121;
          else if (tilesetKey === 'spritesheet02') tileCount = 400;
        } else {
          if (tilesetKey === 'spritesheet') tileCount = 121;
          else if (tilesetKey === 'spritesheet02') tileCount = 400;
        }
        
        for (let i = 0; i < tileCount; i++) {
          tilesetMap.set(firstgid + i, { key: tilesetKey, frameIndex: i });
        }
      }
      
      console.log('Tileset map built with', tilesetMap.size, 'entries');
      console.log('Tilesets:', sortedTilesets.map(ts => ({ source: ts.source, firstgid: ts.firstgid })));
      
      // Render all layers
      let depthIndex = 0;
      mapData.layers.forEach((layer: { name: string; data?: number[] }) => {
        if (layer.data) {
          console.log(`Rendering layer: ${layer.name}`);
          this.renderMapLayer(layer.data, mapWidth, mapHeight, tileWidth, tileHeight, depthIndex * 1000, tilesetMap);
          depthIndex++;
        }
      });
      
      console.log('Map rendered successfully!');
      
      // Center camera on map
      this.cameras.main.centerOn(centerX, centerY);
      
    } catch (error) {
      console.error('Error loading map:', error);
      this.createFallbackMap();
    }
  }

  renderMapLayer(
    layerData: number[],
    mapWidth: number,
    mapHeight: number,
    tileWidth: number,
    tileHeight: number,
    baseDepth: number,
    tilesetMap: Map<number, { key: string; frameIndex: number }>
  ) {
    if (!this.mapBounds) return;
    
    const { centerX, centerY, scale } = this.mapBounds;
    
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        let tileGid = layerData[y * mapWidth + x];
        
        if (tileGid === 0) continue; // Skip empty tiles
        
        // Mask off flip bits (top 3 bits)
        const FLIP_H = 0x80000000;
        const FLIP_V = 0x40000000;
        const FLIP_D = 0x20000000;
        tileGid = tileGid & ~(FLIP_H | FLIP_V | FLIP_D);
        
        // Get tileset info from gid
        const tileInfo = tilesetMap.get(tileGid);
        if (!tileInfo) {
          continue;
        }
        
        // Isometric projection: 
        // For isometric maps, tile height is typically half the tile width
        // X coordinate: (col - row) * (tile_width/2)
        // Y coordinate: (col + row) * (tile_height/2) where tile_height = 16 for isometric
        const isoX = (x - y) * (tileWidth / 2) * scale;
        const isoY = (x + y) * (tileHeight / 2) * scale;
        
        // Position on screen (centered)
        const screenX = isoX + centerX;
        const screenY = isoY + centerY;
        
        // Create tile sprite using the correct tileset
        const tile = this.add.image(screenX, screenY, tileInfo.key, tileInfo.frameIndex);
        tile.setScale(scale);
        tile.setDepth(baseDepth + y);
        tile.setOrigin(0.5, 0.5);
      }
    }
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
      tileHeight: tileSize / 2,
      scale: 1
    };
  }

  // addUIElements() {
  //   // Add festival decorations - positioned relative to screen, not map
  //   this.add.text(this.cameras.main.width / 2, 50, '🎎 Japonism Festival', {
  //     fontSize: '32px',
  //     color: '#ffffff',
  //     stroke: '#000000',
  //     strokeThickness: 4
  //   }).setOrigin(0.5).setScrollFactor(0); // UI stays fixed on screen
    
  //   this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 50, 'Click to move or use arrow keys', {
  //     fontSize: '18px',
  //     color: '#ffffff',
  //     stroke: '#000000',
  //     strokeThickness: 2
  //   }).setOrigin(0.5).setScrollFactor(0); // UI stays fixed on screen
  // }

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
      if (!this.mapBounds) return;
      
      // Convert tile coordinates to world coordinates
      const isoX = (player.x - player.y) * (this.mapBounds.tileWidth / 2) * (this.mapBounds.scale || 1);
      const isoY = (player.x + player.y) * (this.mapBounds.tileHeight / 2) * (this.mapBounds.scale || 1);
      const worldX = isoX + this.mapBounds.centerX;
      const worldY = isoY + this.mapBounds.centerY;
      
      let playerContainer = this.players.get(socketId);
      
      if (!playerContainer) {
        // Create new player container
        playerContainer = this.add.container(worldX, worldY);
        
        // Avatar sprite
        const avatarScale = (this.mapBounds.scale || 1) * 0.8;
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
        playerContainer.setDepth(10000 + worldY);
        this.players.set(socketId, playerContainer);
      } else {
        // Update existing player position
        playerContainer.setPosition(worldX, worldY);
        playerContainer.setDepth(10000 + worldY);
      }
    });
  }


  update() {
    if (this.cursors && this.socket && this.currentPlayer) {
      if (this.cursors.left?.isDown) {
        this.socket.emit('move', { direction: 'left' });
      } else if (this.cursors.right?.isDown) {
        this.socket.emit('move', { direction: 'right' });
      }
      
      if (this.cursors.up?.isDown) {
        this.socket.emit('move', { direction: 'up' });
      } else if (this.cursors.down?.isDown) {
        this.socket.emit('move', { direction: 'down' });
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
        backgroundColor: '#b3a0ff',
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

    newSocket.on('playerData', () => {
      // Handle player data
    });

    newSocket.on('players', () => {
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
      <div className="game-container-fullscreen">
        <div id="phaser-game" style={{ width: '100%', height: '100%' }} />
      </div>
    </>
  );
}
