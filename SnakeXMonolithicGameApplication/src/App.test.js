import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Game3D component to avoid WebGL issues in tests
jest.mock('./Game3D', () => {
  return function MockGame3D() {
    return <div data-testid="game3d-mock">Mock 3D Game Component</div>;
  };
});

// Mock Howler audio library
jest.mock('howler', () => ({
  Howl: jest.fn().mockImplementation(() => ({
    play: jest.fn(),
    stop: jest.fn(),
    volume: jest.fn(),
  })),
}));

test('renders SnakeX game title', () => {
  render(<App />);
  const titleElement = screen.getByText(/SnakeX: 3D Survival/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders play button', () => {
  render(<App />);
  const playButton = screen.getByText(/▶ Play/i);
  expect(playButton).toBeInTheDocument();
});

test('renders theme toggle button', () => {
  render(<App />);
  const themeToggle = screen.getByRole('button', { name: /Switch to dark mode/i });
  expect(themeToggle).toBeInTheDocument();
});

test('renders subtitle with game description', () => {
  render(<App />);
  const subtitle = screen.getByText(/Eat. Evolve. Survive./i);
  expect(subtitle).toBeInTheDocument();
});

test('renders high score display', () => {
  render(<App />);
  const highScore = screen.getByText(/High Score:/i);
  expect(highScore).toBeInTheDocument();
});
