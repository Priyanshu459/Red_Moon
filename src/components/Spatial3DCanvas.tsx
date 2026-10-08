import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { NvidiaProfile } from './NvidiaStudioModal';

interface Spatial3DCanvasProps {
  isPlaying: boolean;
  onMoonInteract?: () => void;
  profile?: NvidiaProfile;
  onGpuDetected?: (renderer: string) => void;
}

// Procedural Canvas Texture Generator for realistic Red Moon craters & maria (scales with NVIDIA Profile)
function generateLunarTexture(profile: NvidiaProfile = 'turing'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const isHighRes = profile === 'extreme' || profile === 'turing';
  const width = isHighRes ? 2048 : (profile === 'smooth' ? 1024 : 512);
  const height = isHighRes ? 1024 : (profile === 'smooth' ? 512 : 256);
  const scale = width / 1024;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Base dark crimson & obsidian planetary gradient
  const baseGrad = ctx.createLinearGradient(0, 0, width, height);
  baseGrad.addColorStop(0, '#150305');
  baseGrad.addColorStop(0.25, '#300609');
  baseGrad.addColorStop(0.55, '#520b11');
  baseGrad.addColorStop(0.8, '#7f121a');
  baseGrad.addColorStop(1, '#a81822');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Lunar Maria (vast ancient basaltic dark plains)
  const mariaBlobs = [
    { x: 260 * scale, y: 180 * scale, rx: 110 * scale, ry: 75 * scale, rot: 0.2 },
    { x: 420 * scale, y: 220 * scale, rx: 150 * scale, ry: 100 * scale, rot: -0.3 },
    { x: 340 * scale, y: 310 * scale, rx: 80 * scale, ry: 60 * scale, rot: 0.5 },
    { x: 680 * scale, y: 240 * scale, rx: 140 * scale, ry: 90 * scale, rot: 0.1 },
    { x: 790 * scale, y: 190 * scale, rx: 90 * scale, ry: 70 * scale, rot: -0.4 },
    { x: 550 * scale, y: 360 * scale, rx: 120 * scale, ry: 70 * scale, rot: 0.3 },
  ];

  ctx.filter = `blur(${Math.round(16 * scale)}px)`;
  mariaBlobs.forEach(({ x, y, rx, ry, rot }) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const grad = ctx.createRadialGradient(0, 0, 10 * scale, 0, 0, rx);
    grad.addColorStop(0, 'rgba(12, 1, 3, 0.88)');
    grad.addColorStop(0.6, 'rgba(32, 4, 7, 0.6)');
    grad.addColorStop(1, 'rgba(32, 4, 7, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.filter = 'none';

  // 3. High-density crater procedural distribution scaled by GPU Profile
  const craterCount = profile === 'extreme' ? 440 : (profile === 'turing' ? 350 : (profile === 'smooth' ? 200 : 90));
  for (let i = 0; i < craterCount; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = (Math.random() * Math.random() * 18 + 2) * scale;

    ctx.fillStyle = 'rgba(10, 1, 2, 0.75)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(254, 202, 202, ${Math.random() * 0.4 + 0.15})`;
    ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.85, Math.PI * 1.85);
    ctx.stroke();

    if (r > 12 * scale && Math.random() > 0.5) {
      ctx.strokeStyle = 'rgba(255, 228, 230, 0.12)';
      ctx.lineWidth = 1;
      const rayCount = 8;
      for (let j = 0; j < rayCount; j++) {
        const angle = (j / rayCount) * Math.PI * 2 + Math.random() * 0.3;
        const length = r * (3 + Math.random() * 4);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
        ctx.stroke();
      }
    }
  }

  // 4. Subtle micro-grain noise across the surface
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let p = 0; p < data.length; p += 4) {
    const noise = (Math.random() - 0.5) * 14;
    data[p] = Math.min(255, Math.max(0, data[p] + noise * 1.2));
    data[p + 1] = Math.min(255, Math.max(0, data[p + 1] + noise * 0.35));
    data[p + 2] = Math.min(255, Math.max(0, data[p + 2] + noise * 0.35));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Procedural Soft Glowing Stardust Particle Texture
function generateParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.2, 'rgba(255, 225, 225, 0.85)');
  grad.addColorStop(0.5, 'rgba(244, 63, 94, 0.35)');
  grad.addColorStop(0.85, 'rgba(159, 18, 57, 0.08)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return !!(
    target.closest('button') ||
    target.closest('a') ||
    target.closest('input') ||
    target.closest('select') ||
    target.closest('textarea') ||
    target.closest('.netflix-card') ||
    target.closest('.audio-dock') ||
    target.closest('.modal-backdrop') ||
    target.closest('.brand-logo-bounce')
  );
}

