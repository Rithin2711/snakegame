# Lightweight React Template for KAVIA

This project provides a minimal React template with a clean, modern UI and minimal dependencies.

## Features

- **Lightweight**: No heavy UI frameworks - uses only vanilla CSS and React
- **Modern UI**: Clean, responsive design with KAVIA brand styling
- **Fast**: Minimal dependencies for quick loading times
- **Simple**: Easy to understand and modify

## Getting Started

In the project directory, you can run:

### `npm start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

## Customization

### Colors

The main brand colors are defined as CSS variables in `src/App.css`:

```css
:root {
  --kavia-orange: #E87A41;
  --kavia-dark: #1A1A1A;
  --text-color: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --border-color: rgba(255, 255, 255, 0.1);
}
```

### Components

This template uses pure HTML/CSS components instead of a UI framework. You can find component styles in `src/App.css`. 

Common components include:
- Buttons (`.btn`, `.btn-large`)
- Container (`.container`)
- Navigation (`.navbar`)
- Typography (`.title`, `.subtitle`, `.description`)

## Learn More

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

---

# SnakeX 3D Snake Survival Game (Monolithic Frontend)

## 🎮 Enhanced Visual Features
- **Vibrant 3D Environment**: Dynamic gradient backgrounds with animated particles
- **Advanced Materials**: Realistic lighting, shadows, and metallic/emissive effects
- **Particle Effects**: Consumption effects with colorful particle bursts
- **Camera Effects**: Smooth following camera with subtle shake on impacts
- **Enhanced Snake**: Gradient coloring, glow effects, and smooth animations
- **Improved Items**: Floating animations, glow effects, and varied geometries
- **Diverse Obstacles**: Multiple obstacle types (stones, trees, crystals) with unique materials
- **Polished UI**: Modern design with gradients, blur effects, and smooth transitions
- **Enhanced Typography**: Google Fonts integration with glowing text effects
- **Score Effects**: Animated score updates and milestone celebrations

## 🔊 IMPORTANT - Audio Assets
The `public/eat.mp3` and `public/gameover.mp3` files are dummy placeholders and must be replaced with properly licensed and credited sound effects before public deployment.

## 🚀 How To Deploy
- Ensure Three.js and Howler audio library are installed via npm.
- Replace placeholder audio files under `public/` with actual MP3 files.
- Preview at `http://localhost:3000`.

## 🎨 Visual Enhancements
- **Advanced Lighting**: Multiple light sources including directional, ambient, point, and rim lighting
- **Material Quality**: PBR materials with metalness, roughness, and emissive properties  
- **Shadow Mapping**: Real-time shadows for enhanced depth and realism
- **Post-Processing**: Tone mapping and enhanced color grading
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Theme System**: Light and dark themes with smooth transitions

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
