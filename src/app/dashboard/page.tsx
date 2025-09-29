'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  socketId: string;
  x: number;
  y: number;
  color: string;
  name: string;
  connectedAt: string;
}

export default function DashboardPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    // Get the current host and construct server URL
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

    const newSocket = io(serverUrl, {
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('Dashboard connected to server');
      setIsConnected(true);
      // Tell server this is a dashboard viewer
      newSocket.emit('setRole', 'viewer');
    });

    newSocket.on('disconnect', () => {
      console.log('Dashboard disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('players', (playersData: Record<string, Player>) => {
      setPlayers(playersData);
      setLastUpdate(new Date().toLocaleTimeString());
    });

    newSocket.on('playerRemoved', (data: { playerId: string, playerName: string }) => {
      console.log(`Player ${data.playerName} removed successfully`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Function to remove a player manually
  const removePlayer = (socketId: string, playerName: string) => {
    if (socket && window.confirm(`Are you sure you want to remove player "${playerName}"?`)) {
      socket.emit('removePlayer', socketId);
    }
  };

  const playerList = Object.entries(players);
  const totalPlayers = playerList.length;

  return (
    <div className="page-container">
      <h1 className="page-title">📊 Festival Dashboard</h1>
      <p className="page-description">
        Real-time statistics and monitoring for the Japonism Festival.
        Track active players, server status, and live activities.
      </p>

      {/* Connection Status */}
      <div className="controller-info" style={{ marginBottom: '2rem' }}>
        <div className="status-indicator">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}></div>
          {isConnected ? '🟢 Connected to Server' : '🔴 Disconnected'}
        </div>
        {lastUpdate && (
          <p style={{ marginTop: '0.5rem', color: '#666' }}>
            Last updated: {lastUpdate}
          </p>
        )}
      </div>

      <div className="dashboard-grid">
        {/* Server Statistics */}
        <div className="dashboard-card">
          <h3>🖥️ Server Status</h3>
          <div>
            <div className="player-item">
              <span>Total Players</span>
              <strong>{totalPlayers}</strong>
            </div>
            <div className="player-item">
              <span>Map Size</span>
              <strong>800 × 600</strong>
            </div>
            <div className="player-item">
              <span>Server Time</span>
              <strong>{new Date().toLocaleTimeString()}</strong>
            </div>
            <div className="player-item">
              <span>Status</span>
              <strong style={{ color: '#10b981' }}>🟢 Online</strong>
            </div>
          </div>
        </div>

        {/* Active Players */}
        <div className="dashboard-card">
          <h3>👥 Active Players ({totalPlayers})</h3>
          {totalPlayers > 0 ? (
            <div className="player-list">
              {playerList.map(([socketId, player]) => (
                <div key={socketId} className="player-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div 
                      className="player-color" 
                      style={{ backgroundColor: player.color }}
                    ></div>
                    <span>{player.name}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>
                    ({Math.round(player.x)}, {Math.round(player.y)})
                  </div>
                  <button 
                    onClick={() => removePlayer(socketId, player.name)}
                    style={{
                      background: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      marginLeft: 'auto'
                    }}
                    title={`Remove ${player.name}`}
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              No players currently online
            </p>
          )}
        </div>

        {/* Festival Activities */}
        <div className="dashboard-card">
          <h3>🎪 Festival Activities</h3>
          <div className="player-list">
            <div className="player-item">
              <span>🗺️ Venue Exploration</span>
              <strong>{totalPlayers} active</strong>
            </div>
            <div className="player-item">
              <span>🎮 Mobile Controllers</span>
              <strong>{totalPlayers} connected</strong>
            </div>
            <div className="player-item">
              <span>📊 Dashboard Views</span>
              <strong>1 active</strong>
            </div>
            <div className="player-item">
              <span>🎎 Total Sessions</span>
              <strong>{totalPlayers}</strong>
            </div>
          </div>
        </div>

        {/* Leaderboard Placeholder */}
        <div className="dashboard-card">
          <h3>🏆 Leaderboard</h3>
          <p style={{ color: '#666', fontStyle: 'italic', marginBottom: '1rem' }}>
            Coming soon! Track player achievements and festival participation.
          </p>
          <div className="player-list">
            {playerList.slice(0, 3).map(([socketId, player], index) => (
              <div key={socketId} className="player-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                  <div 
                    className="player-color" 
                    style={{ backgroundColor: player.color }}
                  ></div>
                  <span>{player.name}</span>
                </div>
                <strong>{100 - index * 10} pts</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Gallery Placeholder */}
        <div className="dashboard-card">
          <h3>📸 Festival Gallery</h3>
          <p style={{ color: '#666', fontStyle: 'italic', marginBottom: '1rem' }}>
            Photo gallery and moments from the festival will appear here.
          </p>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '0.5rem' 
          }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div 
                key={i} 
                style={{
                  aspectRatio: '1',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.5rem'
                }}
              >
                📷
              </div>
            ))}
          </div>
        </div>

        {/* Raw Data (for debugging) */}
        <div className="dashboard-card">
          <h3>🔧 Debug Data</h3>
          <details>
            <summary style={{ cursor: 'pointer', marginBottom: '1rem' }}>
              Show Raw Player Data
            </summary>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '1rem', 
              borderRadius: '6px',
              fontSize: '0.8rem',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {JSON.stringify(players, null, 2)}
            </pre>
          </details>
        </div>
      </div>

      <style jsx>{`
        .connection-status.connected {
          background: #10b981;
        }
        .connection-status.disconnected {
          background: #ef4444;
        }
      `}</style>
    </div>
  );
}
