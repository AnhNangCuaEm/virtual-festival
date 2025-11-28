'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Player {
    id: string;
    socketId: string;
    x: number;
    y: number;
    color: string;
    name: string;
}

interface PlayerSprite {
    container: Phaser.GameObjects.Container;
    sprite: Phaser.GameObjects.Image;
    nameText: Phaser.GameObjects.Text;
    targetX: number;
    targetY: number;
}

export const VenueMap = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const sceneRef = useRef<Phaser.Scene | null>(null);
    const playersRef = useRef<Map<string, PlayerSprite>>(new Map());

    // Function to create a player sprite with nickname
    const createPlayerSprite = useCallback((scene: Phaser.Scene, socketId: string, player: Player) => {
        // Create container for character and name
        const container = scene.add.container(player.x, player.y);

        // Create character sprite
        const sprite = scene.add.image(0, 0, 'character');
        sprite.setDisplaySize(48, 48);

        // Create nickname text above character
        const nameText = scene.add.text(0, -35, player.name, {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            backgroundColor: player.color,
            padding: { x: 6, y: 3 },
            align: 'center'
        });
        nameText.setOrigin(0.5, 1);

        // Add to container
        container.add([sprite, nameText]);
        container.setDepth(100); // Ensure players are above map tiles

        // Store player sprite reference
        const playerSprite: PlayerSprite = {
            container,
            sprite,
            nameText,
            targetX: player.x,
            targetY: player.y
        };

        playersRef.current.set(socketId, playerSprite);
        console.log(`✨ Player joined map: ${player.name} at (${player.x}, ${player.y})`);
    }, []);

    // Function to update players on the map
    const updatePlayers = useCallback((players: Record<string, Player>) => {
        const scene = sceneRef.current;
        if (!scene) return;

        const currentPlayerIds = new Set(Object.keys(players));

        // Remove players that are no longer connected
        playersRef.current.forEach((playerSprite, socketId) => {
            if (!currentPlayerIds.has(socketId)) {
                playerSprite.container.destroy();
                playersRef.current.delete(socketId);
                console.log(`🚪 Player removed from map: ${socketId}`);
            }
        });

        // Add or update players
        Object.entries(players).forEach(([socketId, player]) => {
            const existingPlayer = playersRef.current.get(socketId);

            if (existingPlayer) {
                // Update existing player position (smooth movement)
                existingPlayer.targetX = player.x;
                existingPlayer.targetY = player.y;
                // Update name if changed
                existingPlayer.nameText.setText(player.name);
            } else {
                // Create new player sprite
                createPlayerSprite(scene, socketId, player);
            }
        });
    }, [createPlayerSprite]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        
        // Prevent double initialization - check if canvas already exists
        if (container.querySelector('canvas') || gameRef.current) {
            return;
        }

        // Store reference for cleanup
        const players = playersRef.current;
        let handleResize: (() => void) | null = null;
        let isMounted = true;

        // Initialize socket connection
        const getServerUrl = () => {
            if (typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                const protocol = window.location.protocol;
                if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
                    return `${protocol}//${hostname}:3001`;
                }
            }
            return 'http://localhost:3001';
        };

        const socket = io(getServerUrl(), {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        socket.on('connect', () => {
            console.log('🎮 VenueMap connected to server');
            socket.emit('setRole', { role: 'viewer' });
        });

        socket.on('players', (players: Record<string, Player>) => {
            updatePlayers(players);
        });

        socketRef.current = socket;

        // Dynamic import Phaser
        import('phaser').then((PhaserModule) => {
            // Check again in case component unmounted during async import
            if (!isMounted || !container) return;
            
            const Phaser = PhaserModule.default;

            class VenueScene extends Phaser.Scene {
                constructor() {
                    super({ key: 'VenueScene' });
                }

                preload() {
                    // Load tileset images
                    this.load.image('spritesheet', '/map/isometric tileset/spritesheet.png');
                    this.load.image('spritesheet02', '/map/isometric tileset/spritesheet02.png');

                    // Load tilemap
                    this.load.tilemapTiledJSON('map', '/map/map.tmj');

                    // Load character sprite
                    this.load.svg('character', '/character.svg', { width: 48, height: 48 });
                }

                create() {
                    sceneRef.current = this;

                    const map = this.make.tilemap({ key: 'map' });

                    const tileset1 = map.addTilesetImage('spritesheet', 'spritesheet');
                    const tileset2 = map.addTilesetImage('spritesheet02', 'spritesheet02');

                    // Create layers
                    ['base', 'buildings', 'trees', 'deer', 'text', 'header_decor'].forEach(name => {
                        map.createLayer(name, [tileset1, tileset2], 0, 0);
                    });

                    // Center the map in the view
                    const worldX = (map.width - map.height) * map.tileWidth * 0.2;
                    const worldY = (map.width + map.height) * map.tileHeight * 0.25;

                    // Center the map in the view
                    this.cameras.main.scrollX = worldX - (this.scale.width / 2);
                    this.cameras.main.scrollY = worldY - (this.scale.height / 2);

                    this.cameras.main.setZoom(1);
                }

                update() {
                    // Smooth interpolation for player movement
                    playersRef.current.forEach((playerSprite) => {
                        const container = playerSprite.container;
                        const targetX = playerSprite.targetX;
                        const targetY = playerSprite.targetY;

                        // Lerp towards target position
                        const lerpFactor = 0.15;
                        container.x += (targetX - container.x) * lerpFactor;
                        container.y += (targetY - container.y) * lerpFactor;
                    });
                }
            }

            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                parent: container,
                width: typeof window !== 'undefined' ? window.innerWidth : 800,
                height: typeof window !== 'undefined' ? window.innerHeight : 600,
                render: {
                    pixelArt: true,
                    antialias: false,
                },
                scene: VenueScene,
                physics: {
                    default: 'arcade',
                    arcade: {
                        debug: false,
                    },
                },
            };

            gameRef.current = new Phaser.Game(config);

            // Handle window resize
            handleResize = () => {
                if (gameRef.current) {
                    gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
                }
            };

            window.addEventListener('resize', handleResize);
        }).catch((error) => {
            console.error('Failed to load Phaser:', error);
        });

        // Cleanup
        return () => {
            isMounted = false;
            
            if (handleResize) {
                window.removeEventListener('resize', handleResize);
            }
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
            // Clear players
            players.clear();
            sceneRef.current = null;
        };
    }, [updatePlayers]);

    return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
};
