import { useRef, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShoppingBag } from "lucide-react";

const STYLES = [
  {
    name: "Japandi",
    floor: "#2D2218",
    wall: "#E8DFD0",
    sofa: "#4A4840",
    rug: "#B8A88A",
    accent: "#C9A96E",
  },
  {
    name: "Modern",
    floor: "#1C1C1C",
    wall: "#EBEBEB",
    sofa: "#CCCCCC",
    rug: "#9090B0",
    accent: "#6B4FBB",
  },
  {
    name: "Industrial",
    floor: "#3A302A",
    wall: "#8A8680",
    sofa: "#7A5A4A",
    rug: "#6B5540",
    accent: "#E8A040",
  },
  {
    name: "Boho",
    floor: "#4A3A28",
    wall: "#EDE0CE",
    sofa: "#C07858",
    rug: "#B07060",
    accent: "#2AAF7A",
  },
];

function CameraRig() {
  const { camera } = useThree();
  const angleRef = useRef(0.8);

  useFrame(() => {
    angleRef.current += 0.003;
    camera.position.x = Math.cos(angleRef.current) * 7;
    camera.position.z = Math.sin(angleRef.current) * 7;
    camera.position.y = 3.2;
    camera.lookAt(0, 0.5, 0);
  });

  return null;
}

