"use client";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import Phaser from "phaser";
import Header from "@/components/layout/Header";
// import MuteBtn from "@/components/ui/MuteBtn";
import BackBtn from "@/components/ui/BackBtn";
import { motion, AnimatePresence } from "framer-motion";

type GameState = "description" | "playing" | "result";

export default function NattoGamePage() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [gameState, setGameState] = useState<GameState>("description");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [mixingQuality, setMixingQuality] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasMixingStarted, setHasMixingStarted] = useState(false);
  const timerStarted = useRef(false);

  // Connect to socket
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
      console.log("Zone 6 (Natto Game) connected");
      newSocket.emit("setRole", "zone_6");
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setMixingQuality(0);
    setTimeLeft(20);
    setHasMixingStarted(false);
  };

  // Game timer - starts only when mixing begins, then runs continuously
  useEffect(() => {
    if (gameState !== "playing") return;

    // Start timer only when mixing begins for the first time
    if (hasMixingStarted && !timerStarted.current) {
      timerStarted.current = true;

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Game over
            setGameState("result");
            if (timerRef.current) clearInterval(timerRef.current);

            if (socket) {
              socket.emit("gameScore", {
                zone: "zone_6",
                game: "納豆混ぜゲーム",
                score: score,
              });
            }

            if (socket) {
              socket.emit("gameScore", {
                zone: "zone_6",
                game: "納豆混ぜゲーム",
                score: score,
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup when game ends
    return () => {
      if (gameState !== "playing" && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        timerStarted.current = false;
      }
    };
  }, [gameState, hasMixingStarted, score, socket]);

  // Separate effect to watch for mixing start
  useEffect(() => {
    if (gameState === "playing" && hasMixingStarted && !timerStarted.current) {
      // Force re-run of timer effect
      setScore((prev) => prev);
    }
  }, [hasMixingStarted, gameState]);

  // Phaser game setup
  useEffect(() => {
    if (
      !gameContainerRef.current ||
      typeof window === "undefined" ||
      gameState !== "playing"
    )
      return;

    class NattoScene extends Phaser.Scene {
      private beans: Phaser.Physics.Matter.Image[] = [];
      private beanConnections: Set<string> = new Set();
      private beanConnectionCount: Map<number, number> = new Map();
      private connectionsArray: string[] = [];
      private connectionCheckCounter = 0;
      private pointer: Phaser.Input.Pointer | null = null;
      private mixingProgress = 0;
      private lastPointerPos = { x: 0, y: 0 };
      private pointerSpeed = 0;
      private instantMixingQuality = 0;
      private mixingQualitySmoothed = 0;
      private graphics: Phaser.GameObjects.Graphics | null = null;
      private bowlGraphics: Phaser.GameObjects.Graphics | null = null;
      private bowlRadius = 0;
      private centerX = 0;
      private centerY = 0;
      private totalRotation = 0;
      private lastAngle = 0;
      private onMixingStart?: () => void;

      constructor(onMixingStartCallback?: () => void) {
        super({ key: "NattoScene" });
        this.onMixingStart = onMixingStartCallback;
      }

      create() {
        const { width, height } = this.cameras.main;
        this.centerX = width / 2;
        this.centerY = height / 2;
        this.bowlRadius = 150;

        this.matter.world.setBounds(0, 0, width, height);

        this.bowlGraphics = this.add.graphics();
        if (this.bowlGraphics) {
          this.bowlGraphics.setDepth(-1);
          this.drawBowl();
        }

        this.graphics = this.add.graphics();
        this.scale.on("resize", this.handleResize, this);

        // Create circular boundary
        const segments = 24;
        for (let i = 0; i < segments; i++) {
          const angle1 = (i / segments) * Math.PI * 2;
          const angle2 = ((i + 1) / segments) * Math.PI * 2;
          const x1 = this.centerX + Math.cos(angle1) * this.bowlRadius;
          const y1 = this.centerY + Math.sin(angle1) * this.bowlRadius;
          const x2 = this.centerX + Math.cos(angle2) * this.bowlRadius;
          const y2 = this.centerY + Math.sin(angle2) * this.bowlRadius;

          const wall = this.matter.add.rectangle(
            (x1 + x2) / 2,
            (y1 + y2) / 2,
            Phaser.Math.Distance.Between(x1, y1, x2, y2),
            10,
            {
              isStatic: true,
              angle: Math.atan2(y2 - y1, x2 - x1),
            }
          );
          wall.render.visible = false;
        }

        // Create beans
        const beanCount = 200;
        const beanRadius = 5;
        const beanConfig = {
          restitution: 0.2,
          friction: 0.9,
          frictionAir: 0.2,
          density: 0.003,
        };

        for (let i = 0; i < beanCount; i++) {
          const angle = (i / beanCount) * Math.PI * 2;
          const radius =
            Math.random() * (this.bowlRadius - beanRadius * 3) + beanRadius * 2;
          const x = this.centerX + Math.cos(angle) * radius;
          const y = this.centerY + Math.sin(angle) * radius;

          const bean = this.matter.add.circle(x, y, beanRadius, beanConfig);
          this.beans.push(bean as unknown as Phaser.Physics.Matter.Image);
        }

        this.pointer = this.input.activePointer;
      }

      drawBowl() {
        if (!this.bowlGraphics) return;
        this.bowlGraphics.fillStyle(0x4a3728, 1);
        this.bowlGraphics.fillCircle(
          this.centerX,
          this.centerY,
          this.bowlRadius + 10
        );
        this.bowlGraphics.fillStyle(0xd4c5b0, 1);
        this.bowlGraphics.fillCircle(
          this.centerX,
          this.centerY,
          this.bowlRadius
        );
        this.bowlGraphics.fillStyle(0xbfae96, 0.5);
        this.bowlGraphics.fillCircle(
          this.centerX,
          this.centerY + 3,
          this.bowlRadius - 5
        );
      }

      handleResize(gameSize: { width: number; height: number }) {
        this.centerX = gameSize.width / 2;
        this.centerY = gameSize.height / 2;
        if (this.bowlGraphics) {
          this.bowlGraphics.clear();
          this.drawBowl();
        }
        this.matter.world.setBounds(0, 0, gameSize.width, gameSize.height);
      }

      update() {
        if (!this.pointer) return;

        const dx = this.pointer.x - this.lastPointerPos.x;
        const dy = this.pointer.y - this.lastPointerPos.y;
        this.pointerSpeed = Math.sqrt(dx * dx + dy * dy);

        const currentPointerAngle = Math.atan2(
          this.pointer.y - this.centerY,
          this.pointer.x - this.centerX
        );

        if (this.pointer.isDown) {
          // Start timer on first mixing
          if (!hasMixingStarted && this.pointerSpeed > 1) {
            this.onMixingStart?.();
          }

          if (this.lastPointerPos.x !== 0 || this.lastPointerPos.y !== 0) {
            let deltaAngle = currentPointerAngle - this.lastAngle;
            if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
            if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
            this.totalRotation += deltaAngle;
          }
          this.lastAngle = currentPointerAngle;
        }

        this.lastPointerPos = { x: this.pointer.x, y: this.pointer.y };

        // Calculate instant mixing quality based on pointer speed
        if (this.pointer.isDown && this.pointerSpeed > 1) {
          // Quality increases with speed, max at speed 40+ (increased threshold)
          this.instantMixingQuality = Math.min(
            100,
            (this.pointerSpeed / 60) * 100
          );
        } else {
          // Quality decreases when not mixing
          this.instantMixingQuality = Math.max(
            0,
            this.instantMixingQuality - 10
          );
        }

        // Smooth the quality display for better UX
        const smoothingFactor = 0.1;
        this.mixingQualitySmoothed =
          this.mixingQualitySmoothed * (1 - smoothingFactor) +
          this.instantMixingQuality * smoothingFactor;

        // Apply forces to beans
        this.beans.forEach((bean) => {
          const body = bean as unknown as MatterJS.BodyType;
          const bx = body.position.x;
          const by = body.position.y;

          if (this.pointer!.isDown && this.pointerSpeed > 1) {
            const beanAngleFromCenter = Math.atan2(
              by - this.centerY,
              bx - this.centerX
            );
            const tangentAngle = beanAngleFromCenter - Math.PI / 2;
            const rotationForce = this.pointerSpeed * 0.000005;

            this.matter.applyForce(body, {
              x: Math.cos(tangentAngle) * rotationForce,
              y: Math.sin(tangentAngle) * rotationForce,
            });

            const distToPointer = Phaser.Math.Distance.Between(
              this.pointer!.x,
              this.pointer!.y,
              bx,
              by
            );
            const influence = Math.max(0, 1 - distToPointer / 150);

            if (influence > 0.2) {
              const angle = Math.atan2(
                this.pointer!.y - by,
                this.pointer!.x - bx
              );
              const force = this.pointerSpeed * influence * 0.00002;

              this.matter.applyForce(body, {
                x: Math.cos(angle) * force,
                y: Math.sin(angle) * force,
              });

              // Slow down mixing progress by 4x (0.0015 -> 0.000375)
              this.mixingProgress += influence * this.pointerSpeed * 0.000375;
            }
          }

          // Boundary check
          const distFromCenter = Phaser.Math.Distance.Between(
            bx,
            by,
            this.centerX,
            this.centerY
          );
          if (distFromCenter > this.bowlRadius - 5) {
            const angleToCenter = Math.atan2(
              this.centerY - by,
              this.centerX - bx
            );
            const pushForce = 0.01;

            this.matter.applyForce(body, {
              x: Math.cos(angleToCenter) * pushForce,
              y: Math.sin(angleToCenter) * pushForce,
            });

            const velocity = body.velocity;
            const speed = Math.sqrt(
              velocity.x * velocity.x + velocity.y * velocity.y
            );
            if (speed > 3) {
              this.matter.setVelocity(
                body,
                (velocity.x / speed) * 3,
                (velocity.y / speed) * 3
              );
            }
          }
        });

        // Redraw
        if (this.graphics) {
          this.graphics.clear();
          this.graphics.setDepth(0);

          this.connectionCheckCounter++;
          const shouldCheckConnections = this.connectionCheckCounter % 5 === 0;

          if (
            this.mixingProgress > 150 &&
            shouldCheckConnections &&
            this.pointer!.isDown
          ) {
            const connectionRadius = 30;
            const maxConnectionsPerBean = 6;
            const connectionRadiusSq = connectionRadius * connectionRadius;
            const beansToCheck = Math.min(50, this.beans.length);
            const startIndex =
              (this.connectionCheckCounter * beansToCheck) % this.beans.length;

            for (let i = 0; i < beansToCheck; i++) {
              const beanIndex = (startIndex + i) % this.beans.length;
              const currentConnections =
                this.beanConnectionCount.get(beanIndex) || 0;

              if (currentConnections >= maxConnectionsPerBean) continue;

              const bean1 = this.beans[
                beanIndex
              ] as unknown as MatterJS.BodyType;
              const nearbyBeans: {
                bean: MatterJS.BodyType;
                distSq: number;
                index: number;
              }[] = [];

              for (let j = 1; j <= 30 && j < this.beans.length; j++) {
                const checkIndex = (beanIndex + j) % this.beans.length;
                const targetConnections =
                  this.beanConnectionCount.get(checkIndex) || 0;

                if (targetConnections >= maxConnectionsPerBean) continue;

                const bean2 = this.beans[
                  checkIndex
                ] as unknown as MatterJS.BodyType;
                const dx = bean1.position.x - bean2.position.x;
                const dy = bean1.position.y - bean2.position.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < connectionRadiusSq) {
                  nearbyBeans.push({ bean: bean2, distSq, index: checkIndex });
                }
              }

              if (nearbyBeans.length === 0) continue;

              nearbyBeans.sort((a, b) => a.distSq - b.distSq);

              const availableSlots = maxConnectionsPerBean - currentConnections;
              const connectionsToCreate = Math.min(
                availableSlots,
                nearbyBeans.length
              );

              for (let k = 0; k < connectionsToCreate; k++) {
                const targetBean = nearbyBeans[k];
                if (!targetBean) continue;

                const dist = Math.sqrt(targetBean.distSq);
                const connectionKey =
                  beanIndex < targetBean.index
                    ? `${beanIndex}-${targetBean.index}`
                    : `${targetBean.index}-${beanIndex}`;

                if (this.beanConnections.has(connectionKey)) continue;

                const distanceFactor = 1 - dist / connectionRadius;
                const progressFactor = Math.min(1, this.mixingProgress / 800);
                const stringStrength = distanceFactor * progressFactor;

                if (stringStrength > 0.15 && dist < connectionRadius) {
                  this.beanConnections.add(connectionKey);
                  this.beanConnectionCount.set(
                    beanIndex,
                    currentConnections + 1
                  );
                  this.beanConnectionCount.set(
                    targetBean.index,
                    (this.beanConnectionCount.get(targetBean.index) || 0) + 1
                  );
                  this.connectionsArray = Array.from(this.beanConnections);
                }
              }
            }
          }

          // Check and remove overstretched connections
          const maxConnectionDistance = 30 * 4; // connectionRadius * 1.5
          const maxDistanceSq = maxConnectionDistance * maxConnectionDistance;

          for (const connectionKey of this.beanConnections) {
            const [index1, index2] = connectionKey.split("-").map(Number);
            if (index1 >= this.beans.length || index2 >= this.beans.length)
              continue;

            const bean1 = this.beans[index1] as unknown as MatterJS.BodyType;
            const bean2 = this.beans[index2] as unknown as MatterJS.BodyType;

            const dx = bean1.position.x - bean2.position.x;
            const dy = bean1.position.y - bean2.position.y;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq > maxDistanceSq) {
              // Remove the connection
              this.beanConnections.delete(connectionKey);
              this.beanConnectionCount.set(
                index1,
                (this.beanConnectionCount.get(index1) || 0) - 1
              );
              this.beanConnectionCount.set(
                index2,
                (this.beanConnectionCount.get(index2) || 0) - 1
              );
            }
          }

          // Draw strings under beans (80%)
          if (this.beanConnections.size > 0) {
            if (this.connectionsArray.length !== this.beanConnections.size) {
              this.connectionsArray = Array.from(this.beanConnections);
            }

            const splitIndex = Math.floor(this.connectionsArray.length * 0.8);

            for (let i = 0; i < splitIndex; i++) {
              const connectionKey = this.connectionsArray[i];
              const [index1, index2] = connectionKey.split("-").map(Number);
              if (index1 >= this.beans.length || index2 >= this.beans.length)
                continue;

              const bean1 = this.beans[index1] as unknown as MatterJS.BodyType;
              const bean2 = this.beans[index2] as unknown as MatterJS.BodyType;

              this.graphics.lineStyle(2, 0xffffff, 0.5);
              this.graphics.beginPath();
              this.graphics.moveTo(bean1.position.x, bean1.position.y);
              this.graphics.lineTo(bean2.position.x, bean2.position.y);
              this.graphics.strokePath();
            }
          }

          // Draw beans
          this.beans.forEach((bean) => {
            const body = bean as unknown as MatterJS.BodyType;
            this.graphics!.fillStyle(0x8b7355, 1);
            this.graphics!.fillCircle(body.position.x, body.position.y, 7);
            this.graphics!.fillStyle(0xffe5b4, 0.6);
            this.graphics!.fillCircle(
              body.position.x - 2,
              body.position.y - 2,
              3
            );
          });

          // Draw strings on top (20%)
          if (this.beanConnections.size > 0) {
            const splitIndex = Math.floor(this.connectionsArray.length * 0.8);

            for (let i = splitIndex; i < this.connectionsArray.length; i++) {
              const connectionKey = this.connectionsArray[i];
              const [index1, index2] = connectionKey.split("-").map(Number);
              if (index1 >= this.beans.length || index2 >= this.beans.length)
                continue;

              const bean1 = this.beans[index1] as unknown as MatterJS.BodyType;
              const bean2 = this.beans[index2] as unknown as MatterJS.BodyType;

              this.graphics.lineStyle(2, 0xffffff, 0.5);
              this.graphics.beginPath();
              this.graphics.moveTo(bean1.position.x, bean1.position.y);
              this.graphics.lineTo(bean2.position.x, bean2.position.y);
              this.graphics.strokePath();
            }
          }

          this.graphics.setAlpha(1);
        }

        // Update React state
        const totalDegrees = Math.abs((this.totalRotation * 180) / Math.PI);
        const completeRotations = Math.floor(totalDegrees / 360);
        const newScore = completeRotations * 10;

        setScore(newScore);
        setMixingQuality(Math.floor(this.mixingQualitySmoothed));
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameContainerRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      transparent: true,
      physics: {
        default: "matter",
        matter: {
          gravity: { x: 0, y: 0 },
          debug: false,
          enableSleeping: false,
          positionIterations: 6,
          velocityIterations: 4,
        },
      },
      scene: new NattoScene(() => setHasMixingStarted(true)),
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        pixelArt: false,
        antialias: false,
        roundPixels: true,
      },
    };

    gameRef.current = new Phaser.Game(config);

    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [gameState, hasMixingStarted]);

  // Game end logic
  useEffect(() => {
    if (gameState === "playing" && timeLeft <= 0) {
      // Game over - go to result screen
      setGameState("result");

      if (socket) {
        socket.emit("gameScore", {
          zone: "zone_6",
          game: "納豆混ぜゲーム",
          score: score,
        });
      }
    }
  }, [gameState, timeLeft, mixingQuality, socket, score]);

  // Reset game state when leaving result screen
  useEffect(() => {
    if (gameState !== "result") {
      setScore(0);
      setTimeLeft(20);
      setMixingQuality(0);
      setHasMixingStarted(false);
      timerStarted.current = false;
    }
  }, [gameState]);

  const fadeVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Header />
      <div className="w-full h-16 flex items-center justify-between px-8">
        <BackBtn />
        {/* <MuteBtn /> */}
      </div>
      {/* Game UI - visible during playing state */}
      {gameState === "playing" && (
        <div className="w-full h-16 flex items-center justify-between px-8 mt-4">
          <div className="px-4 py-2 bg-theme-purple text-white rounded-full font-semibold text-sm">
            スコア: {score}
          </div>
          <div className="px-4 py-2 bg-theme-purple text-white rounded-full font-semibold text-sm">
            時間: {timeLeft}s
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex flex-col items-center justify-center px-8 w-full flex-1 text-center">
        <AnimatePresence mode="wait">
          {gameState === "description" && (
            <motion.div
              key="description"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center space-y-6"
            >
              <div className="space-y-4 p-6 bg-theme-purple rounded-2xl">
                <h1 className="text-2xl font-bold">description</h1>
                <p className="text-lg text-gray-900 font-bold leading-relaxed">
                  指で円を描いてぐるぐる
                  <br />
                  して納豆を混ぜる
                  <br />
                  <br />
                  混ぜ具合でポイントゲット
                  <br />
                  <br />
                </p>
              </div>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-theme-yellow rounded-full font-semibold"
              >
                始める
              </button>
            </motion.div>
          )}

          {gameState === "result" && (
            <motion.div
              key="result"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center space-y-6"
            >
              <div className="space-y-4 p-6 bg-theme-purple rounded-2xl">
                <h1 className="text-2xl font-bold">Congratulations!</h1>
                <p className="text-lg text-gray-900 font-bold leading-relaxed">
                  {score} points!
                  <br />
                  <br />
                </p>
              </div>
              <button
                onClick={() => setGameState("description")}
                className="px-8 py-3 bg-theme-yellow rounded-full font-semibold"
              >
                もう一度挑戦
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Game overlay */}
      <AnimatePresence mode="wait">
        {gameState === "playing" && (
          <motion.div
            key="playing"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-40"
          >
            {/* Game UI */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 px-4 py-2 bg-theme-purple text-white rounded-full font-semibold text-sm">
              混ぜ具合: {mixingQuality}%
            </div>

            {/* Phaser Game Container */}
            <div ref={gameContainerRef} className="w-full h-full" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
