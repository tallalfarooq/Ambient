import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function Room() {
  const groupRef = useRef();

  return (
    <group ref={groupRef}>
      {/* Ambient light */}
      <ambientLight intensity={0.2} />
      
      {/* Main spotlight from above-right */}
      <spotLight
        position={[5, 8, 5]}
        angle={0.6}
        penumbra={0.5}
        intensity={1.2}
        castShadow
        color="#C9A96E"
      />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1A1816" roughness={0.8} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 0, -5]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#1F1D1A" roughness={0.9} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-5, 0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#1F1D1A" roughness={0.9} />
      </mesh>

      {/* Right wall */}
      <mesh position={[5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#1F1D1A" roughness={0.9} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#141210" roughness={0.95} />
      </mesh>
    </group>
  );
}

export default function RoomScene() {
  return (
    <div className="w-full h-screen">
      <Canvas
        shadows
        camera={{ position: [0, 2, 8], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Room />
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={15}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}