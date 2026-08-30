import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowRight, ThermometerSun, ShieldCheck, MapPin } from "lucide-react";

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
    const duration = 3000;

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

  // Three.js 3D Canvas initialization - Warm architectural neutral theme
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.025); // Clean light slate fog

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 4, 14);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Soft warm lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xf97316, 1.2);
    sunLight.position.set(10, 20, 10);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(-10, -10, -10);
    scene.add(fillLight);

    // 1. Clean Architectural Grid Ground
    const gridHelper = new THREE.GridHelper(30, 30, 0xe2e8f0, 0xcbd5e1);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // 2. Central Spatial Sphere
    const sphereGeometry = new THREE.IcosahedronGeometry(2.4, 2);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      roughness: 0.3,
    });
    const globe = new THREE.Mesh(sphereGeometry, sphereMaterial);
    globe.position.y = 0.5;
    scene.add(globe);

    // Inner core
    const coreGeo = new THREE.IcosahedronGeometry(1.6, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      wireframe: false,
      transparent: true,
      opacity: 0.15,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.5;
    scene.add(core);

    // 3. Subtle ambient dust/heat particles
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.1,
      color: 0xf97316,
      transparent: true,
      opacity: 0.4,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Interactive mouse movement
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      globe.rotation.y = elapsedTime * 0.15;
      core.rotation.y = -elapsedTime * 0.2;

      camera.position.x += (mouseX * 1.8 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 1.2 + 4 - camera.position.y) * 0.04;
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
    }, 500);
  };

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-slate-50 text-slate-800 transition-opacity duration-500 ease-in-out ${
        exiting ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* 3D Canvas Background */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Content Container */}
      <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-12">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-4 py-1.5 border border-slate-200/80 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <span className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
              HITR Platform
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>FortyGuard Integrated</span>
          </div>
        </div>

        {/* Center Card */}
        <div className="mx-auto my-auto max-w-lg text-center space-y-5 rounded-3xl bg-white/80 backdrop-blur-xl p-8 border border-slate-200/80 shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-200/60 px-3.5 py-1 text-xs font-bold text-orange-600">
            <ThermometerSun className="h-4 w-4" />
            Heat Intelligence & Spatial Resilience
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Microclimate Mapping & Passive Cooling Design
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-light">
            An intuitive platform to analyze hyperlocal urban temperature data, design natural cooling interventions, and plan climate-resilient environments.
          </p>

          {/* Loading Progress or Launch Button */}
          <div className="pt-2 flex flex-col items-center justify-center min-h-[70px]">
            {!ready ? (
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Preparing Workspace…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-100 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleLaunch}
                className="group flex items-center gap-2.5 rounded-2xl bg-slate-900 px-7 py-3.5 text-xs font-bold text-white shadow-lg transition-all hover:bg-orange-600 hover:shadow-orange-500/20 active:scale-95"
              >
                <span>Launch Application</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto w-full text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-white/90 backdrop-blur-md p-3 border border-slate-200/80 text-slate-700 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Hyperlocal Temperature Telemetry</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/90 backdrop-blur-md p-3 border border-slate-200/80 text-slate-700 shadow-sm">
            <ThermometerSun className="h-4 w-4 text-orange-500 shrink-0" />
            <span>Passive Cooling Strategies</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/90 backdrop-blur-md p-3 border border-slate-200/80 text-slate-700 shadow-sm">
            <MapPin className="h-4 w-4 text-sky-600 shrink-0" />
            <span>3D Spatial Heat Analysis</span>
          </div>
        </div>
      </div>
    </div>
  );
}
