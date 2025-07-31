import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import Game3D from "./Game3D";
import { Howl } from "howler";

const STORAGE_KEY = "SnakeX-save-v1";

const THEMES = {
  light: "light",
  dark: "dark",
};

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState(THEMES.light);
  const [gameState, setGameState] = useState("menu"); // menu, playing, paused, gameover
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("SnakeX-highscore") || 0));
  const [loadData, setLoadData] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Sound assets (basic example)
  const eatSound = useRef(null);
  const gameOverSound = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    eatSound.current = new Howl({ src: ["/eat.mp3"], volume: 0.2 });
    gameOverSound.current = new Howl({ src: ["/gameover.mp3"], volume: 0.5 });
  }, []);

  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme((prev) => (prev === THEMES.light ? THEMES.dark : THEMES.light));

  // PUBLIC_INTERFACE
  const handleGameOver = (finalScore) => {
    setGameState("gameover");
    setScore(finalScore);
    if (gameOverSound.current) gameOverSound.current.play();

    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem("SnakeX-highscore", finalScore);
    }
    // Save game as ended
    localStorage.removeItem(STORAGE_KEY);
  };

  // PUBLIC_INTERFACE
  const handleConsume = (itemType) => {
    if (eatSound.current) eatSound.current.play();
    
    // Add visual feedback for score increase
    const scoreElement = document.querySelector('.score-ui');
    if (scoreElement) {
      scoreElement.style.animation = 'none';
      // Trigger reflow to reset animation
      void scoreElement.offsetHeight;
      scoreElement.style.animation = 'scoreBoost 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  };

  // PUBLIC_INTERFACE
  const handleScore = (s) => {
    setScore(s);
    
    // Add celebration effect for milestone scores
    if (s > 0 && s % 10 === 0) {
      const gameUI = document.querySelector('.game-ui');
      if (gameUI) {
        gameUI.style.animation = 'milestone 0.6s ease-out';
      }
    }
  };

  // PUBLIC_INTERFACE
  const handleSave = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  // PUBLIC_INTERFACE
  const handleLoad = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setLoadData(JSON.parse(saved));
      setGameState("playing");
    }
  };

  // PUBLIC_INTERFACE
  const handleNewGame = () => {
    setGameState("playing");
    setScore(0);
    setLoadData(null);
  };

  // PUBLIC_INTERFACE
  const handlePause = () => setGameState((gs) => (gs === "playing" ? "paused" : "playing"));

  // PUBLIC_INTERFACE
  const handleShowHelp = () => setShowHelp((s) => !s);

  // PUBLIC_INTERFACE
  const handleQuitToMenu = () => setGameState("menu");

  // For accessibility: allow space/enter to start game on menu/game over
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((gameState === "menu" || gameState === "gameover") && (e.code === "Space" || e.code === "Enter")) handleNewGame();
      if (e.code === "KeyH") handleShowHelp();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line
  }, [gameState]);

  return (
    <div className="App" tabIndex="0" role="main">
      <header className="App-header">
        <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        {gameState === "menu" && (
          <div className="menu">
            <h1 className="title">SnakeX: 3D Survival</h1>
            <p className="subtitle">Eat. Evolve. Survive.<br/>A realistic 3D snake experience.</p>
            <button onClick={handleNewGame} className="menu-btn">▶ Play</button>
            <button onClick={handleLoad} className="menu-btn" disabled={!localStorage.getItem(STORAGE_KEY)}>⏎ Continue</button>
            <button onClick={handleShowHelp} className="menu-btn">? Help</button>
            <div className="highscore">High Score: <b>{highScore}</b></div>
            <footer className="credits">By the SnakeX Dev Team</footer>
          </div>
        )}

        {gameState === "gameover" && (
          <div className="gameover-overlay">
            <h2>Game Over</h2>
            <div className="score">Score: {score}</div>
            <div className="highscore">High Score: {highScore}</div>
            <button className="menu-btn" onClick={handleNewGame}>Play Again</button>
            <button className="menu-btn" onClick={handleQuitToMenu}>Quit</button>
          </div>
        )}

        {gameState === "paused" && (
          <div className="paused-overlay">
            <h2>Paused</h2>
            <button onClick={handlePause} className="menu-btn">Resume</button>
            <button onClick={handleQuitToMenu} className="menu-btn">Quit</button>
          </div>
        )}

        {gameState === "playing" && (
          <div className="game-ui">
            <div className="score-ui">Score: {score}</div>
            <div className="controls-ui">
              <button className="ui-btn" onClick={handlePause}>Pause</button>
              <button className="ui-btn" onClick={handleShowHelp}>Help</button>
              <button className="ui-btn" onClick={() => handleSave(window.lastGameSnapshot)}>Save</button>
            </div>
          </div>
        )}

        {showHelp && (
          <div className="help-overlay">
            <h2>How to Play</h2>
            <ul className="help-list">
              <li>Use Arrow Keys / WASD to steer the snake in 3D.</li>
              <li>Eat small objects to grow longer and unlock eating larger things!</li>
              <li>Avoid hitting your own body or obstacles.</li>
              <li>[P] to pause, [H] to toggle this help.</li>
              <li>Your progress can be saved anytime during gameplay.</li>
            </ul>
            <button className="ui-btn" onClick={handleShowHelp}>Close</button>
          </div>
        )}

        {/* 3D Game - always mounted but hidden if not playing/paused to preserve game state if needed */}
        <div className="game-canvas-container" style={{ display: gameState === "playing" || gameState === "paused" ? "block" : "none" }}>
          <Game3D
            paused={gameState === "paused"}
            loadData={loadData}
            onGameOver={handleGameOver}
            onScore={handleScore}
            onConsumed={handleConsume}
            onSnapshot={(snap) => (window.lastGameSnapshot = snap)}
            />
        </div>
      </header>
    </div>
  );
}

export default App;