function RoomContents({ styleIndex }) {
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({
        color: STYLES[0].floor,
        roughness: 0.75,
        metalness: 0.05,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: STYLES[0].wall,
        roughness: 0.9,
      }),
      sofa: new THREE.MeshStandardMaterial({
        color: STYLES[0].sofa,
        roughness: 0.85,
      }),
      rug: new THREE.MeshStandardMaterial({
        color: STYLES[0].rug,
        roughness: 0.95,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: STYLES[0].accent,
        roughness: 0.25,
        metalness: 0.45,
      }),
      darkWood: new THREE.MeshStandardMaterial({
        color: "#1A1008",
        roughness: 0.6,
        metalness: 0.1,
      }),
      lampPole: new THREE.MeshStandardMaterial({
        color: "#C0A880",
        roughness: 0.3,
        metalness: 0.6,
      }),
      lampShade: new THREE.MeshStandardMaterial({
        color: "#F5E8C8",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
        roughness: 0.4,
      }),
      plant: new THREE.MeshStandardMaterial({
        color: "#2D5A3D",
        roughness: 0.9,
      }),
      pot: new THREE.MeshStandardMaterial({
        color: "#8B6550",
        roughness: 0.8,
      }),
      soil: new THREE.MeshStandardMaterial({
        color: "#2A1A0A",
        roughness: 1.0,
      }),
      window: new THREE.MeshStandardMaterial({
        color: "#FFFDE7",
        emissive: "#FFF3C4",
        emissiveIntensity: 1.8,
        transparent: true,
        opacity: 0.92,
      }),
      windowFrame: new THREE.MeshStandardMaterial({
        color: "#F0EAE0",
        roughness: 0.5,
      }),
    }),
    []
  );

  const targets = useRef({
    floor: new THREE.Color(STYLES[0].floor),
    wall: new THREE.Color(STYLES[0].wall),
    sofa: new THREE.Color(STYLES[0].sofa),
    rug: new THREE.Color(STYLES[0].rug),
    accent: new THREE.Color(STYLES[0].accent),
  });

  useEffect(() => {
    const s = STYLES[styleIndex];
    targets.current.floor.set(s.floor);
    targets.current.wall.set(s.wall);
    targets.current.sofa.set(s.sofa);
    targets.current.rug.set(s.rug);
    targets.current.accent.set(s.accent);
  }, [styleIndex]);

  useFrame(() => {
    const sp = 0.028;
    const t = targets.current;
    mats.floor.color.lerp(t.floor, sp);
    mats.wall.color.lerp(t.wall, sp);
    mats.sofa.color.lerp(t.sofa, sp);
    mats.rug.color.lerp(t.rug, sp);
    mats.accent.color.lerp(t.accent, sp);
  });

  const sofaLegs = [
    [-1.1, 0.0, -0.28],
    [-1.1, 0.0, 0.9],
    [1.1, 0.0, -0.28],
    [1.1, 0.0, 0.9],
  ];
  const tableLegs = [
    [-0.61, 0.19, -0.31],
    [-0.61, 0.19, 0.31],
    [0.61, 0.19, -0.31],
    [0.61, 0.19, 0.31],
  ];

  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.28} color="#FFF5E4" />
      <directionalLight
        position={[-5, 5, 2]}
        intensity={1.1}
        color="#FFF5E4"
      />
      <pointLight
        position={[-2.5, 1.85, -3.8]}
        intensity={2.2}
        color="#C9A96E"
        distance={7}
        decay={2}
      />
      <pointLight
        position={[0, 3.5, 0]}
        intensity={0.4}
        color="#FFFFFF"
        distance={10}
      />

      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[14, 14]} />
        <primitive object={mats.floor} attach="material" />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 3, -6]}>
        <planeGeometry args={[14, 7]} />
        <primitive object={mats.wall} attach="material" />
      </mesh>

      {/* Left wall */}
      <mesh position={[-6, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[14, 7]} />
        <primitive object={mats.wall} attach="material" />
      </mesh>

      {/* Window — emissive glow on left wall */}
      <mesh position={[-5.93, 2.2, -1.6]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 2.4]} />
        <primitive object={mats.window} attach="material" />
      </mesh>
      {/* Window cross frame */}
      <mesh position={[-5.88, 2.2, -1.6]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[2.6, 0.07, 0.05]} />
        <primitive object={mats.windowFrame} attach="material" />
      </mesh>
      <mesh position={[-5.88, 2.2, -1.6]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.07, 2.6, 0.05]} />
        <primitive object={mats.windowFrame} attach="material" />
      </mesh>

      {/* Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -3.2]}>
        <planeGeometry args={[3.6, 2.6]} />
        <primitive object={mats.rug} attach="material" />
      </mesh>

      {/* Sofa */}
      <group position={[-0.3, 0, -4.4]}>
        {/* Seat */}
        <mesh position={[0, 0.22, 0.32]}>
          <boxGeometry args={[2.6, 0.38, 1.1]} />
          <primitive object={mats.sofa} attach="material" />
        </mesh>
        {/* Back rest */}
        <mesh position={[0, 0.74, -0.18]}>
          <boxGeometry args={[2.6, 0.82, 0.22]} />
          <primitive object={mats.sofa} attach="material" />
        </mesh>
        {/* Left arm */}
        <mesh position={[-1.3, 0.44, 0.32]}>
          <boxGeometry args={[0.22, 0.56, 1.1]} />
          <primitive object={mats.sofa} attach="material" />
        </mesh>
        {/* Right arm */}
        <mesh position={[1.3, 0.44, 0.32]}>
          <boxGeometry args={[0.22, 0.56, 1.1]} />
          <primitive object={mats.sofa} attach="material" />
        </mesh>
        {/* Cushions */}
        <mesh position={[-0.65, 0.44, 0.32]}>
          <boxGeometry args={[1.06, 0.13, 1.0]} />
          <primitive object={mats.sofa} attach="material" />
        </mesh>
        <mesh position={[0.65, 0.44, 0.32]}>
          <boxGeometry args={[1.06, 0.13, 1.0]} />
          <primitive object={mats.sofa} attach="material" />
        </mesh>
        {/* Legs */}
        {sofaLegs.map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <cylinderGeometry args={[0.055, 0.055, 0.1, 8]} />
            <primitive object={mats.darkWood} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Coffee table */}
      <group position={[0, 0, -2.1]}>
        {/* Top */}
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[1.4, 0.06, 0.75]} />
          <primitive object={mats.darkWood} attach="material" />
        </mesh>
        {/* Shelf */}
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[1.2, 0.04, 0.6]} />
          <primitive object={mats.darkWood} attach="material" />
        </mesh>
        {/* Legs */}
        {tableLegs.map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <cylinderGeometry args={[0.038, 0.038, 0.38, 8]} />
            <primitive object={mats.darkWood} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Floating accent orb on coffee table */}
      <Float speed={2.5} rotationIntensity={0.8} floatIntensity={0.45}>
        <mesh position={[0.35, 0.56, -2.1]}>
          <sphereGeometry args={[0.1, 20, 20]} />
          <primitive object={mats.accent} attach="material" />
        </mesh>
      </Float>

      {/* Small book stack on coffee table */}
      <mesh position={[-0.32, 0.43, -2.05]}>
        <boxGeometry args={[0.22, 0.05, 0.16]} />
        <meshStandardMaterial color="#1A1A2E" roughness={0.9} />
      </mesh>
      <mesh position={[-0.32, 0.49, -2.05]}>
        <boxGeometry args={[0.2, 0.04, 0.15]} />
        <meshStandardMaterial color="#3A2A18" roughness={0.9} />
      </mesh>

      {/* Floor lamp */}
      <group position={[-2.5, 0, -3.9]}>
        {/* Base */}
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.06, 16]} />
          <primitive object={mats.darkWood} attach="material" />
        </mesh>
        {/* Pole */}
        <mesh position={[0, 0.97, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 1.88, 8]} />
          <primitive object={mats.lampPole} attach="material" />
        </mesh>
        {/* Shade (cone) */}
        <mesh position={[0, 1.93, 0]}>
          <cylinderGeometry args={[0.34, 0.2, 0.42, 16, 1, true]} />
          <primitive object={mats.lampShade} attach="material" />
        </mesh>
        {/* Shade cap */}
        <mesh position={[0, 2.14, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
          <meshStandardMaterial color="#E8D8A8" roughness={0.5} />
        </mesh>
        {/* Inner light glow */}
        <pointLight
          position={[0, 1.85, 0]}
          intensity={0.9}
          color="#FFE0A0"
          distance={3}
          decay={2}
        />
      </group>

      {/* Plant */}
      <group position={[2.5, 0, -4.6]}>
        {/* Pot */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.21, 0.17, 0.38, 12]} />
          <primitive object={mats.pot} attach="material" />
        </mesh>
        {/* Soil */}
        <mesh position={[0, 0.395, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.02, 12]} />
          <primitive object={mats.soil} attach="material" />
        </mesh>
        {/* Leaves cluster */}
        <mesh position={[0, 0.85, 0]}>
          <sphereGeometry args={[0.42, 12, 12]} />
          <primitive object={mats.plant} attach="material" />
        </mesh>
        <mesh position={[-0.22, 0.72, 0.14]}>
          <sphereGeometry args={[0.28, 10, 10]} />
          <primitive object={mats.plant} attach="material" />
        </mesh>
        <mesh position={[0.2, 0.68, -0.12]}>
          <sphereGeometry args={[0.26, 10, 10]} />
          <primitive object={mats.plant} attach="material" />
        </mesh>
      </group>

      {/* Side table next to sofa */}
      <group position={[-2.2, 0, -4.3]}>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
          <primitive object={mats.darkWood} attach="material" />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.36, 8]} />
          <primitive object={mats.darkWood} attach="material" />
        </mesh>
        {/* Vase on side table */}
        <mesh position={[0, 0.52, 0]}>
          <cylinderGeometry args={[0.1, 0.07, 0.18, 12]} />
          <primitive object={mats.accent} attach="material" />
        </mesh>
      </group>

      {/* Wall art on back wall */}
      <group position={[1.6, 2.2, -5.93]}>
        {/* Frame */}
        <mesh>
          <boxGeometry args={[1.6, 1.05, 0.06]} />
          <primitive object={mats.darkWood} attach="material" />
        </mesh>
        {/* Canvas */}
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[1.42, 0.88, 0.02]} />
          <meshStandardMaterial color="#F0E8D8" roughness={0.9} />
        </mesh>
        {/* Art strokes */}
        <mesh position={[-0.28, 0, 0.06]}>
          <boxGeometry args={[0.38, 0.65, 0.01]} />
          <primitive object={mats.accent} attach="material" />
        </mesh>
        <mesh position={[0.2, -0.1, 0.06]}>
          <boxGeometry args={[0.2, 0.4, 0.01]} />
          <meshStandardMaterial color="#2D5A3D" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