export const Spatial3DCanvas: React.FC<Spatial3DCanvasProps> = ({
  isPlaying,
  onMoonInteract,
  profile = 'turing',
  onGpuDetected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06070a, 0.012);

    const camera = new THREE.PerspectiveCamera(
      46,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 24);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    const maxDpr = profile === 'extreme' ? 2.5 : (profile === 'turing' ? 2.0 : 1.5);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Detect active WebGL Renderer and notify parent
    try {
      const gl = renderer.getContext();
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const unmasked = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (unmasked) onGpuDetected?.(unmasked);
      }
    } catch {
      // ignore
    }

    // 2. Procedural Red Moon Mesh (Tuned to NVIDIA Profile)
    const moonTexture = generateLunarTexture(profile);
    const particleTexture = generateParticleTexture();

    const moonRadius = 6.6;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 64, 64);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTexture,
      bumpMap: moonTexture,
      bumpScale: 0.16,
      roughness: 0.88,
      metalness: 0.08,
      color: 0xffdada,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(11.5, 3.8, -12.0);
    moonMesh.rotation.y = Math.PI * 0.45;
    scene.add(moonMesh);

    // 3. Volumetric Eclipse Corona Atmosphere (Fresnel Halo)
    const coronaGeo = new THREE.SphereGeometry(moonRadius * 1.09, 48, 48);
    const coronaMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform float uTime;
        uniform float uPulse;
        void main() {
          float viewDot = dot(vNormal, vec3(0.0, 0.0, 1.0));
          float intensity = pow(0.72 - viewDot, 2.7);
          float shimmer = 1.0 + sin(uTime * 3.5) * 0.14 * uPulse;
          vec3 rimColor = mix(vec3(0.92, 0.06, 0.14), vec3(1.0, 0.35, 0.24), intensity);
          gl_FragColor = vec4(rimColor, 1.0) * intensity * 2.3 * shimmer;
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uPulse: { value: isPlaying ? 1.8 : 0.6 },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    coronaMesh.position.copy(moonMesh.position);
    scene.add(coronaMesh);

    // 4. Orbital Celestial Accretion Dust Ring
    const ringGeo = new THREE.RingGeometry(moonRadius * 1.35, moonRadius * 1.85, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe11d48,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(moonMesh.position);
    ringMesh.rotation.x = Math.PI * 0.58;
    ringMesh.rotation.y = Math.PI * 0.18;
    scene.add(ringMesh);

    // 5. Coronal Shockwave Ring (Spawns on touch / tap)
    const shockwaveGeo = new THREE.RingGeometry(moonRadius * 0.98, moonRadius * 1.06, 64);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xff3b5c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveMesh.position.copy(moonMesh.position);
    scene.add(shockwaveMesh);

    let shockwaveScale = 1.0;
    let shockwaveOpacity = 0.0;

    // 6. Solar Flare Particle Ejection Burst (Spawns on touch)
    const burstCount = 45;
    const burstGeo = new THREE.BufferGeometry();
    const burstPositions = new Float32Array(burstCount * 3);
    const burstVelocities = new Float32Array(burstCount * 3);
    let burstActive = false;
    let burstLife = 0;

    for (let i = 0; i < burstCount; i++) {
      burstPositions[i * 3] = moonMesh.position.x;
      burstPositions[i * 3 + 1] = moonMesh.position.y;
      burstPositions[i * 3 + 2] = moonMesh.position.z;
    }
    burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));

    const burstMat = new THREE.PointsMaterial({
      size: 4.2,
      map: particleTexture,
      color: 0xff4d6d,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const burstSystem = new THREE.Points(burstGeo, burstMat);
    scene.add(burstSystem);

    const triggerSolarShockwave = (hitPoint?: THREE.Vector3) => {
      // 1. Shockwave Ring
      shockwaveScale = 1.0;
      shockwaveOpacity = 1.0;
      shockwaveMesh.scale.set(1, 1, 1);
      shockwaveMesh.lookAt(camera.position);

      // 2. Solar Flare Particle Burst
      const origin = hitPoint ? hitPoint.clone() : moonMesh.position.clone();
      const posArr = burstGeo.attributes.position.array as Float32Array;

      for (let i = 0; i < burstCount; i++) {
        posArr[i * 3] = origin.x;
        posArr[i * 3 + 1] = origin.y;
        posArr[i * 3 + 2] = origin.z;

        // Radial outward burst
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 0.35 + Math.random() * 0.7;
        burstVelocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        burstVelocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
        burstVelocities[i * 3 + 2] = Math.cos(phi) * speed;
      }
      burstGeo.attributes.position.needsUpdate = true;
      burstActive = true;
      burstLife = 1.0;

      onMoonInteract?.();
    };

    // 7. Deep Cosmic Starfield (Particle budget tuned to NVIDIA GPU Profile)
    const starCount = profile === 'extreme' ? 3000 : (profile === 'turing' ? 2200 : (profile === 'smooth' ? 1200 : 500));
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 160;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 2] = (Math.random() - 0.7) * 90;

      const roll = Math.random();
      if (roll > 0.35) {
        starColors[i * 3] = 0.85 + Math.random() * 0.15;
        starColors[i * 3 + 1] = 0.88 + Math.random() * 0.12;
        starColors[i * 3 + 2] = 0.95;
      } else if (roll > 0.1) {
        starColors[i * 3] = 0.95;
        starColors[i * 3 + 1] = 0.15 + Math.random() * 0.2;
        starColors[i * 3 + 2] = 0.25;
      } else {
        starColors[i * 3] = 0.98;
        starColors[i * 3 + 1] = 0.65;
        starColors[i * 3 + 2] = 0.2;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starSystem = new THREE.Points(starGeo, starMat);
    scene.add(starSystem);

    // 8. Floating Near-Field Cosmic Ember Motes
    const emberCount = profile === 'extreme' || profile === 'turing' ? 140 : 70;
    const emberGeo = new THREE.BufferGeometry();
    const emberPositions = new Float32Array(emberCount * 3);
    const emberVelocities = new Float32Array(emberCount);

    for (let i = 0; i < emberCount; i++) {
      emberPositions[i * 3] = (Math.random() - 0.3) * 40;
      emberPositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      emberVelocities[i] = 0.02 + Math.random() * 0.04;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));

    const emberMat = new THREE.PointsMaterial({
      size: 2.8,
      map: particleTexture,
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const emberSystem = new THREE.Points(emberGeo, emberMat);
    scene.add(emberSystem);

    // 9. Lighting
    const ambientLight = new THREE.AmbientLight(0x28060a, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xff6b72, 3.2);
    keyLight.position.set(-18, 12, 22);
    scene.add(keyLight);

    const moonLight = new THREE.PointLight(0xe11d48, 2.5, 45);
    moonLight.position.copy(moonMesh.position);
    scene.add(moonLight);

    // 10. Interactive Raycaster, Physics Momentum & Touch Handlers
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    let isPointerOverMoon = false;
    let isDraggingMoon = false;
    let previousPointerX = 0;
    let previousPointerY = 0;
    let spinVelocityX = 0;
    let spinVelocityY = 0;
    let targetScale = 1.0;
    let currentScale = 1.0;

    const handlePointerMove = (e: PointerEvent) => {
      targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;

      pointerNdc.x = targetMouseX;
      pointerNdc.y = targetMouseY;

      if (isDraggingMoon) {
        const deltaX = e.clientX - previousPointerX;
        const deltaY = e.clientY - previousPointerY;
        spinVelocityY = deltaX * 0.006;
        spinVelocityX = deltaY * 0.006;
        moonMesh.rotation.y += spinVelocityY;
        moonMesh.rotation.x += spinVelocityX;
        previousPointerX = e.clientX;
        previousPointerY = e.clientY;
        return;
      }

      // Check hover state on Moon
      raycaster.setFromCamera(pointerNdc, camera);
      const intersects = raycaster.intersectObject(moonMesh);

      if (intersects.length > 0 && !isInteractiveElement(e.target)) {
        if (!isPointerOverMoon) {
          isPointerOverMoon = true;
          document.body.style.cursor = 'grab';
          targetScale = 1.09;
        }
      } else {
        if (isPointerOverMoon) {
          isPointerOverMoon = false;
          if (document.body.style.cursor === 'grab') {
            document.body.style.cursor = '';
          }
          targetScale = 1.0;
        }
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (isInteractiveElement(e.target)) return;

      pointerNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const intersects = raycaster.intersectObject(moonMesh);

      if (intersects.length > 0) {
        isDraggingMoon = true;
        previousPointerX = e.clientX;
        previousPointerY = e.clientY;
        document.body.style.cursor = 'grabbing';
        targetScale = 1.15;

        // Boost spin velocity on touch
        spinVelocityY += 0.08;
        spinVelocityX += (Math.random() - 0.5) * 0.04;

        // Trigger Supernova Shockwave and Flare Bursts
        triggerSolarShockwave(intersects[0].point);
      }
    };

    const handlePointerUp = () => {
      if (isDraggingMoon) {
        isDraggingMoon = false;
        targetScale = isPointerOverMoon ? 1.09 : 1.0;
        document.body.style.cursor = isPointerOverMoon ? 'grab' : '';
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    // 11. Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 12. Animation Loop with Inertial Physics
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (document.hidden) return;

      const elapsed = clock.getElapsedTime();
      const speedMultiplier = isPlaying ? 1.8 : 0.8;

      // Base rotation + Inertial Kinetic Spin
      moonMesh.rotation.y += 0.0012 * speedMultiplier + spinVelocityY;
      moonMesh.rotation.x += spinVelocityX;

      // Inertial friction damping
      spinVelocityY *= 0.95;
      spinVelocityX *= 0.95;

      // Scale Lerp (spring on touch/hover)
      currentScale += (targetScale - currentScale) * 0.12;
      moonMesh.scale.set(currentScale, currentScale, currentScale);
      coronaMesh.scale.set(currentScale, currentScale, currentScale);

      // Corona Shimmer & Pulse
      const activePulse = isDraggingMoon ? 4.2 : (isPointerOverMoon ? 3.0 : (isPlaying ? 2.0 : 0.7));
      coronaMat.uniforms.uTime.value = elapsed;
      coronaMat.uniforms.uPulse.value = THREE.MathUtils.lerp(
        coronaMat.uniforms.uPulse.value,
        activePulse,
        0.08
      );

      // Ring Orbit
      ringMesh.rotation.z += 0.0008 * speedMultiplier;

      // Coronal Shockwave Expansion & Dissipation
      if (shockwaveOpacity > 0.01) {
        shockwaveScale += (3.6 - shockwaveScale) * 0.09;
        shockwaveOpacity *= 0.92;
        shockwaveMesh.scale.set(shockwaveScale, shockwaveScale, shockwaveScale);
        shockwaveMat.opacity = shockwaveOpacity * 0.85;
      } else {
        shockwaveMat.opacity = 0;
      }

      // Solar Flare Particle Burst Dynamics
      if (burstActive && burstLife > 0.01) {
        burstLife *= 0.94;
        const bPos = burstGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < burstCount; i++) {
          bPos[i * 3] += burstVelocities[i * 3];
          bPos[i * 3 + 1] += burstVelocities[i * 3 + 1];
          bPos[i * 3 + 2] += burstVelocities[i * 3 + 2];
        }
        burstGeo.attributes.position.needsUpdate = true;
        burstMat.opacity = burstLife * 0.9;
      } else {
        burstActive = false;
        burstMat.opacity = 0;
      }

      // Floating Cosmic Ember Motes
      const emberArr = emberGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < emberCount; i++) {
        emberArr[i * 3 + 1] += emberVelocities[i] * speedMultiplier * 0.3;
        emberArr[i * 3] += Math.sin(elapsed + i) * 0.01;
        if (emberArr[i * 3 + 1] > 20) {
          emberArr[i * 3 + 1] = -20;
        }
      }
      emberGeo.attributes.position.needsUpdate = true;

      // Damped Mouse Parallax Camera Tracking
      currentMouseX += (targetMouseX - currentMouseX) * 0.035;
      currentMouseY += (targetMouseY - currentMouseY) * 0.035;

      camera.position.x = currentMouseX * 3.5;
      camera.position.y = currentMouseY * 2.0;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 13. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('resize', handleResize);

      if (document.body.style.cursor === 'grab' || document.body.style.cursor === 'grabbing') {
        document.body.style.cursor = '';
      }

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      moonGeo.dispose();
      moonMat.dispose();
      moonTexture.dispose();
      particleTexture.dispose();
      coronaGeo.dispose();
      coronaMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      shockwaveGeo.dispose();
      shockwaveMat.dispose();
      burstGeo.dispose();
      burstMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      emberGeo.dispose();
      emberMat.dispose();
      renderer.dispose();
    };
  }, [isPlaying, onMoonInteract, profile]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    />
  );
};
