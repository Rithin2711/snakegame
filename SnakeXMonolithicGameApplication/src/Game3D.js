import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * PUBLIC_INTERFACE
 * Game3D - Main SnakeX 3D game logic and rendering in a Three.js canvas.
 * Manages game objects, input, collisions, procedural environment, and event hooks.
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
  {name: "apple", color: 0xff3b3b, grow: 1,       minLen: 0},      // Always appear
  {name: "egg",   color: 0xfff980, grow: 2,       minLen: 12},     // After length 12
  {name: "mouse", color: 0x909090, grow: 3,       minLen: 20},     // After length 20
  {name: "hum",   color: 0xddddfa, grow: 6,       minLen: 32},     // After length 30: human! (big shape)
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

// Main game scene component
// PUBLIC_INTERFACE
function Game3D({ paused, loadData, onGameOver, onScore, onConsumed, onSnapshot }) {
  const mountRef = useRef(null);
  const state = useRef(null);

  useEffect(() => {
    let running = true, lastTick = performance.now();
    let _animation;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x262a39);
    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 1000);
    camera.position.set(0, 30, CAMERA_DIST);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Light
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(-10, 30, 12);
    scene.add(dirLight);

    // Floor
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x334924 })
    );
    floorMesh.position.set(0, -0.56, 0);
    floorMesh.rotation.x = -Math.PI/2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Obstacles (stones, trees, etc - simple cubes here)
    const obstacles = [];
    const obstacleCount = 18;
    for (let i=0; i<obstacleCount; ++i) {
      const [x,,z] = randPos();
      if (x === 0 && z === 0) continue; // not center
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshStandardMaterial({ color: 0x444454, metalness:0.13 })
      );
      mesh.position.set(x*UNIT, 1, z*UNIT);
      scene.add(mesh);
      obstacles.push({ pos: [x,0,z], mesh });
    }

    // Snake state and body
    let snake = {
      body: [],
      dir: [1,0,0], // forward x (world: x,z only, y always 0)
      len: INIT_SNAKE_LEN,
      alive: true,
      grow: 0,
      mesh: [],
    };
    // Snake Head
    const snakeHeadGeo = new THREE.SphereGeometry(1, 20, 20);
    const snakeHeadMat = new THREE.MeshStandardMaterial({ color: 0x349c3e, metalness:0.38 });
    const snakeHeadMesh = new THREE.Mesh(snakeHeadGeo, snakeHeadMat);
    scene.add(snakeHeadMesh);
    // Segments
    for (let i=0; i<70; ++i) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x1db000, metalness:0.2 });
      const geo = new THREE.CylinderGeometry(0.8,0.9,1.6, 18);
      const seg = new THREE.Mesh(geo, mat);
      seg.visible = false;
      scene.add(seg);
      snake.mesh.push(seg);
    }
    // Starting body
    for (let i=0; i<snake.len; ++i) {
      snake.body.push({ x: -i, y:0, z:0 }); // x decreasing
    }
    // Items (array of {type, mesh, pos})
    let items = [];

    // Useful for the event-driven hooks
    const eventCb = {
      onGameOver, onScore, onConsumed, onSnapshot
    };

    // Score
    let score = snake.len - INIT_SNAKE_LEN;

    // Camera follow mode
    function updateCamera(pos, dir) {
      // Camera lags a bit behind and above, in the opposite of moving dir
      const head = [pos.x, pos.y, pos.z];
      const behind = [
        head[0] - dir[0]*7,
        head[1] + 9,
        head[2] - dir[2]*7
      ];
      camera.position.set(...behind);
      camera.lookAt(pos.x, 0.7, pos.z);
    }

    // 3D Input (WASD/Arrow: rotates local direction)
    let _input = {
      left: false, right: false, up: false, down: false,
      _lastDir: [1,0,0],
    };
    function clearInput() { for (let k in _input) if (typeof _input[k]==="boolean") _input[k] = false; }
    function inputTurn(dir, amount=1) {
      // dir: "left/right/up/down" = rotate dir vector in 3D (X/Z)
      const v = [...snake.dir];
      if (dir === "left") [v[0],v[2]] = [-v[2],v[0]];
      if (dir === "right") [v[0],v[2]] = [v[2],-v[0]];
      if (dir === "up" && v[2] !== 0) { v[2] = 0; v[0] = v[0]<0 ? -1:1; }
      if (dir === "down" && v[0] !== 0) { v[0] = 0; v[2] = v[2]<0 ? -1:1; }
      snake.dir = v;
    }
    function onKeyDown(e) {
      if (e.repeat) return;
      switch(e.code) {
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
      // no-op - movement is "snap" style for classic snake
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Game Logic Loop
    // When paused, freeze tick but maintain rendering for visuals.
    state.current = {
      tick: 0,
      update: () => {},
      snapshot: () => {},
      restore: () => {},
      retrieveWorld: () => ({
        snake: deepClone(snake),
        items: deepClone(items),
        obstacles: deepClone(obstacles.map(o=>o.pos)),
        score, tick: state.current.tick
      }),
    };

    // Saving/Loading support
    function snapshot() {
      const snap = {
        snake: deepClone(snake),
        dir: [...snake.dir],
        len: snake.len,
        items: items.map(x => ({...x, mesh: undefined})), // no ref
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
      // Set up geometry positions
      for (let i=0; i<snake.mesh.length; ++i) {
        snake.mesh[i].visible = i < snake.body.length;
      }
      items = snap.items.map(item => {
        const mat = new THREE.MeshStandardMaterial({ color: item.color }); // item.color always present
        let geo;
        if (item.type === "apple") geo = new THREE.SphereGeometry(1, 18, 18);
        else if (item.type === "egg") geo = new THREE.SphereGeometry(1.15, 14, 18);
        else if (item.type === "mouse") geo = new THREE.BoxGeometry(1.35,0.8,1.35);
        else if (item.type === "hum") geo = new THREE.CylinderGeometry(1.1,1.1,2.1,20);
        else geo = new THREE.SphereGeometry(1, 10,10);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...item.pos.map((v,i) => i===1 ? v+0.8 : v*UNIT));
        scene.add(mesh);
        return {...item, mesh};
      });
      score = snap.score;
      state.current.tick = snap.tick;
    }

    // Spawns a random item the snake can eat
    function spawnItem() {
      // Only allow items that snake is large enough to eat
      const allowed = ITEM_TYPES.filter(it => snake.len >= it.minLen);
      const choice = allowed[getRandomInt(0, allowed.length)];
      let pos;
      retry: while(true) {
        pos = randPos();
        // Avoid snake and other items and obstacles
        for (const b of snake.body) {
          if (cubicDist([b.x,0,b.z], pos) < 2.2) continue retry;
        }
        for (const ob of obstacles) {
          if (cubicDist([ob.pos[0],0,ob.pos[2]], pos) < 2.2) continue retry;
        }
        for (const it of items) {
          if (cubicDist(it.pos, pos) < 2.2) continue retry;
        }
        break;
      }
      const material = new THREE.MeshStandardMaterial({ color: choice.color });
      let geo;
      if (choice.name === "apple") geo = new THREE.SphereGeometry(1, 18, 18);
      else if (choice.name === "egg") geo = new THREE.SphereGeometry(1.15, 14, 18);
      else if (choice.name === "mouse") geo = new THREE.BoxGeometry(1.35,0.8,1.35);
      else if (choice.name === "hum") geo = new THREE.CylinderGeometry(1.1,1.1,2.1,20);
      else geo = new THREE.SphereGeometry(1, 10,10);
      const mesh = new THREE.Mesh(geo, material);
      // height for visual effect
      mesh.position.set(pos[0]*UNIT, 0.8, pos[2]*UNIT);
      scene.add(mesh);
      items.push({
        type: choice.name, grow: choice.grow, pos, color: choice.color, mesh
      });
    }

    function tick() {
      if (!snake.alive) return;
      state.current.tick++;
      // Move snake
      let newHead = {
        x: snake.body[0].x + snake.dir[0],
        y: 0,
        z: snake.body[0].z + snake.dir[2]
      };

      // Bounds
      if (
        Math.abs(newHead.x) > GRID_SIZE/2 ||
        Math.abs(newHead.z) > GRID_SIZE/2
      ) {
        snake.alive = false;
        if (eventCb.onGameOver) eventCb.onGameOver(score);
        return;
      }

      // Collide with self
      for (let i=0; i<snake.body.length; ++i) {
        const b = snake.body[i];
        if (i !== 0 && b.x === newHead.x && b.z === newHead.z) {
          snake.alive = false;
          if (eventCb.onGameOver) eventCb.onGameOver(score);
          return;
        }
      }
      // Collide with obstacle
      for (const ob of obstacles) {
        if (
          Math.round(ob.pos[0]) === Math.round(newHead.x)
          && Math.round(ob.pos[2]) === Math.round(newHead.z)
        ) {
          snake.alive = false;
          if (eventCb.onGameOver) eventCb.onGameOver(score);
          return;
        }
      }
      // Move body
      snake.body = [newHead, ...snake.body];
      if (snake.grow > 0) {
        snake.grow--;
      } else {
        snake.body.pop();
      }
      // Snake eats items
      let consumed = false;
      for (let i=0; i<items.length; ++i) {
        const it = items[i];
        if (
          Math.round(newHead.x) === Math.round(it.pos[0])
          && Math.round(newHead.z) === Math.round(it.pos[2])
        ) {
          // Eat item
          consumed = true;
          if (eventCb.onConsumed) eventCb.onConsumed(it.type);
          snake.grow += it.grow;
          snake.len += it.grow;
          score += it.grow;
          scene.remove(it.mesh);
          items.splice(i,1);
          spawnItem();
          break;
        }
      }
      if (consumed && eventCb.onScore) eventCb.onScore(score);

      // Respawn items if too few (cap)
      if (items.length < 2) spawnItem();

      // Update snapshot for save
      if (eventCb.onSnapshot) eventCb.onSnapshot(snapshot());
    }

    // Render (update objects' visual positions/shapes)
    function render() {
      // Snake head position
      const head = snake.body[0];
      snakeHeadMesh.position.set(head.x*UNIT, 1.2, head.z*UNIT);
      snakeHeadMesh.visible = true;
      // Body segments - update segment positions
      for (let i=0; i<snake.mesh.length; ++i) {
        if (i < snake.body.length-1) {
          const b = snake.body[i+1];
          snake.mesh[i].visible = true;
          snake.mesh[i].position.set(b.x*UNIT, 0.8, b.z*UNIT);
          snake.mesh[i].rotation.x = Math.PI/2;
        } else {
          snake.mesh[i].visible = false;
        }
      }
      // Camera track
      updateCamera(snake.body[0], snake.dir);
    }

    // Start new or load
    const doInit = () => {
      // Remove items from previous runs
      while(items.length > 0) {
        scene.remove(items.pop().mesh);
      }
      // Snake reset
      snake.body = [];
      for (let i=0; i<snake.len; ++i) {
        snake.body.push({ x: -i, y:0, z:0 }); // x decreasing
      }
      snake.alive = true;
      snake.dir = [1,0,0];
      snake.grow = 0;
      score = snake.len - INIT_SNAKE_LEN;
      for (let i=0;i<snake.mesh.length;++i) snake.mesh[i].visible = false;
      // Clear/respawn items
      spawnItem(); spawnItem(); // always at least 2
    };

    if (loadData) {
      restore(loadData);
    } else {
      doInit();
    }

    // Main game loop
    function animate() {
      _animation = requestAnimationFrame(animate);
      if (!paused && running && snake.alive && performance.now()-lastTick > TICK_MS) {
        tick();
        lastTick = performance.now();
      }
      render();
      renderer.render(scene, camera);
    }
    animate();

    // Mount Three.js renderer to DOM
    mountRef.current.appendChild(renderer.domElement);

    // Resize
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
        mountRef.current && mountRef.current.removeChild(renderer.domElement);
      } catch {}
      renderer.dispose && renderer.dispose();
    };
    // eslint-disable-next-line
  }, [paused, loadData]); // reset effect on pause state or loading new game

  // No DOM
  return <div ref={mountRef} className="Game3D-canvas" tabIndex="0" style={{width:"100vw", height:"100vh", outline: "none"}} />;
}

export default Game3D;