export default function RoomHero3D() {
  const [styleIndex, setStyleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStyleIndex((i) => (i + 1) % STYLES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const currentStyle = STYLES[styleIndex];

  return (
    <div className="w-full h-full relative">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [5, 3.2, 5.5], fov: 48 }}
        style={{ background: "transparent" }}
      >
        <CameraRig />
        <RoomContents styleIndex={styleIndex} />
        <Environment preset="apartment" />
      </Canvas>

      {/* Floating overlay cards */}

      {/* Style name card — bottom left */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStyle.name}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="absolute bottom-8 left-6 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
          style={{
            background: "rgba(10,10,12,0.85)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: currentStyle.accent }}
          />
          <span className="text-xs font-semibold text-white tracking-wide">
            Style: {currentStyle.name}
          </span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1"
            style={{
              background: `${currentStyle.accent}22`,
              border: `1px solid ${currentStyle.accent}55`,
              color: currentStyle.accent,
            }}
          >
            AI ✦
          </span>
        </motion.div>
      </AnimatePresence>

      {/* AI badge — top right */}
      <div
        className="absolute top-8 right-6 flex items-center gap-2 px-3.5 py-2 rounded-xl"
        style={{
          background: "rgba(29,158,117,0.12)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(29,158,117,0.3)",
        }}
      >
        <Sparkles className="w-3 h-3 text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-400">
          AI Generated
        </span>
      </div>

      {/* Shop card — bottom right */}
      <div
        className="absolute bottom-8 right-6 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl"
        style={{
          background: "rgba(10,10,12,0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-medium text-white/70">
          4 items found
        </span>
        <span className="text-[10px] font-bold text-amber-400">Shop →</span>
      </div>

      {/* Style progress dots */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-2">
        {STYLES.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setStyleIndex(i)}
            className="w-1.5 rounded-full transition-all duration-300"
            style={{
              height: i === styleIndex ? 20 : 6,
              background:
                i === styleIndex
                  ? currentStyle.accent
                  : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>

      {/* Vignette overlay on left edge to blend with page */}
      <div
        className="absolute inset-y-0 left-0 w-24 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, #0A0A0B, transparent)",
        }}
      />
    </div>
  );
}