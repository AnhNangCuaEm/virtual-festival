'use client';

import { useEffect, useRef } from 'react';

export const VenueMap = () => {
    const gameRef = useRef<{ destroy: (b: boolean) => void; scale: { resize: (w: number, h: number) => void } } | null>(null);

    useEffect(() => {
        if (gameRef.current) return;

        // Dynamic import Phaser
        import('phaser').then((PhaserModule) => {
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
                }

                create() {
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
            }

            const config: object = {
                type: Phaser.AUTO,
                parent: 'venue-game-container',
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
            const handleResize = () => {
                if (gameRef.current) {
                    gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
                }
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                if (gameRef.current) {
                    gameRef.current.destroy(true);
                    gameRef.current = null;
                }
            };
        });
    }, []);

    return <div id="venue-game-container" style={{ width: '100%', height: '100vh' }} />;
};
