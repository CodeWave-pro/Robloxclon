import { useEffect, useRef, useState, useCallback } from 'react';
import { RobloxGame } from './game/RobloxGame';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<RobloxGame | null>(null);
  const [selectedBlock, setSelectedBlock] = useState(0);
  const [coins, setCoins] = useState(50);
  const [health, setHealth] = useState(100);
  const [showMenu, setShowMenu] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([
    '🎮 Welcome to Roblox Clone!',
    '💡 Use WASD to move, Space to jump',
    '🖱️ Click to lock camera, then click to place blocks',
    '🔢 Press 1-9 to select block colors',
    '🏃 Hold Shift to run',
    '💰 Collect gold coins scattered around!'
  ]);
  const [showInventory, setShowInventory] = useState(false);
  const [playerName] = useState('Player1');
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!containerRef.current) return;
    
    const game = new RobloxGame(containerRef.current);
    gameRef.current = game;

    game.setOnStateUpdate((state) => {
      if (state.coins !== undefined) setCoins(state.coins);
      if (state.health !== undefined) setHealth(state.health);
    });

    // FPS counter
    const fpsInterval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastFpsTimeRef.current;
      const currentFps = Math.round((frameCountRef.current / elapsed) * 1000);
      setFps(currentFps);
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }, 1000);

    const countFrames = () => {
      frameCountRef.current++;
      requestAnimationFrame(countFrames);
    };
    const frameId = requestAnimationFrame(countFrames);

    return () => {
      game.destroy();
      clearInterval(fpsInterval);
      cancelAnimationFrame(frameId);
    };
  }, []);

  const handleBlockSelect = useCallback((index: number) => {
    setSelectedBlock(index);
    if (gameRef.current) {
      gameRef.current.setSelectedColor(index);
    }
  }, []);

  const blockColors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#e67e22', '#ecf0f1', '#34495e', '#f1c40f'
  ];

  const blockNames = [
    'Red', 'Blue', 'Green', 'Orange', 'Purple',
    'Teal', 'Dark Orange', 'White', 'Dark Gray', 'Yellow'
  ];

  const sendChat = (msg: string) => {
    setChatMessages(prev => [...prev.slice(-20), msg]);
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-black">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Top Bar - Roblox Style */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-gray-900/90 to-transparent flex items-center px-4 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center font-bold text-white text-xs">
            R
          </div>
          <span className="text-white font-bold text-sm tracking-wider">ROBLOX</span>
        </div>

        {/* Player Info */}
        <div className="flex items-center gap-4 ml-6">
          <div className="flex items-center gap-2 bg-black/40 rounded-full px-3 py-1">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {playerName[0]}
            </div>
            <span className="text-white text-sm font-medium">{playerName}</span>
          </div>
          
          {/* Coins */}
          <div className="flex items-center gap-1 bg-black/40 rounded-full px-3 py-1">
            <span className="text-yellow-400 text-lg">🪙</span>
            <span className="text-yellow-300 text-sm font-bold">{coins}</span>
          </div>

          {/* Health */}
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-sm">❤️</span>
            <div className="w-24 h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-300"
                style={{ width: `${health}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right side buttons */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-gray-400 text-xs">{fps} FPS</span>
          <button 
            onClick={() => setShowChat(!showChat)}
            className="w-8 h-8 bg-gray-700/80 rounded flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
          >
            💬
          </button>
          <button 
            onClick={() => setShowInventory(!showInventory)}
            className="w-8 h-8 bg-gray-700/80 rounded flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
          >
            🎒
          </button>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 bg-gray-700/80 rounded flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Toolbar - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-fadeIn">
        <div className="flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm rounded-xl p-2 border border-gray-700/50">
          {blockColors.map((color, index) => (
            <button
              key={index}
              onClick={() => handleBlockSelect(index)}
              className={`toolbar-item w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-all ${
                selectedBlock === index 
                  ? 'active ring-2 ring-white scale-110' 
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={blockNames[index]}
            >
              <span className="text-white text-xs font-bold drop-shadow-lg">
                {index + 1}
              </span>
            </button>
          ))}
        </div>
        <div className="text-center mt-1">
          <span className="text-white/70 text-xs bg-black/50 px-2 py-0.5 rounded">
            Selected: {blockNames[selectedBlock]} Block
          </span>
        </div>
      </div>

      {/* Controls Help */}
      <div className="absolute bottom-4 left-4 z-10 animate-slideIn">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 text-white text-xs space-y-1 border border-gray-700/30">
          <p className="font-bold text-sm mb-2">🎮 Controls</p>
          <p><kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">W A S D</kbd> Move</p>
          <p><kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">Space</kbd> Jump</p>
          <p><kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">Shift</kbd> Run</p>
          <p><kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">Click</kbd> Lock Camera / Place</p>
          <p><kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">RMB</kbd> Remove Block</p>
          <p><kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">Scroll</kbd> Zoom</p>
          <p><kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">1-9</kbd> Select Block</p>
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="absolute bottom-20 left-4 z-20 animate-fadeIn">
          <div className="w-80 bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="p-3 border-b border-gray-700/50 flex items-center justify-between">
              <span className="text-white font-bold text-sm">💬 Chat</span>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 h-48 overflow-y-auto space-y-1">
              {chatMessages.map((msg, i) => (
                <p key={i} className="text-gray-300 text-xs">{msg}</p>
              ))}
            </div>
            <div className="p-2 border-t border-gray-700/50">
              <input
                type="text"
                placeholder="Type a message..."
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    sendChat(`[${playerName}]: ${e.currentTarget.value}`);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Inventory Panel */}
      {showInventory && (
        <div className="absolute top-14 right-4 z-20 animate-fadeIn">
          <div className="w-72 bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="p-3 border-b border-gray-700/50 flex items-center justify-between">
              <span className="text-white font-bold text-sm">🎒 Inventory</span>
              <button onClick={() => setShowInventory(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 grid grid-cols-5 gap-2">
              {blockColors.map((color, index) => (
                <div
                  key={index}
                  className="w-12 h-12 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform border-2 border-transparent hover:border-white/50"
                  style={{ backgroundColor: color }}
                  onClick={() => handleBlockSelect(index)}
                >
                  <span className="text-white text-xs font-bold drop-shadow">{blockNames[index][0]}</span>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-700/50">
              <p className="text-gray-400 text-xs">Blocks placed: {gameRef.current ? '∞' : 0}</p>
              <p className="text-gray-400 text-xs mt-1">Coins collected: {coins}</p>
            </div>
          </div>
        </div>
      )}

      {/* Menu Panel */}
      {showMenu && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900/95 rounded-2xl p-8 w-96 border border-gray-700/50 animate-fadeIn">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-3xl font-bold">R</span>
              </div>
              <h2 className="text-white text-2xl font-bold">Game Menu</h2>
              <p className="text-gray-400 text-sm mt-1">Roblox 3D Clone</p>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => setShowMenu(false)}
                className="roblox-btn w-full text-center"
              >
                Resume Game
              </button>
              <button 
                onClick={() => {
                  setCoins(50);
                  setHealth(100);
                  setShowMenu(false);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
              >
                🔄 Reset Game
              </button>
              <button className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors">
                ⚙️ Settings
              </button>
              <button className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors">
                📊 Leaderboard
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Player:</span>
                <span className="text-white font-medium">{playerName}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Coins:</span>
                <span className="text-yellow-400 font-medium">{coins} 🪙</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crosshair (when pointer is locked) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
        <div className="w-6 h-6 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/50 -translate-y-1/2" />
          <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white/50 -translate-x-1/2" />
        </div>
      </div>

      {/* Mini-map */}
      <div className="absolute top-14 right-4 z-10">
        <div className="w-32 h-32 bg-gray-900/80 rounded-xl border border-gray-700/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-green-900/50" />
          {/* Player dot */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse-slow shadow-lg shadow-blue-500/50" />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white" />
            <div className="absolute top-0 left-1/2 w-px h-full bg-white" />
          </div>
          <div className="absolute bottom-1 left-1 text-white/50 text-[8px]">MAP</div>
        </div>
      </div>
    </div>
  );
}

export default App;
