import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

// Furniture item component with appear animation
function FurnitureItem({ position, geometry, color, delay = 0, scale = 1 }) {
  const meshRef = useRef();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Smooth appear animation
    const targetScale = visible ? scale : 0.01;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.08
    );

    // Subtle floating effect when visible
    if (visible) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + delay) * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      {geometry}
      <meshStandardMaterial 
        color={color} 
        roughness={0.7} 
        metalness={0.1}
        emissive={color}
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

// Animated lights that change color
function AnimatedLights({ colorIndex }) {
  const colors = [
    "#C9A96E", // Japandi gold
    "#6B4FBB", // Modern purple
    "#E8A040", // Industrial orange
    "#2AAF7A", // Boho green
  ];

  const spotRef = useRef();
  const pointRef = useRef();

  useFrame(() => {
    const targetColor = new THREE.Color(colors[colorIndex]);
    if (spotRef.current) {
      spotRef.current.color.lerp(targetColor, 0.05);
    }
    if (pointRef.current) {
      pointRef.current.color.lerp(targetColor, 0.05);
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <spotLight
        ref={spotRef}
        position={[5, 8, 3]}
        angle={0.6}
        penumbra={0.5}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight
        ref={pointRef}
        position={[-3, 4, -2]}
        intensity={0.8}
        distance={10}
      />
      <pointLight position={[0, 5, 0]} intensity={0.3} color="#ffffff" />
    </>
  );
}

// Main room scene
function RoomScene() {
  const [phase, setPhase] = useState(0); // 0 = empty, 1-4 = filling up
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setPhase((p) => (p + 1) % 5);
    }, 3000);

    const colorInterval = setInterval(() => {
      setColorIndex((c) => (c + 1) % 4);
    }, 4000);

    return () => {
      clearInterval(phaseInterval);
      clearInterval(colorInterval);
    };
  }, []);

  return (
    <>
      <AnimatedLights colorIndex={colorIndex} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#2D2218" roughness={0.9} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 3, -6]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#E8DFD0" roughness={0.95} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-6, 3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#E8DFD0" roughness={0.95} />
      </mesh>

      {/* Right wall */}
      <mesh position={[6, 3, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#E8DFD0" roughness={0.95} />
      </mesh>

      {/* Furniture appears in phases */}
      
      {/* Phase 1: Sofa */}
      {phase >= 1 && (
        <group position={[0, 0, -4]}>
          <FurnitureItem
            position={[0, 0.4, 0]}
            geometry={<boxGeometry args={[2.5, 0.8, 1]} />}
            color="#4A4840"
            delay={0}
          />
          <FurnitureItem
            position={[0, 1, -0.45]}
            geometry={<boxGeometry args={[2.5, 0.6, 0.2]} />}
            color="#4A4840"
            delay={100}
          />
        </group>
      )}

      {/* Phase 2: Coffee Table */}
      {phase >= 2 && (
        <FurnitureItem
          position={[0, 0.35, -1.5]}
          geometry={<boxGeometry args={[1.2, 0.1, 0.7]} />}
          color="#1A1008"
          delay={200}
        />
      )}

      {/* Phase 3: Floor Lamp */}
      {phase >= 3 && (
        <group position={[-3, 0, -3.5]}>
          <FurnitureItem
            position={[0, 1, 0]}
            geometry={<cylinderGeometry args={[0.03, 0.03, 2, 12]} />}
            color="#C0A880"
            delay={300}
            scale={[1, 1, 1]}
          />
          <FurnitureItem
            position={[0, 2.1, 0]}
            geometry={<coneGeometry args={[0.3, 0.4, 16]} />}
            color="#F5E8C8"
            delay={350}
          />
        </group>
      )}

      {/* Phase 4: Plant and Rug */}
      {phase >= 4 && (
        <>
          {/* Rug */}
          <FurnitureItem
            position={[0, 0.01, -2.8]}
            geometry={<planeGeometry args={[3, 2]} />}
            color="#B8A88A"
            delay={400}
            scale={[1, 1, 1]}
          />
          
          {/* Plant */}
          <group position={[2.5, 0, -5]}>
            <FurnitureItem
              position={[0, 0.3, 0]}
              geometry={<cylinderGeometry args={[0.2, 0.15, 0.6, 12]} />}
              color="#8B6550"
              delay={450}
            />
            <FurnitureItem
              position={[0, 0.8, 0]}
              geometry={<sphereGeometry args={[0.4, 16, 16]} />}
              color="#2D5A3D"
              delay={500}
            />
          </group>
        </>
      )}

      {/* Accent pieces - Wall Art */}
      {phase >= 4 && (
        <FurnitureItem
          position={[2, 2.5, -5.9]}
          geometry={<boxGeometry args={[1.2, 0.8, 0.05]} />}
          color="#C9A96E"
          delay={600}
        />
      )}
    </>
  );
}

// Rotating camera
function CameraRig() {
  const controlsRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const radius = 8;
    const x = Math.cos(t * 0.15) * radius;
    const z = Math.sin(t * 0.15) * radius;
    
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 1.5, -2);
    }
    
    state.camera.position.x = x;
    state.camera.position.z = z;
    state.camera.position.y = 4;
    state.camera.lookAt(0, 1.5, -2);
  });

  return <OrbitControls ref={controlsRef} enableZoom={false} enablePan={false} />;
}

export default function Room3DShowcase() {
  return (
    <div className="w-full h-full">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 4, 8]} fov={50} />
        <CameraRig />
        <RoomScene />
        <fog attach="fog" args={["#0A0A0B", 8, 16]} />
      </Canvas>

      {/* Overlay text */}
      <div className="absolute bottom-8 left-8 right-8 text-center pointer-events-none">
        <div className="inline-block px-6 py-3 rounded-2xl backdrop-blur-xl" style={{
          background: "rgba(10,10,12,0.7)",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <p className="text-sm font-semibold text-white">
            Watch your space transform ✨
          </p>
          <p className="text-xs text-white/50 mt-1">
            AI-powered interior design in real-time
          </p>
        </div>
      </div>
    </div>
  );
}