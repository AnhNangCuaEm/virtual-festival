'use client';
import { useEffect, useRef, useState } from 'react';
import * as headbreaker from 'headbreaker';
import Header from '@/components/layout/Header';
import MuteBtn from '@/components/ui/MuteBtn';
import Link from 'next/link';

const imageList = [
  '/images/zone_4/zone_4_pz01.jpg',
  '/images/zone_4/zone_4_pz02.jpg',
  '/images/zone_4/zone_4_pz03.jpg',
  '/images/zone_4/zone_4_pz04.jpg',
  '/images/zone_4/zone_4_pz05.jpg'
];

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const ss = s.toString().padStart(2, '0');
  return `${m}:${ss}s`;
}

export default function Zone4() {
  const puzzleRef = useRef<HTMLDivElement>(null);

  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);

  const [isFinished, setIsFinished] = useState(false);
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [showStart, setShowStart] = useState(true);

  const [totalSeconds, setTotalSeconds] = useState(0);
  const [ticking, setTicking] = useState(false);

  const connectedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    connectedRef.current = new Set();
  }, [level, showStart]);

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    const updateSize = () => {
      const width = Math.min(800, window.innerWidth - 32);
      const height = Math.floor(width * 0.75);
      setCanvasSize({ width, height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setTotalSeconds(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  useEffect(() => {
    const container = puzzleRef.current;

    if (!container || level >= imageList.length || showNextPrompt || showStart) return;

    container.innerHTML = '';

    const { width, height } = canvasSize;
    const horiz = 5;
    const vert = 4;

    const pieceSize = Math.min(
      Math.floor(width / horiz),
      Math.floor(height / vert)
    );

    type Meta = { pid: string; r: number; c: number };
    const metadata: Meta[] = Array.from({ length: horiz * vert }, (_, i) => ({
      pid: `L${level}-P${i}`,
      r: Math.floor(i / horiz),
      c: i % horiz
    }));

    const img = new Image();
    img.src = imageList[level];
    img.onload = () => {
      const canvas = new headbreaker.Canvas(container.id, {
        width,
        height,
        pieceSize,
        proximity: 20,
        borderFill: 5,
        strokeWidth: 2,
        lineSoftness: 0.25,
        painter: new headbreaker.painters.Konva(),
        outline: new headbreaker.outline.Rounded(),
        image: img,
        preventOffstageDrag: true,
        fixed: true
      });

      canvas.adjustImagesToPuzzleHeight();

      canvas.autogenerate({
        horizontalPiecesCount: horiz,
        verticalPiecesCount: vert,
        metadata
      });

      const pidAt = (r: number, c: number) => {
        if (r < 0 || r >= vert || c < 0 || c >= horiz) return undefined;
        return metadata[r * horiz + c]?.pid;
      };

      const neighbors = new Map<string, Set<string>>();
      for (const m of metadata) {
        const set = new Set<string>();
        const left = pidAt(m.r, m.c - 1);
        const right = pidAt(m.r, m.c + 1);
        const up = pidAt(m.r - 1, m.c);
        const down = pidAt(m.r + 1, m.c);
        if (left) set.add(left);
        if (right) set.add(right);
        if (up) set.add(up);
        if (down) set.add(down);
        neighbors.set(m.pid, set);
      }

      const getPid = (obj: unknown): string | undefined => {
        if (obj && typeof obj === 'object' && 'metadata' in obj) {
          const meta = (obj as { metadata?: unknown }).metadata;
          if (meta && typeof meta === 'object' && 'pid' in meta) {
            const pid = (meta as { pid?: unknown }).pid;
            return typeof pid === 'string' ? pid : undefined;
          }
        }
        return undefined;
      };

      canvas.attachConnectionRequirement((one: unknown, other: unknown) => {
        const a = getPid(one);
        const b = getPid(other);
        if (!a || !b) return false;
        return neighbors.get(a)?.has(b) === true || neighbors.get(b)?.has(a) === true;
      });

      canvas.reframeWithinDimensions();
      canvas.shuffle(0.7);
      canvas.draw();

      canvas.onConnect((piece: unknown, _fig: unknown, targetPiece: unknown) => {
        const a = getPid(piece);
        const b = getPid(targetPiece);
        const isNeighbor =
          !!a && !!b && (neighbors.get(a)?.has(b) === true || neighbors.get(b)?.has(a) === true);
        if (!isNeighbor) return;

        if (a) connectedRef.current.add(a);
        if (b) connectedRef.current.add(b);
      });

      canvas.onDisconnect((piece: unknown) => {
        const a = getPid(piece);
        if (a) connectedRef.current.delete(a);
      });

      canvas.attachSolvedValidator();
      canvas.onValid(() => {
        if (level < imageList.length - 1) {
          setScore(s => s + 20);
          setShowNextPrompt(true);
        } else {
          setScore(s => s + 20);
          setTicking(false);
          setIsFinished(true);
        }
      });
    };

    return () => {
      container.innerHTML = '';
    };
  }, [level, canvasSize, showNextPrompt, showStart]);

  const handleStart = () => {
    setShowStart(false);
    setTicking(true);
  };

  const handleNextLevel = () => {
    setShowNextPrompt(false);
    setLevel(prev => prev + 1);
  };

  const handleSkip = () => {
    const gained = connectedRef.current.size;
    if (gained > 0) setScore(s => s + gained);

    if (level < imageList.length - 1) {
      setShowNextPrompt(false);
      setLevel(prev => prev + 1);
    } else {
      setTicking(false);
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setLevel(0);
    setScore(0);
    setTotalSeconds(0);
    setIsFinished(false);
    setShowNextPrompt(false);
    setShowStart(true);
    setTicking(false);
    connectedRef.current = new Set();
  };

  const startBg = imageList[level] ?? '';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-[#1f2430]">
      <Header />
      <div className="w-full h-16 flex items-center justify-between px-4">
        <Link href="/controller">
          <button className="p-2 px-4 bg-gray-200/80 rounded-lg text-black font-semibold">
            Back
          </button>
        </Link>
        <MuteBtn />
      </div>

      <main className="relative flex flex-col items-center justify-start w-full flex-1 px-4 text-center space-y-4">
        <h1 className="text-2xl font-bold text-white">富士山パズルゲーム</h1>

        {/* スタートページ */}
        {showStart && !isFinished && (
          <div
            className="relative rounded-2xl overflow-hidden shadow-lg"
            style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${startBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(8px) brightness(0.7)'
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <div className="max-w-[85%] w-full bg-white/80 backdrop-blur-md rounded-xl p-4 text-[#1f2430] shadow">
                <h2 className="text-base font-semibold mb-2">Description</h2>
                <p className="text-sm leading-relaxed">
                  次のパズルを解いてください。<br />
                  早いほどポイントが取れる
                </p>
              </div>
              <button
                onClick={handleStart}
                className="mt-6 px-8 py-3 rounded-full font-semibold text-[#1f2430] shadow active:scale-[0.98]"
                style={{ background: 'linear-gradient(180deg, #F7FF9E 0%, #E8FF57 100%)' }}
              >
                Start
              </button>
            </div>
          </div>
        )}

        {!showStart && !isFinished && (
          <div className="flex items-center gap-2 text-white/90">
            <div className="px-3 py-1 rounded bg-white/10">Time: {formatTime(totalSeconds)}</div>
            <div className="px-3 py-1 rounded bg-white/10">Score: {score}</div>
            <button
              onClick={handleSkip}
              className="px-3 py-1 rounded bg-red-500/90 text-white active:scale-[0.98]"
            >
              SKIP
            </button>
          </div>
        )}

        {/* 結算 */}
        {isFinished ? (
          <div
            className="relative rounded-2xl overflow-hidden shadow-lg"
            style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${imageList[imageList.length - 1]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(6px) brightness(0.8)'
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <div className="text-2xl md:text-3xl font-bold text-black drop-shadow-sm mb-3">
                Congratulation
              </div>
              <div className="text-base md:text-lg font-medium text-black mb-1">
                Finished in <span className="text-red-600 font-bold">{formatTime(totalSeconds)}</span>
              </div>
              <div className="text-lg md:text-xl font-bold" style={{ color: '#4cc84c' }}>
                {score} Point
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-lg bg-white/80 text-[#1f2430] font-semibold active:scale-[0.98]"
                >
                  Restart
                </button>
                <Link href="/controller">
                  <button
                    className="px-4 py-2 rounded-lg text-[#1f2430] font-semibold active:scale-[0.98]"
                    style={{ background: 'linear-gradient(180deg, #F7FF9E 0%, #E8FF57 100%)' }}
                  >
                    Back to Menu
                  </button>
                </Link>
              </div>
            </div>

            <style jsx>{`
              @keyframes confetti {
                0% { transform: translateY(-40%) rotate(0deg); opacity: 0; }
                10% { opacity: 1; }
                100% { transform: translateY(140%) rotate(720deg); opacity: 0; }
              }
            `}</style>
            {[...Array(24)].map((_, i) => (
              <span
                key={i}
                className="absolute"
                style={{
                  top: `${Math.random() * 20 - 10}%`,
                  left: `${(i / 24) * 100}%`,
                  width: '3px',
                  height: `${6 + Math.random() * 16}px`,
                  background: ['#ff4d4f', '#36cfc9', '#597ef7', '#73d13d', '#faad14'][i % 5],
                  animation: `confetti ${2.8 + Math.random()}s ease-in forwards`,
                  animationDelay: `${Math.random() * 0.6}s`
                }}
              />
            ))}
          </div>
        ) : (
          !showStart && (
            <div
              ref={puzzleRef}
              id="puzzle"
              className="relative rounded-xl"
              style={{
                width: `${canvasSize.width}px`,
                height: `${canvasSize.height}px`,
                backgroundColor: 'rgba(128,128,128,0.5)',
                border: '1px solid #3a3f4a'
              }}
            />
          )
        )}

        <div className="text-md font-semibold text-white/90">
          Stage：{Math.min(level + 1, imageList.length)} / {imageList.length}
        </div>
      </main>

      {showNextPrompt && !isFinished && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-5 rounded-2xl shadow-lg text-center max-w-[90%]">
            <p className="mb-3 font-medium">完成！次へ進みますか？</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowNextPrompt(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800"
              >
                もう少し見る
              </button>
              <button
                onClick={handleNextLevel}
                className="px-4 py-2 rounded-lg text-[#1f2430]"
                style={{ background: 'linear-gradient(180deg, #F7FF9E 0%, #E8FF57 100%)' }}
              >
                次へ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
