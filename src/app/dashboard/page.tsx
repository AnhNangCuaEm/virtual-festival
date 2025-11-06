"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { InfiniteGallery } from "@/components/ui/infinite-gallery";

interface GameRanking {
  title: string;
  players: Array<{ name: string; points: number }>;
}

export default function DashboardPage() {
  const [gameRankings] = useState<GameRanking[]>([
    {
      title: "山手線クイズ",
      players: [],
    },
    {
      title: "東京電車アナウンス",
      players: [],
    },
    {
      title: "富士山パズル",
      players: [],
    },
    {
      title: "鹿せんべいチャレンジ",
      players: [],
    },
    {
      title: "納豆混ぜゲーム",
      players: [],
    },
  ]);

  const galleryImages = Array.from(
    { length: 8 },
    (_, i) => `/images/zone_1/${i + 1}.jpg`
  );

  useEffect(() => {
    const getServerUrl = () => {
      if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        if (hostname !== "localhost" && hostname !== "127.0.0.1") {
          return `http://${hostname}:3001`;
        }
      }
      return "http://localhost:3001";
    };
    const serverUrl = getServerUrl();
    const newSocket = io(serverUrl, { transports: ["websocket"] });
    newSocket.on("connect", () => {
      console.log("Dashboard connected to server");
      newSocket.emit("setRole", "viewer");
    });
    // Player updates can be wired here later when real data is ready
    return () => {
      newSocket.close();
    };
  }, []);

  // Rankings will be populated from live data in the future; mock logic removed

  return (
    <div
      className="min-h-screen p-6 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url(/background/db_background.jpg)" }}
    >
      {/* Top Section: 5 Ranking Tables */}
      <div className="min-h-[40vh] grid grid-cols-5 gap-4 mb-8">
        {gameRankings.map((game, idx) => (
          <div
            key={idx}
            className="rounded-2xl shadow-lg border-2 flex flex-col"
            style={{ borderColor: "#B3A0FF", backgroundColor: "#242833" }}
          >
            <div
              className="text-center font-bold text-black text-sm py-3 px-4 m-0"
              style={{
                backgroundColor: "#B3A0FF",
                borderTopLeftRadius: "14px",
                borderTopRightRadius: "14px",
              }}
            >
              {game.title}
            </div>
            <div className="relative flex-1">
              <table className="w-full text-sm border-collapse">
                <colgroup>
                  <col className="w-12" />
                  <col />
                  <col className="w-20" />
                </colgroup>
                <thead>
                  <tr className="border-b border-white bg-[#242833]">
                    <th className="px-3 py-3"></th>
                    <th className="px-3 py-3 text-center font-semibold text-white text-lg">
                      Player
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-white text-lg">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="min-h-[200px]">
                  {game.players.slice(0, 3).map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 pt-2 pb-2 text-center text-white text-sm">
                        {i + 1}
                      </td>
                      <td className="px-3 pt-2 pb-2 text-white text-sm">
                        {p.name}
                      </td>
                      <td className="px-3 pt-2 pb-2 text-center text-white text-sm">
                        {p.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Vertical lines overlay to extend to bottom regardless of rows */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-0 bottom-0 left-[3rem] w-px bg-white" />
                <div className="absolute top-0 bottom-0 right-[5rem] w-px bg-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Bottom Section: Gallery + Total Ranking */}
      <div className="grid grid-cols-11 gap-6">
        {/* Gallery Section */}
        <div
          className="col-span-8 rounded-2xl p-1 shadow-lg"
          style={{ backgroundColor: "#B3A0FF" }}
        >
          <div
            className="rounded-xl p-8"
            style={{ backgroundColor: "#242833" }}
          >
            {/* Gallery Grid with Infinite Scroll - 2 rows */}
            <div className="space-y-4">
              <InfiniteGallery
                images={galleryImages}
                direction="left"
                speed="normal"
                pauseOnHover={true}
                stagger={true}
                staggerAmount={8}
                className="w-full"
              />
              <InfiniteGallery
                images={galleryImages}
                direction="left"
                speed="normal"
                pauseOnHover={true}
                stagger={true}
                staggerAmount={10}
                className="w-full"
              />
            </div>
          </div>
        </div>
        {/* Total Ranking Section - 1.5x wider than game tables */}
        <div
          className="col-span-3 rounded-2xl shadow-lg border-2 flex flex-col"
          style={{ borderColor: "#B3A0FF", backgroundColor: "#242833" }}
        >
          <div
            className="text-center font-bold text-black text-base py-3 px-4 m-0"
            style={{
              backgroundColor: "#B3A0FF",
              borderTopLeftRadius: "14px",
              borderTopRightRadius: "14px",
            }}
          >
            Total Ranking
          </div>
          <div className="relative flex-1">
            <table className="w-full border-collapse">
              <colgroup>
                <col className="w-12" />
                <col />
                <col className="w-20" />
              </colgroup>
              <thead>
                <tr className="border-b border-white bg-[#242833]">
                  <th className="px-3 py-3"></th>
                  <th className="px-3 py-3 text-center font-semibold text-white text-lg">
                    Player
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-white text-lg">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
            {/* Vertical lines overlay for full height */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 bottom-0 left-[3rem] w-px bg-white" />
              <div className="absolute top-0 bottom-0 right-[5rem] w-px bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
