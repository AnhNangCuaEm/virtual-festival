'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Header from '@/components/layout/Header';
import MuteBtn from '@/components/ui/MuteBtn';
import Link from 'next/link';

interface Player {
  id: string;
  x: number;
  y: number;
  color: string;
  name: string;
}

interface JoystickPosition {
  x: number;
  y: number;
  distance: number;
  angle: number;
}

export default function ControllerPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');

  // Joystick state
  const [joystickPosition, setJoystickPosition] = useState<JoystickPosition>({ x: 0, y: 0, distance: 0, angle: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  // Initialize socket connection
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
    console.log('Connecting to server:', serverUrl);

    const newSocket = io(serverUrl, {
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('Controller connected to server successfully');
      setIsConnected(true);
      // Tell server this is a player controller
      newSocket.emit('setRole', 'player');
    });

    newSocket.on('disconnect', () => {
      console.log('Controller disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('playerData', (player: Player) => {
      setCurrentPlayer(player);
      setPlayerName(player.name);
      console.log('Received player data:', player);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Send movement to server based on joystick position
  const sendMovement = useCallback((position: JoystickPosition) => {
    if (socket && isConnected && position.distance > 0.1) {
      // Send continuous movement data with constant speed
      const normalizedX = Math.cos(position.angle * Math.PI / 180);
      const normalizedY = Math.sin(position.angle * Math.PI / 180);

      const vectorData = {
        x: normalizedX,
        y: normalizedY,
        angle: position.angle,
        speed: 1 // Constant speed instead of distance-based
      };

      socket.emit('moveVector', vectorData);
    } else if (socket && isConnected && position.distance <= 0.1) {
      // Stop movement when joystick is released
      socket.emit('moveVector', { x: 0, y: 0, angle: 0, speed: 0 });
    }
  }, [socket, isConnected]);

  // Continuous movement while joystick is held
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isDragging && joystickPosition.distance > 0.1) {
      // Send movement every 16ms (~60fps) while joystick is held
      intervalId = setInterval(() => {
        sendMovement(joystickPosition);
      }, 16);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isDragging, joystickPosition, sendMovement]);

  // Calculate joystick position
  const calculateJoystickPosition = useCallback((clientX: number, clientY: number): JoystickPosition => {
    if (!joystickRef.current) return { x: 0, y: 0, distance: 0, angle: 0 };

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2 - 20; // Leave some margin

    const limitedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    const normalizedDistance = limitedDistance / maxDistance;

    const limitedX = (deltaX / distance) * limitedDistance;
    const limitedY = (deltaY / distance) * limitedDistance;

    return {
      x: isNaN(limitedX) ? 0 : limitedX,
      y: isNaN(limitedY) ? 0 : limitedY,
      distance: normalizedDistance,
      angle: angle
    };
  }, []);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    const position = calculateJoystickPosition(e.clientX, e.clientY);
    setJoystickPosition(position);
    // Send movement immediately for responsiveness
    sendMovement(position);
  }, [calculateJoystickPosition, sendMovement]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const position = calculateJoystickPosition(e.clientX, e.clientY);
    setJoystickPosition(position);
    // Send movement immediately when position changes
    sendMovement(position);
  }, [isDragging, calculateJoystickPosition, sendMovement]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setJoystickPosition({ x: 0, y: 0, distance: 0, angle: 0 });
    // Send stop command immediately
    if (socket && isConnected) {
      socket.emit('moveVector', { x: 0, y: 0, angle: 0, speed: 0 });
    }
  }, [socket, isConnected]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    const position = calculateJoystickPosition(touch.clientX, touch.clientY);
    setJoystickPosition(position);
    // Send movement immediately for responsiveness
    sendMovement(position);
  }, [calculateJoystickPosition, sendMovement]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    const position = calculateJoystickPosition(touch.clientX, touch.clientY);
    setJoystickPosition(position);
    // Send movement immediately when position changes
    sendMovement(position);
  }, [isDragging, calculateJoystickPosition, sendMovement]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setJoystickPosition({ x: 0, y: 0, distance: 0, angle: 0 });
    // Send stop command immediately
    if (socket && isConnected) {
      socket.emit('moveVector', { x: 0, y: 0, angle: 0, speed: 0 });
    }
  }, [socket, isConnected]);

  // Global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Update player name
  const updatePlayerName = useCallback(() => {
    if (socket && isConnected && playerName.trim() && playerName !== currentPlayer?.name) {
      socket.emit('updateName', playerName.trim());
    }
  }, [socket, isConnected, playerName, currentPlayer]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 backdrop-blur-sm">
      <Header />
      {/* Back and mute button */}
      <div className="w-full h-16 flex items-center justify-between px-8">
        <Link href="/controller">
          <button className="p-2 px-6 bg-gray-200/80 rounded-lg text-black font-semibold">
            Back
          </button>
        </Link>
        <MuteBtn />
      </div>

      {/* Main content */}
      <main className="flex flex-col items-center justify-center w-full flex-1 px-6 text-center">
      {/* Banner space */}
      <div className="banner">
        <h2>Welcome to the Joystick Controller</h2>
        <p>Use the joystick to control your avatar in the virtual festival!</p>
      </div>

        {/* Real Joystick */}
        <div className="controller-container">
          <div className="joystick-wrapper">
            <div
              ref={joystickRef}
              className="joystick-base"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div
                ref={knobRef}
                className="joystick-knob"
                style={{
                  transform: `translate(${joystickPosition.x}px, ${joystickPosition.y}px)`,
                  backgroundColor: isDragging ? '#ff4444' : '#ff6666'
                }}
              >
              </div>
            </div>
          </div>

        </div>
      </main>
      {/* Connection Status */}
      <div className="text-center mb-4">
        {currentPlayer && (
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Your Avatar:</strong></p>
            <div className="player-item">
              <span>{currentPlayer.name}</span>
              <div
                className="player-color"
                style={{ backgroundColor: currentPlayer.color }}
              ></div>
            </div>
            <p><small>Position: ({Math.round(currentPlayer.x)}, {Math.round(currentPlayer.y)})</small></p>
          </div>
        )}
        <div className="status-indicator">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}></div>
          {isConnected ? '🟢 Connected to Festival' : '🔴 Connecting...'}
        </div>
      </div>

      {/* joystick style */}
      <style jsx>{`
        .joystick-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
        }
        
        .joystick-base {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, #f0f0f0 0%, #ddd 70%, #ccc 100%);
          border: 3px solid #999;
          position: relative;
          cursor: pointer;
          box-shadow: 
            inset 0 0 20px rgba(0,0,0,0.1),
            0 4px 8px rgba(0,0,0,0.2);
          touch-action: none;
          user-select: none;
        }
        
        .joystick-knob {
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #ff6666;
          border: 2px solid #cc4444;
          top: 50%;
          left: 50%;
          margin-top: -30px;
          margin-left: -30px;
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: background-color 0.1s ease;
          pointer-events: none;
        }
        
        .joystick-knob:active {
          cursor: grabbing;
        }
        
        .joystick-info {
          text-align: center;
          margin-top: 1rem;
          font-family: monospace;
          background: #f5f5f5;
          padding: 1rem;
          border-radius: 8px;
        }
        
        @media (max-width: 480px) {
          .joystick-base {
            width: 180px;
            height: 180px;
          }
          
          .joystick-knob {
            width: 50px;
            height: 50px;
            margin-top: -25px;
            margin-left: -25px;
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
