import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * PUBLIC_INTERFACE
 * Game3D - Main SnakeX 3D game logic and rendering in a Three.js canvas.
 * Manages game objects, input, collisions, procedural environment, and event hooks.
 * Enhanced with improved visuals, particle effects, and polish.
 * 
 * Props:
 * - paused: whether the game is paused
 * - loadData: optional save data to restore game state
 * - onGameOver(score)
 * - onScore(new_score)
 * - onConsumed()
 * - onSnapshot(game_snapshot)
 */
const GRID_SIZE = 22;
const UNIT = 1.8;
const WORLD_SIZE = GRID_SIZE * UNIT;
const TICK_MS = 65;
const INIT_SNAKE_LEN = 8;
const CAMERA_DIST = 32;

const ITEM_TYPES = [
  {name: "apple", color: 0xff4757, grow: 1, minLen: 0, glow: 0xff6b7a},      // Vibrant red apple
  {name: "egg", color: 0xffeaa7, grow: 2, minLen: 12, glow: 0xfff3c4},      // Golden egg
  {name: "mouse", color: 0x636e72, grow: 3, minLen: 20, glow: 0x74b9ff},    // Gray mouse with blue glow
  {name: "hum", color: 0xfd79a8, grow: 6, minLen: 32, glow: 0xff7675},      // Pink human with red glow
];

function getRandomInt(a, b) {
  return Math.floor(Math.random() * (b - a)) + a;
}

function randPos() {
  const margin = 2;
  return [
    getRandomInt(-GRID_SIZE/2 + margin, GRID_SIZE/2 - margin),
    0,
    getRandomInt(-GRID_SIZE/2 + margin, GRID_SIZE/2 - margin)
  ];
}

function cubicDist(a, b) {
  return Math.sqrt(
    (a[0]-b[0])**2 +
    (a[1]-b[1])**2 +
    (a[2]-b[2])**2
  );
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Particle system for consumption effects
class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  createConsumptionEffect(position, color) {
    const particleCount = 15;
    const particles = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.1, 8, 8);
      const material = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.8
      });
      const particle = new THREE.Mesh(geometry, material);
      
      particle.position.copy(position);
      particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      );
      particle.life = 1.0;
      
      particles.add(particle);
    }
    
    this.scene.add(particles);
    this.particles.push({
      group: particles,
      time: 0,
      duration: 1.5
    });
  }

  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particleGroup = this.particles[i];
      particleGroup.time += deltaTime;
      
      if (particleGroup.time >= particleGroup.duration) {
        this.scene.remove(particleGroup.group);
        this.particles.splice(i, 1);
        continue;
      }
      
      particleGroup.group.children.forEach(particle => {
        particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
        particle.velocity.y -= 9.8 * deltaTime; // gravity
        particle.material.opacity = 1 - (particleGroup.time / particleGroup.duration);
      });
    }
  }
}

// Camera shake effect
class CameraShake {
  constructor() {
    this.intensity = 0;
    this.duration = 0;
    this.time = 0;
  }

  trigger(intensity = 0.5, duration = 0.3) {
    this.intensity = Math.max(this.intensity, intensity);
    this.duration = duration;
    this.time = 0;
  }

  update(camera, originalPosition, deltaTime) {
    if (this.time < this.duration) {
      this.time += deltaTime;
      const progress = this.time / this.duration;
      const currentIntensity = this.intensity * (1 - progress);
      
      const shakeX = (Math.random() - 0.5) * currentIntensity;
      const shakeY = (Math.random() - 0.5) * currentIntensity;
      const shakeZ = (Math.random() - 0.5) * currentIntensity;
      
      camera.position.set(
        originalPosition.x + shakeX,
        originalPosition.y + shakeY,
        originalPosition.z + shakeZ
      );
    }
  }
}

