import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

function AnimatedCamera() {
  const cameraRef = useRef();
  
  useFrame(({ clock }) => {
    if (!cameraRef.current) return;
    
    const t = clock.getElapsedTime() * 0.15;
    
    // Smooth circular camera movement
    cameraRef.current.position.x = Math.sin(t) * 8;
    cameraRef.current.position.z = Math.cos(t) * 8;
    cameraRef.current.position.y = 2.5 + Math.sin(t * 0.5) * 0.5;
    
    // Always look at room center
    cameraRef.current.lookAt(0, 1.5, 0);
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={60} />;
}

function Room() {
  const [currentStyle, setCurrentStyle] = useState(0);
  
  const styles = [
    { 
      name: "Japandi",
      floor: "#E8DFD0",
      wall: "#F5F1E8", 
      accent: "#C9A96E",
      furniture: "#4A4840"
    },
    { 
      name: "Modern",
      floor: "#2C2C2C",
      wall: "#1A1A1A",
      accent: "#6B4FBB",
      furniture: "#3D3D3D"
    },
    { 
      name: "Industrial",
      floor: "#5A4A3A",
      wall: "#3A2A1A",
      accent: "#E8A040",
      furniture: "#6A5A4A"
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStyle((s) => (s + 1) % styles.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const style = styles[currentStyle];

  return (
    <group>
      {/* Lighting setup */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} color="#FFF8E7" />
      <pointLight position={[-3, 3, -3]} intensity={0.6} color={style.accent} />
      <pointLight position={[3, 2, 3]} intensity={0.4} color="#FFE4B5" />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[15, 15]} />
        <meshStandardMaterial color={style.floor} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 4, -7]}>
        <planeGeometry args={[15, 8]} />
        <meshStandardMaterial color={style.wall} roughness={0.9} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-7, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[15, 8]} />
        <meshStandardMaterial color={style.wall} roughness={0.9} />
      </mesh>

      {/* Right wall */}
      <mesh position={[7, 4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[15, 8]} />
        <meshStandardMaterial color={style.wall} roughness={0.9} />
      </mesh>

      {/* Sofa */}
      <group position={[0, 0.5, -4]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[3.5, 1, 1.2]} />
          <meshStandardMaterial color={style.furniture} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.2, -0.4]}>
          <boxGeometry args={[3.5, 0.6, 0.4]} />
          <meshStandardMaterial color={style.furniture} roughness={0.7} />
        </mesh>
        <mesh position={[-1.5, 0.8, 0]}>
          <boxGeometry args={[0.4, 1, 1.2]} />
          <meshStandardMaterial color={style.furniture} roughness={0.7} />
        </mesh>
        <mesh position={[1.5, 0.8, 0]}>
          <boxGeometry args={[0.4, 1, 1.2]} />
          <meshStandardMaterial color={style.furniture} roughness={0.7} />
        </mesh>
      </group>

      {/* Coffee Table */}
      <group position={[0, 0.3, -1.5]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.8, 0.1, 0.9]} />
          <meshStandardMaterial color="#8B7355" roughness={0.3} metalness={0.2} />
        </mesh>
        <mesh position={[-0.7, -0.25, -0.35]}>
          <cylinderGeometry args={[0.08, 0.08, 0.4]} />
          <meshStandardMaterial color="#5A4A3A" roughness={0.4} />
        </mesh>
        <mesh position={[0.7, -0.25, -0.35]}>
          <cylinderGeometry args={[0.08, 0.08, 0.4]} />
          <meshStandardMaterial color="#5A4A3A" roughness={0.4} />
        </mesh>
        <mesh position={[-0.7, -0.25, 0.35]}>
          <cylinderGeometry args={[0.08, 0.08, 0.4]} />
          <meshStandardMaterial color="#5A4A3A" roughness={0.4} />
        </mesh>
        <mesh position={[0.7, -0.25, 0.35]}>
          <cylinderGeometry args={[0.08, 0.08, 0.4]} />
          <meshStandardMaterial color="#5A4A3A" roughness={0.4} />
        </mesh>
      </group>

      {/* Floor Lamp */}
      <group position={[-4, 0, -3]}>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1.6]} />
          <meshStandardMaterial color="#2A2A2A" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, 1.7, 0]}>
          <cylinderGeometry args={[0.4, 0.3, 0.5, 32]} />
          <meshStandardMaterial color={style.accent} roughness={0.4} emissive={style.accent} emissiveIntensity={0.3} />
        </mesh>
        <pointLight position={[0, 1.7, 0]} intensity={0.8} distance={4} color={style.accent} />
      </group>

      {/* Plant */}
      <group position={[4, 0, -2.5]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.35, 0.4, 0.6, 32]} />
          <meshStandardMaterial color="#8B7355" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#2D5A3D" roughness={0.8} />
        </mesh>
        <mesh position={[-0.2, 1.1, 0.1]}>
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshStandardMaterial color="#3D6A4D" roughness={0.8} />
        </mesh>
        <mesh position={[0.2, 1, -0.1]}>
          <sphereGeometry args={[0.25, 12, 12]} />
          <meshStandardMaterial color="#2D5A3D" roughness={0.8} />
        </mesh>
      </group>

      {/* Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -2]}>
        <planeGeometry args={[4.5, 3]} />
        <meshStandardMaterial color="#B8A88A" roughness={0.9} />
      </mesh>

      {/* Wall Art */}
      <group position={[0, 3.5, -6.95]}>
        <mesh>
          <planeGeometry args={[2, 1.5]} />
          <meshStandardMaterial color={style.accent} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[1.6, 1.1]} />
          <meshStandardMaterial color="#F5F1E8" roughness={0.4} />
        </mesh>
      </group>

      {/* Side Table */}
      <group position={[3.5, 0, -5]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
          <meshStandardMaterial color="#6A5A4A" roughness={0.4} metalness={0.1} />
        </mesh>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.15, 0.12, 0.3, 32]} />
          <meshStandardMaterial color="#E8DFD0" roughness={0.2} />
        </mesh>
        <pointLight position={[0, 1.3, 0]} intensity={0.5} distance={2} color="#FFE4B5" />
      </group>

      {/* Armchair */}
      <group position={[-3, 0.4, 0]} rotation={[0, Math.PI / 4, 0]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[1.2, 0.8, 1.2]} />
          <meshStandardMaterial color={style.furniture} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.9, -0.4]}>
          <boxGeometry args={[1.2, 0.6, 0.3]} />
          <meshStandardMaterial color={style.furniture} roughness={0.7} />
        </mesh>
        <mesh position={[-0.5, 0.6, 0]}>
          <boxGeometry args={[0.2, 0.5, 1]} />
          <meshStandardMaterial color={style.furniture} roughness={0.7} />
        </mesh>
        <mesh position={[0.5, 0.6, 0]}>
          <boxGeometry args={[0.2, 0.5, 1]} />
          <meshStandardMaterial color={style.furniture} roughness={0.7} />
        </mesh>
      </group>

      {/* Bookshelf */}
      <group position={[-6.8, 0, 2]}>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.3, 3, 2]} />
          <meshStandardMaterial color="#4A3A2A" roughness={0.6} />
        </mesh>
        {[0.5, 1.2, 1.9, 2.6].map((y, i) => (
          <mesh key={i} position={[0.05, y, 0]}>
            <boxGeometry args={[0.15, 0.05, 1.9]} />
            <meshStandardMaterial color="#3A2A1A" roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function Room3DShowcase() {
  return (
    <div className="w-full h-full" style={{ background: '#0A0A0B' }}>
      <Canvas>
        <AnimatedCamera />
        <Room />
      </Canvas>
    </div>
  );
}