import React from 'react';

// PUBLIC_INTERFACE
/**
 * Mock Game3D component for testing purposes
 * Avoids WebGL context creation issues in Node.js test environment
 */
const Game3D = ({ paused, loadData, onGameOver, onScore, onConsumed, onSnapshot }) => {
  return (
    <div data-testid="game3d-mock" className="Game3D-canvas">
      Mock 3D Game Component
    </div>
  );
};

export default Game3D;