// Main game scene component
// PUBLIC_INTERFACE
function Game3D({ paused, loadData, onGameOver, onScore, onConsumed, onSnapshot }) {
  const mountRef = useRef(null);
  const state = useRef(null);

  useEffect(() => {
    let running = true, lastTick = performance.now();
    let _animation;
    const scene = new THREE.Scene();
    
    // Enhanced vibrant background with gradient
    const gradientTexture = new THREE.DataTexture(
      new Uint8Array([
        // Top colors (sky)
        135, 206, 250, 255, // Light sky blue
        100, 149, 237, 255, // Cornflower blue  
        72, 61, 139, 255,   // Dark slate blue
        25, 25, 112, 255,   // Midnight blue
      ]),
      1, 4, THREE.RGBAFormat
    );
    gradientTexture.needsUpdate = true;
    gradientTexture.magFilter = THREE.LinearFilter;
    gradientTexture.minFilter = THREE.LinearFilter;
    
    scene.background = new THREE.Color(0x4a90e2);
    
    // Enhanced fog for depth
    scene.fog = new THREE.Fog(0x4a90e2, 30, 80);
    
    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 1000);
    camera.position.set(0, 30, CAMERA_DIST);

    // Enhanced Renderer with better settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(-20, 40, 15);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -50;
    mainLight.shadow.camera.right = 50;
    mainLight.shadow.camera.top = 50;
    mainLight.shadow.camera.bottom = -50;
    scene.add(mainLight);
    
    // Additional rim lighting
    const rimLight = new THREE.DirectionalLight(0x74b9ff, 0.6);
    rimLight.position.set(20, 10, -15);
    scene.add(rimLight);
    
    // Point light for dramatic effect
    const pointLight = new THREE.PointLight(0xff6b6b, 0.8, 50);
    pointLight.position.set(0, 15, 0);
    scene.add(pointLight);

    // Enhanced textured floor
    const floorTexture = new THREE.DataTexture(
      new Uint8Array(Array(64 * 64 * 4).fill().map((_, i) => {
        const x = Math.floor(i / 4) % 64;
        const y = Math.floor(i / (4 * 64));
        const checker = ((x >> 3) + (y >> 3)) % 2;
        const base = checker ? 80 : 60;
        const noise = Math.random() * 20;
        return i % 4 === 3 ? 255 : base + noise; // RGB + Alpha
      })),
      64, 64, THREE.RGBAFormat
    );
    floorTexture.needsUpdate = true;
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(8, 8);

    const floorMaterial = new THREE.MeshStandardMaterial({ 
      map: floorTexture,
      color: 0x2d5016,
      roughness: 0.8,
      metalness: 0.1
    });
    
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
      floorMaterial
    );
    floorMesh.position.set(0, -0.56, 0);
    floorMesh.rotation.x = -Math.PI/2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Enhanced obstacles with variety
    const obstacles = [];
    const obstacleCount = 18;
    const obstacleTypes = [
      { geometry: () => new THREE.BoxGeometry(2, 3, 2), color: 0x654321, name: "stone" },
      { geometry: () => new THREE.ConeGeometry(1.2, 4, 8), color: 0x228b22, name: "tree" },
      { geometry: () => new THREE.DodecahedronGeometry(1.5), color: 0x8b4513, name: "crystal" },
    ];

    for (let i = 0; i < obstacleCount; ++i) {
      const [x, , z] = randPos();
      if (x === 0 && z === 0) continue;
      
      const type = obstacleTypes[i % obstacleTypes.length];
      const geometry = type.geometry();
      const material = new THREE.MeshStandardMaterial({ 
        color: type.color,
        metalness: type.name === "crystal" ? 0.7 : 0.1,
        roughness: type.name === "crystal" ? 0.1 : 0.8,
        emissive: type.name === "crystal" ? new THREE.Color(type.color).multiplyScalar(0.1) : 0x000000
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x * UNIT, type.name === "tree" ? 2 : 1.5, z * UNIT);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      // Add slight random rotation
      mesh.rotation.y = Math.random() * Math.PI * 2;
      
      scene.add(mesh);
      obstacles.push({ pos: [x, 0, z], mesh, type: type.name });
    }

    // Initialize particle system and camera shake
    const particleSystem = new ParticleSystem(scene);
    const cameraShake = new CameraShake();

    // Enhanced snake with better materials
    let snake = {
      body: [],
      dir: [1, 0, 0],
      len: INIT_SNAKE_LEN,
      alive: true,
      grow: 0,
      mesh: [],
    };

    // Enhanced Snake Head with glow effect
    const snakeHeadGeo = new THREE.SphereGeometry(1.2, 24, 24);
    const snakeHeadMat = new THREE.MeshStandardMaterial({ 
      color: 0x00ff41,
      metalness: 0.3,
      roughness: 0.2,
      emissive: 0x004400,
      emissiveIntensity: 0.2
    });
    const snakeHeadMesh = new THREE.Mesh(snakeHeadGeo, snakeHeadMat);
    snakeHeadMesh.castShadow = true;
    scene.add(snakeHeadMesh);

    // Enhanced segments with gradient coloring
    for (let i = 0; i < 70; ++i) {
      const intensity = 1 - (i / 70) * 0.5; // Fade towards tail
      const mat = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(0x00cc33).multiplyScalar(intensity),
        metalness: 0.2,
        roughness: 0.3,
        emissive: new THREE.Color(0x002200).multiplyScalar(intensity * 0.3)
      });
      const geo = new THREE.CylinderGeometry(0.9, 1.0, 1.8, 20);
      const seg = new THREE.Mesh(geo, mat);
      seg.visible = false;
      seg.castShadow = true;
      scene.add(seg);
      snake.mesh.push(seg);
    }

    // Starting body
    for (let i = 0; i < snake.len; ++i) {
      snake.body.push({ x: -i, y: 0, z: 0 });
    }

    let items = [];
    const eventCb = { onGameOver, onScore, onConsumed, onSnapshot };
    let score = snake.len - INIT_SNAKE_LEN;

    // Enhanced camera with smooth transitions
    let cameraTarget = new THREE.Vector3();
    let cameraPosition = new THREE.Vector3();

    function updateCamera(pos, dir) {
      const head = [pos.x, pos.y, pos.z];
      const targetBehind = [
        head[0] - dir[0] * 8,
        head[1] + 12,
        head[2] - dir[2] * 8
      ];
      
      // Smooth camera interpolation
      cameraTarget.set(pos.x, 1.5, pos.z);
      cameraPosition.set(...targetBehind);
      
      camera.position.lerp(cameraPosition, 0.1);
      camera.lookAt(cameraTarget);
      
      // Update camera shake
      cameraShake.update(camera, cameraPosition, 0.016);
    }

    // Input handling (unchanged)
    let _input = {
      left: false, right: false, up: false, down: false,
      _lastDir: [1, 0, 0],
    };

    function inputTurn(dir) {
      const v = [...snake.dir];
      if (dir === "left") [v[0], v[2]] = [-v[2], v[0]];
      if (dir === "right") [v[0], v[2]] = [v[2], -v[0]];
      if (dir === "up" && v[2] !== 0) { v[2] = 0; v[0] = v[0] < 0 ? -1 : 1; }
      if (dir === "down" && v[0] !== 0) { v[0] = 0; v[2] = v[2] < 0 ? -1 : 1; }
      snake.dir = v;
    }

    function onKeyDown(e) {
      if (e.repeat) return;
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA": inputTurn("left"); break;
        case "ArrowRight":
        case "KeyD": inputTurn("right"); break;
        case "ArrowUp":
        case "KeyW": inputTurn("up"); break;
        case "ArrowDown":
        case "KeyS": inputTurn("down"); break;
        default: return;
      }
      _input._lastDir = [...snake.dir];
    }

    function onKeyUp(e) {
      // no-op
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Game state management (simplified for brevity)
    state.current = {
      tick: 0,
      update: () => {},
      snapshot: () => {},
      restore: () => {},
      retrieveWorld: () => ({
        snake: deepClone(snake),
        items: deepClone(items),
        obstacles: deepClone(obstacles.map(o => o.pos)),
        score, tick: state.current.tick
      }),
    };

    function snapshot() {
      const snap = {
        snake: deepClone(snake),
        dir: [...snake.dir],
        len: snake.len,
        items: items.map(x => ({ ...x, mesh: undefined })),
        score,
        tick: state.current.tick,
      };
      if (eventCb.onSnapshot) eventCb.onSnapshot(snap);
      return snap;
    }

    function restore(snap) {
      snake = deepClone(snap.snake);
      snake.dir = [...snap.dir];
      snake.len = snap.len;
      
      for (let i = 0; i < snake.mesh.length; ++i) {
        snake.mesh[i].visible = i < snake.body.length;
      }
      
      items = snap.items.map(item => {
        const type = ITEM_TYPES.find(t => t.name === item.type);
        const material = new THREE.MeshStandardMaterial({ 
          color: item.color,
          metalness: 0.3,
          roughness: 0.2,
          emissive: type.glow,
          emissiveIntensity: 0.1
        });
        
        let geo;
        if (item.type === "apple") geo = new THREE.SphereGeometry(1, 20, 20);
        else if (item.type === "egg") geo = new THREE.SphereGeometry(1.2, 16, 20);
        else if (item.type === "mouse") geo = new THREE.BoxGeometry(1.4, 0.9, 1.4);
        else if (item.type === "hum") geo = new THREE.CylinderGeometry(1.2, 1.2, 2.2, 24);
        else geo = new THREE.SphereGeometry(1, 12, 12);
        
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(...item.pos.map((v, i) => i === 1 ? v + 1.0 : v * UNIT));
        mesh.castShadow = true;
        
        // Add floating animation
        mesh.userData = { 
          originalY: mesh.position.y,
          time: Math.random() * Math.PI * 2,
          type: item.type
        };
        
        scene.add(mesh);
        return { ...item, mesh };
      });
      
      score = snap.score;
      state.current.tick = snap.tick;
    }

    // Enhanced item spawning with glow effects
    function spawnItem() {
      const allowed = ITEM_TYPES.filter(it => snake.len >= it.minLen);
      const choice = allowed[getRandomInt(0, allowed.length)];
      let pos;
      
      retry: while (true) {
        pos = randPos();
        for (const b of snake.body) {
          if (cubicDist([b.x, 0, b.z], pos) < 2.5) continue retry;
        }
        for (const ob of obstacles) {
          if (cubicDist([ob.pos[0], 0, ob.pos[2]], pos) < 2.5) continue retry;
        }
        for (const it of items) {
          if (cubicDist(it.pos, pos) < 2.5) continue retry;
        }
        break;
      }

      const material = new THREE.MeshStandardMaterial({ 
        color: choice.color,
        metalness: 0.3,
        roughness: 0.2,
        emissive: choice.glow,
        emissiveIntensity: 0.15
      });
      
      let geo;
      if (choice.name === "apple") geo = new THREE.SphereGeometry(1, 20, 20);
      else if (choice.name === "egg") geo = new THREE.SphereGeometry(1.2, 16, 20);
      else if (choice.name === "mouse") geo = new THREE.BoxGeometry(1.4, 0.9, 1.4);
      else if (choice.name === "hum") geo = new THREE.CylinderGeometry(1.2, 1.2, 2.2, 24);
      else geo = new THREE.SphereGeometry(1, 12, 12);
      
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(pos[0] * UNIT, 1.0, pos[2] * UNIT);
      mesh.castShadow = true;
      
      // Add floating animation data
      mesh.userData = { 
        originalY: mesh.position.y,
        time: Math.random() * Math.PI * 2,
        type: choice.name
      };
      
      scene.add(mesh);
      items.push({
        type: choice.name, grow: choice.grow, pos, color: choice.color, mesh
      });
    }

    function tick() {
      if (!snake.alive) return;
      state.current.tick++;
      
      let newHead = {
        x: snake.body[0].x + snake.dir[0],
        y: 0,
        z: snake.body[0].z + snake.dir[2]
      };

      // Bounds check
      if (Math.abs(newHead.x) > GRID_SIZE / 2 || Math.abs(newHead.z) > GRID_SIZE / 2) {
        snake.alive = false;
        cameraShake.trigger(1.0, 0.5);
        if (eventCb.onGameOver) eventCb.onGameOver(score);
        return;
      }

      // Self collision
      for (let i = 0; i < snake.body.length; ++i) {
        const b = snake.body[i];
        if (i !== 0 && b.x === newHead.x && b.z === newHead.z) {
          snake.alive = false;
          cameraShake.trigger(1.0, 0.5);
          if (eventCb.onGameOver) eventCb.onGameOver(score);
          return;
        }
      }

      // Obstacle collision
      for (const ob of obstacles) {
        if (Math.round(ob.pos[0]) === Math.round(newHead.x) && 
            Math.round(ob.pos[2]) === Math.round(newHead.z)) {
          snake.alive = false;
          cameraShake.trigger(1.0, 0.5);
          if (eventCb.onGameOver) eventCb.onGameOver(score);
          return;
        }
      }

      // Move snake
      snake.body = [newHead, ...snake.body];
      if (snake.grow > 0) {
        snake.grow--;
      } else {
        snake.body.pop();
      }

      // Item consumption with enhanced effects
      let consumed = false;
      for (let i = 0; i < items.length; ++i) {
        const it = items[i];
        if (Math.round(newHead.x) === Math.round(it.pos[0]) && 
            Math.round(newHead.z) === Math.round(it.pos[2])) {
          consumed = true;
          
          // Create particle effect
          particleSystem.createConsumptionEffect(
            new THREE.Vector3(newHead.x * UNIT, 1.5, newHead.z * UNIT),
            it.color
          );
          
          // Camera shake on consumption
          cameraShake.trigger(0.2, 0.1);
          
          if (eventCb.onConsumed) eventCb.onConsumed(it.type);
          snake.grow += it.grow;
          snake.len += it.grow;
          score += it.grow;
          scene.remove(it.mesh);
          items.splice(i, 1);
          spawnItem();
          break;
        }
      }
      
      if (consumed && eventCb.onScore) eventCb.onScore(score);
      if (items.length < 2) spawnItem();
      if (eventCb.onSnapshot) eventCb.onSnapshot(snapshot());
    }

    // Enhanced render with animations
    function render() {
      const time = performance.now() * 0.001;
      
      // Animate items (floating effect)
      items.forEach(item => {
        if (item.mesh && item.mesh.userData) {
          item.mesh.userData.time += 0.02;
          item.mesh.position.y = item.mesh.userData.originalY + 
            Math.sin(item.mesh.userData.time) * 0.2;
          item.mesh.rotation.y += 0.01;
        }
      });

      // Update particle system
      particleSystem.update(0.016);

      // Snake positioning
      const head = snake.body[0];
      if (head) {
        snakeHeadMesh.position.set(head.x * UNIT, 1.4, head.z * UNIT);
        snakeHeadMesh.visible = true;
        
        // Add slight head bob
        snakeHeadMesh.position.y += Math.sin(time * 6) * 0.05;
      }

      // Body segments with wave motion
      for (let i = 0; i < snake.mesh.length; ++i) {
        if (i < snake.body.length - 1) {
          const b = snake.body[i + 1];
          snake.mesh[i].visible = true;
          snake.mesh[i].position.set(b.x * UNIT, 1.0, b.z * UNIT);
          snake.mesh[i].rotation.x = Math.PI / 2;
          
          // Add subtle wave motion to body
          snake.mesh[i].position.y += Math.sin(time * 4 - i * 0.2) * 0.03;
        } else {
          snake.mesh[i].visible = false;
        }
      }

      // Update camera
      if (head) {
        updateCamera(head, snake.dir);
      }
    }

    // Initialize game
    const doInit = () => {
      while (items.length > 0) {
        scene.remove(items.pop().mesh);
      }
      
      snake.body = [];
      for (let i = 0; i < snake.len; ++i) {
        snake.body.push({ x: -i, y: 0, z: 0 });
      }
      snake.alive = true;
      snake.dir = [1, 0, 0];
      snake.grow = 0;
      score = snake.len - INIT_SNAKE_LEN;
      
      for (let i = 0; i < snake.mesh.length; ++i) {
        snake.mesh[i].visible = false;
      }
      
      spawnItem();
      spawnItem();
    };

    if (loadData) {
      restore(loadData);
    } else {
      doInit();
    }

    // Main animation loop
    function animate() {
      _animation = requestAnimationFrame(animate);
      
      if (!paused && running && snake.alive && performance.now() - lastTick > TICK_MS) {
        tick();
        lastTick = performance.now();
      }
      
      render();
      renderer.render(scene, camera);
    }
    animate();

    // Mount to DOM
    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // Resize handler
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);

    // Cleanup
    return () => {
      running = false;
      cancelAnimationFrame(_animation);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      try {
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement);
        }
      } catch (e) {
        console.warn("Cleanup warning:", e);
      }
      renderer.dispose();
    };
  }, [paused, loadData]);

  return (
    <div 
      ref={mountRef} 
      className="Game3D-canvas" 
      tabIndex="0" 
      style={{ width: "100vw", height: "100vh", outline: "none" }} 
    />
  );
}

export default Game3D;
