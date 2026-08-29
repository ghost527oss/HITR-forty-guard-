import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Sparkles, ArrowRight, ShieldCheck, ThermometerSun, Layers } from "lucide-react";

interface StartScreenProps {
  onStart: () => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);

  // 3-second initialization timer animation
  useEffect(() => {
    const startTime = Date.now();
    const duration = 3000; // 3 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        setReady(true);
      }
    }, 30);

    return () => clearInterval(interval);
  }, []);

  // Three.js 3D Canvas initialization
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    // Soft atmospheric background fog
    scene.fog = new THREE.FogExp2(0x0f172a, 0.03);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 3, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Ambient & Point Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const orangePoint = new THREE.PointLight(0xff6b00, 2, 50);
    orangePoint.position.set(5, 5, 5);
    scene.add(orangePoint);

    const bluePoint = new THREE.PointLight(0x00d2ff, 2, 50);
    bluePoint.position.set(-5, -3, -5);
    scene.add(bluePoint);

    // 1. Futuristic Urban Wireframe Grid & Terrain Nodes
    const gridHelper = new THREE.GridHelper(30, 30, 0xff7700, 0x334155);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // 2. Central Microclimate Glowing Globe Mesh
    const sphereGeometry = new THREE.IcosahedronGeometry(2.2, 3);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const globe = new THREE.Mesh(sphereGeometry, sphereMaterial);
    globe.position.y = 0.5;
    scene.add(globe);

    // Inner glowing core
    const coreGeo = new THREE.IcosahedronGeometry(1.5, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.5;
    scene.add(core);

    // 3. Ambient Heat Particle System
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const heatColor1 = new THREE.Color(0xff4500); // Heat orange-red
    const heatColor2 = new THREE.Color(0x38bdf8); // Atmosphere cyan

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const mix = Math.random();
      const col = heatColor1.clone().lerp(heatColor2, mix);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Interactive mouse parallax movement
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Handle Window Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotate central globe & core
      globe.rotation.y = elapsedTime * 0.25;
      globe.rotation.x = Math.sin(elapsedTime * 0.15) * 0.1;
      core.rotation.y = -elapsedTime * 0.4;

      // Pulse particles vertically
      const posAttr = particleGeo.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        let y = posAttr.getY(i);
        y += Math.sin(elapsedTime + i) * 0.005;
        if (y > 10) y = -2;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;

      // Smooth camera motion towards mouse mouseX/mouseY
      camera.position.x += (mouseX * 2.5 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 1.5 + 3 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const handleLaunch = () => {
    setExiting(true);
    setTimeout(() => {
      onStart();
    }, 600); // 600ms exit fade transition
  };

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-slate-950 text-slate-100 transition-opacity duration-700 ease-in-out ${
        exiting ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* 3D Canvas Background */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Modern Gradient Overlays */}
      <div className="absolute inset-0 bg-radial from-transparent via-slate-950/40 to-slate-950/90 pointer-events-none z-10" />

      {/* Content Container */}
      <div className="relative z-20 flex h-full flex-col justify-between p-6 md:p-12">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 rounded-full bg-slate-900/80 backdrop-blur-md px-4 py-2 border border-slate-700/60 shadow-lg">
            <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
              HITR 3D Platform v0.8
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Engine Online
            </span>
          </div>
        </div>

        {/* Center Hero Card */}
        <div className="mx-auto my-auto max-w-xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-orange-500/10 border border-orange-500/30 px-4 py-1.5 text-xs font-bold text-orange-400 backdrop-blur-md shadow-inner">
            <ThermometerSun className="h-4 w-4" />
            Hyperlocal Microclimate Intelligence
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Next-Gen Heat Resilience & 3D Urban Planning
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light">
            Empowering cities and communities with real-time temperature telemetry, 3D spatial cooling simulations, and grounded AI architectural guidance.
          </p>

          {/* 3-Second Loading Progress or Launch Button */}
          <div className="pt-4 flex flex-col items-center justify-center min-h-[90px]">
            {!ready ? (
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-sky-400 animate-spin" />
                    Initializing 3D Spatial Grid…
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/50 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-sky-400 transition-all duration-100 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleLaunch}
                className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-sky-500 p-0.5 font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-orange-500/25"
              >
                <div className="flex items-center gap-3 rounded-[14px] bg-slate-900/90 px-8 py-4 backdrop-blur-md transition-colors group-hover:bg-slate-900/70">
                  <span className="text-base font-bold tracking-wide">Launch Platform</span>
                  <ArrowRight className="h-5 w-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto w-full text-xs">
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-900/60 backdrop-blur-md p-3 border border-slate-800 text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>FortyGuard Live Telemetry</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-900/60 backdrop-blur-md p-3 border border-slate-800 text-slate-300">
            <ThermometerSun className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Passive Cooling & Hydration</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-900/60 backdrop-blur-md p-3 border border-slate-800 text-slate-300">
            <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />
            <span>3D Spatial Building Analysis</span>
          </div>
        </div>
      </div>
    </div>
  );
}
