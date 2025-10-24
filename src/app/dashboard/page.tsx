'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { InfiniteGallery } from '@/components/ui/infinite-gallery';

interface Player {
  id: string;
  socketId: string;
  x: number;
  y: number;
  color: string;
  name: string;
  connectedAt: string;
}

interface GameRanking {
  title: string;
  players: Array<{ name: string; points: number }>;
}

export default function DashboardPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [gameRankings, setGameRankings] = useState<GameRanking[]>([
    { title: '山手線クイズ', players: [] },
    { title: '東京電車アナウンス', players: [] },
    { title: '富士山パズル', players: [] },
    { title: '鹿せんべいチャレンジ', players: [] },
    { title: '納豆混ぜゲーム', players: [] },
  ]);
  const galleryImages = Array.from({ length: 8 }, (_, i) => `/images/zone_1/${i + 1}.jpg`);

  useEffect(() => {
    const getServerUrl = () => {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          return `http://${hostname}:3001`;
        }
      }
      return 'http://localhost:3001';
    };

    const serverUrl = getServerUrl();
    const newSocket = io(serverUrl, { transports: ['websocket'] });

    newSocket.on('connect', () => {
      console.log('Dashboard connected to server');
      setIsConnected(true);
      newSocket.emit('setRole', 'viewer');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('players', (playersData: Record<string, Player>) => {
      setPlayers(playersData);
      updateRankings(playersData);
    });

    setSocket(newSocket);
    return () => {
      newSocket.close();
    };
  }, []);

  const updateRankings = (playersData: Record<string, Player>) => {
    const playerArray = Object.values(playersData);
    const mockPoints = [999, 888, 777];

    setGameRankings(prev =>
      prev.map((game, idx) => ({
        ...game,
        players: playerArray.slice(0, 3).map((p, pIdx) => ({
          name: p.name,
          points: mockPoints[pIdx] - idx * 50,
        })),
      }))
    );
  };

  const playerList = Object.entries(players);
  const topPlayers = playerList.slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-rose-800 p-6">


      {/* Top Section: 5 Ranking Tables */}
      <div className="min-h-[40vh] grid grid-cols-5 gap-4 mb-8">
        {gameRankings.map((game, idx) => (
          <div key={idx} className="bg-purple-300/60 backdrop-blur-md rounded-2xl p-4 shadow-lg">
            <h3 className="text-center font-bold text-gray-800 text-sm mb-3">{game.title}</h3>
            <table className="w-full text-xs text-gray-800">
              <thead>
                <tr className="bg-purple-400/40 border-b border-gray-400/30">
                  <th className="px-2 py-1.5 text-left font-semibold">Player</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Points</th>
                </tr>
              </thead>
              <tbody>
                {game.players.length > 0 ? (
                  game.players.map((p, i) => (
                    <tr key={i} className="border-b border-gray-300/20 hover:bg-purple-400/20">
                      <td className="px-2 py-1.5">{p.name}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{p.points}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-2 py-1.5 text-center">...</td>
                  </tr>
                )}
                <tr className="border-t border-gray-300/30">
                  <td className="px-2 py-1 text-center text-gray-600">...</td>
                  <td className="px-2 py-1 text-center text-gray-600">...</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Bottom Section: Gallery + Total Ranking */}
      <div className="grid grid-cols-3 gap-6">
        {/* Gallery Section - 2/3 width */}
        <div className="col-span-2 bg-purple-600/40 backdrop-blur-md rounded-2xl border-2 border-white/30 p-8 shadow-lg">
          <h2 className="text-white text-2xl font-bold mb-6">Kimono Try on Gallery</h2>

          {/* Gallery Grid with Infinite Scroll - 2 rows */}
          <div className="space-y-4">
            <InfiniteGallery
              images={galleryImages}
              direction="left"
              speed="normal"
              pauseOnHover={true}
              className="w-full"
            />
            <InfiniteGallery
              images={galleryImages}
              direction="left"
              speed="normal"
              pauseOnHover={true}
              className="w-full"
            />
          </div>
        </div>

        {/* Total Ranking Section - 1/3 width */}
        <div className="bg-purple-300/60 backdrop-blur-md rounded-2xl p-5 shadow-lg h-fit">
          <h3 className="text-center font-bold text-gray-800 text-base mb-4">Total Ranking</h3>
          <table className="w-full text-sm text-gray-800">
            <thead>
              <tr className="bg-purple-400/40 border-b border-gray-400/30">
                <th className="px-2 py-2 text-center font-semibold">#</th>
                <th className="px-2 py-2 text-left font-semibold">Player</th>
                <th className="px-2 py-2 text-right font-semibold">Points</th>
              </tr>
            </thead>
            <tbody>
              {topPlayers.length > 0 ? (
                topPlayers.map((_, idx) => (
                  <tr key={idx} className="border-b border-gray-300/20 hover:bg-purple-400/20">
                    <td className="px-2 py-2 text-center font-bold">{idx + 1}</td>
                    <td className="px-2 py-2">{playerList[idx]?.[1]?.name || '-'}</td>
                    <td className="px-2 py-2 text-right font-bold">{999 - idx * 111}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-2 py-2 text-center text-gray-600">No players</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}