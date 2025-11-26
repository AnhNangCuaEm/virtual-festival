'use client';
import { useEffect, useRef, useState } from 'react';
import * as headbreaker from 'headbreaker';
import Header from '@/components/layout/Header';
import BackBtn from '@/components/ui/BackBtn';
import Link from 'next/link';

const imageList = [
  '/images/zone_4/zone_4_pz01.jpg',
  '/images/zone_4/zone_4_pz04.jpg',
  '/images/zone_4/zone_4_pz03.jpg'
];

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const ss = s.toString().padStart(2, '0');
  return `${m}:${ss}`;
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
    const width = Math.min(800, window.innerWidth - 32);
    const height = Math.floor(width * 0.75);
    setCanvasSize({ width, height });
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
    const horiz = 4;
    const vert = 3;

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

      // Add boundary constraint for dragged pieces
      const stageObj = (canvas as unknown as { stage?: unknown }).stage;
      if (stageObj) {
        const stage = stageObj as { on: (event: string, handler: (e: unknown) => void) => void };
        stage.on('dragmove', (e: unknown) => {
          const evt = e as { target?: { x?: (val?: number) => number; y?: (val?: number) => number; width?: () => number; height?: () => number; getParent?: () => unknown } };
          const target = evt.target;
          if (!target || typeof target.x !== 'function' || typeof target.y !== 'function') return;

          const margin = 150;
          const x = target.x?.();
          const y = target.y?.();
          const w = target.width?.() || 0;
          const h = target.height?.() || 0;

          // Constrain x
          if (x !== undefined && x > width + margin) {
            target.x?.(width + margin);
          }
          if (x !== undefined && x + w < -margin) {
            target.x?.(-margin - w);
          }

          // Constrain y
          if (y !== undefined && y > height + margin) {
            target.y?.(height + margin);
          }
          if (y !== undefined && y + h < -margin) {
            target.y?.(-margin - h);
          }
        });
      }

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
  }, [level, canvasSize, showNextPrompt, showStart]);

  const handleStart = () => {
    setShowStart(false);
    setTicking(true);
  };

  const handleNextLevel = () => {
    setShowNextPrompt(false);
    setLevel(prev => prev + 1);
  };

  // Auto next level after 2 seconds when completed
  useEffect(() => {
    if (!showNextPrompt) return;

    const timer = setTimeout(() => {
      handleNextLevel();
    }, 1000);

    return () => clearTimeout(timer);
  }, [showNextPrompt]);

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

  const startBg = imageList[level] ?? '';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Header />
      <div className="w-full h-16 flex items-center justify-between px-4">
        <BackBtn />
      </div>

      <main className="relative flex flex-col items-center justify-center w-full flex-1 px-4 text-center space-y-4">
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
              <div className="w-fit bg-theme-purple rounded-3xl px-8 py-6 mb-4 text-[#1f2430] shadow">
                <h1 className="text-2xl font-bold mb-4">富士山パズルゲーム</h1>
                <p className="text-lg leading-relaxed">
                  次のパズルを解いてください。<br />
                  早いほどポイントが取れます。
                </p>
              </div>
              <button
                onClick={handleStart}
                className="px-8 py-3 bg-theme-yellow rounded-full font-semibold active:scale-95 transition-transform"
              >
                スタート
              </button>
            </div>
          </div>
        )}

        {!showStart && !isFinished && (
          <div className="flex items-center gap-2 text-lg text-white/90">
            <div className="px-3 py-1 rounded bg-white/10">Time: {formatTime(totalSeconds)}</div>
            <div className="px-3 py-1 rounded bg-white/10">Score: {score}</div>
            <button
              onClick={handleSkip}
              className="px-3 py-1 ml-2 rounded-full bg-red-500/90 text-white active:scale-95 transition-transform"
            >
              Skip
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
              <div className="text-5xl font-bold text-white mb-4">
                Congratulation
              </div>
              <div className="text-xl text-white font-bold">
                <span className="text-2xl text-red-500 font-bold mr-1">{formatTime(totalSeconds)}</span>
                秒でクリアしました！
              </div>
              <div className="text-4xl font-bold text-green-500">
                {score} Points
              </div>

              <div className="mt-6 flex gap-3">
                {/* <button
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-lg bg-white/80 text-[#1f2430] font-semibold active:scale-[0.98]"
                >
                  Restart
                </button> */}
                <Link
                  href="/controller/"
                  className="px-8 py-3 bg-theme-yellow text-black rounded-lg font-semibold active:scale-95 transition-transform"
                >
                  コントローラーに戻る
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
            <>
              {!isFinished && (
                <div className="w-full bg-white/10 rounded-xl border border-white/20 p-3">
                  <div
                    className="rounded-lg"
                    style={{
                      width: '100%',
                      height: 'auto',
                      backgroundImage: `url(${imageList[level]})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      aspectRatio: '4/3'
                    }}
                  />
                </div>
              )}
              <div
                ref={puzzleRef}
                id="puzzle"
                className="relative"
                style={{
                  width: `${canvasSize.width}px`,
                  height: `${canvasSize.height}px`,
                  backgroundColor: 'rgba(128,128,128,0.5)',
                  border: '1px solid #3a3f4a'
                }}
              />
              <div className="text-md font-semibold text-white/90">
                レベル：{Math.min(level + 1, imageList.length)} / {imageList.length}
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
}
