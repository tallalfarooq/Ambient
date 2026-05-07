import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { Suspense, useRef } from "react";

/**
 * RoomScene3D — the floating 3D room in the Home hero.
 *
 * Built entirely from primitives (boxes, cylinders) — no .gltf files. The
 * vibe we want is "low-poly architectural sketch" rather than "photoreal" —
 * which is good both for performance (fast load on mobile) AND for brand
 * (it tells users we make AI photoreal renders, but we're not pretending the
 * ad itself is one).
 *
 * Composition: a half-cutaway room corner (back wall + side wall + floor)
 * with a bed, nightstand, lamp, and window. The whole scene rotates slowly
 * on a vertical axis. Camera sits 3/4 view, looking slightly down.
 */

// =============================================================================
// Materials — a tight palette so the scene stays cohesive.
// =============================================================================
const MAT = {
  floor: "#1a1a1f",       // deep grey, slightly warm
  wall:  "#23232b",       // a hair lighter than the floor
  wood:  "#9c7a5b",       // wood for bed frame, nightstand
  fabric:"#c8c0b0",       // bedding, lamp shade — warm off-white
  metal: "#1B8FA0",       // brand teal — used sparingly for the lamp arm
  gold:  "#C9963A",       // brand gold — used as accent on the artwork frame
  plant: "#3d6b4f",       // plant leaves
  pot:   "#4a4a52",
  glass: "#5a8aa8",       // window glass — soft sky tint
};

// =============================================================================
// Atomic components — each is a single mesh or group of meshes. Composing
// these into the scene below.
// =============================================================================

function Floor() {
  return (
    <mesh receiveShadow position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[6, 6]} />
      <meshStandardMaterial color={MAT.floor} roughness={0.85} />
    </mesh>
  );
}

function BackWall() {
  return (
    <mesh receiveShadow position={[0, 1.5, -3]}>
      <planeGeometry args={[6, 4]} />
      <meshStandardMaterial color={MAT.wall} roughness={0.95} />
    </mesh>
  );
}

function SideWall() {
  return (
    <mesh receiveShadow position={[-3, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[6, 4]} />
      <meshStandardMaterial color={MAT.wall} roughness={0.95} />
    </mesh>
  );
}

// Window cutout — actually rendered as a glowing rectangle in front of the
// back wall, since cutting holes in a plane is gnarly without CSG.
function Window() {
  return (
    <group position={[1.3, 1.7, -2.95]}>
      {/* Glass panel — emits light to suggest daylight pouring in */}
      <mesh>
        <planeGeometry args={[1.4, 1.8]} />
        <meshStandardMaterial
          color={MAT.glass}
          emissive={MAT.glass}
          emissiveIntensity={0.6}
          roughness={0.1}
        />
      </mesh>
      {/* Frame — four thin boxes around the glass */}
      <mesh position={[0, 0.95, 0.02]}>
        <boxGeometry args={[1.5, 0.08, 0.04]} />
        <meshStandardMaterial color={MAT.wood} />
      </mesh>
      <mesh position={[0, -0.95, 0.02]}>
        <boxGeometry args={[1.5, 0.08, 0.04]} />
        <meshStandardMaterial color={MAT.wood} />
      </mesh>
      <mesh position={[-0.75, 0, 0.02]}>
        <boxGeometry args={[0.08, 1.9, 0.04]} />
        <meshStandardMaterial color={MAT.wood} />
      </mesh>
      <mesh position={[0.75, 0, 0.02]}>
        <boxGeometry args={[0.08, 1.9, 0.04]} />
        <meshStandardMaterial color={MAT.wood} />
      </mesh>
      {/* Cross mullion */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[1.4, 0.04, 0.04]} />
        <meshStandardMaterial color={MAT.wood} />
      </mesh>
    </group>
  );
}

function Bed() {
  return (
    <group position={[-0.6, -0.5, 0.4]}>
      {/* Frame */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[2, 0.3, 2.4]} />
        <meshStandardMaterial color={MAT.wood} roughness={0.7} />
      </mesh>
      {/* Mattress */}
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.9, 0.25, 2.3]} />
        <meshStandardMaterial color={MAT.fabric} roughness={0.9} />
      </mesh>
      {/* Pillows — two side by side */}
      <mesh castShadow position={[-0.45, 0.62, -0.85]}>
        <boxGeometry args={[0.7, 0.15, 0.4]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0.45, 0.62, -0.85]}>
        <boxGeometry args={[0.7, 0.15, 0.4]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.95} />
      </mesh>
      {/* Folded throw at the foot */}
      <mesh castShadow position={[0, 0.6, 0.85]}>
        <boxGeometry args={[1.6, 0.08, 0.4]} />
        <meshStandardMaterial color={MAT.metal} roughness={0.9} />
      </mesh>
      {/* Headboard */}
      <mesh castShadow position={[0, 0.85, -1.25]}>
        <boxGeometry args={[2, 1.3, 0.1]} />
        <meshStandardMaterial color={MAT.wood} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Nightstand() {
  return (
    <group position={[1.2, -0.5, -0.8]}>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[0.6, 0.8, 0.5]} />
        <meshStandardMaterial color={MAT.wood} roughness={0.7} />
      </mesh>
      {/* Drawer pull */}
      <mesh position={[0, 0.4, 0.26]}>
        <boxGeometry args={[0.15, 0.04, 0.02]} />
        <meshStandardMaterial color={MAT.gold} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function TableLamp() {
  return (
    <group position={[1.2, 0.0, -0.8]}>
      {/* Base */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.08, 16]} />
        <meshStandardMaterial color={MAT.metal} metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Stem */}
      <mesh castShadow position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
        <meshStandardMaterial color={MAT.metal} metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Shade */}
      <mesh castShadow position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.22, 16, 1, true]} />
        <meshStandardMaterial
          color={MAT.fabric}
          emissive={MAT.fabric}
          emissiveIntensity={0.3}
          roughness={0.9}
          side={2}
        />
      </mesh>
    </group>
  );
}

function PottedPlant() {
  return (
    <group position={[-2.3, -0.5, -1.8]}>
      {/* Pot */}
      <mesh castShadow position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.22, 0.18, 0.5, 16]} />
        <meshStandardMaterial color={MAT.pot} roughness={0.85} />
      </mesh>
      {/* Plant body — three offset cones for layered foliage */}
      <mesh castShadow position={[0, 0.85, 0]}>
        <coneGeometry args={[0.4, 0.7, 8]} />
        <meshStandardMaterial color={MAT.plant} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.15, 1.15, 0.1]}>
        <coneGeometry args={[0.3, 0.5, 8]} />
        <meshStandardMaterial color={MAT.plant} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[-0.1, 1.4, -0.05]}>
        <coneGeometry args={[0.22, 0.4, 8]} />
        <meshStandardMaterial color={MAT.plant} roughness={0.9} />
      </mesh>
    </group>
  );
}

// Framed art on the back wall — a minimalist black-and-gold composition.
function ArtFrame() {
  return (
    <group position={[-1.2, 1.7, -2.94]}>
      {/* Frame border */}
      <mesh>
        <boxGeometry args={[1.0, 1.4, 0.05]} />
        <meshStandardMaterial color={MAT.gold} metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Canvas inside */}
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.85, 1.25]} />
        <meshStandardMaterial color="#1a1a1f" roughness={0.8} />
      </mesh>
      {/* Abstract gold accent */}
      <mesh position={[0.15, 0.2, 0.04]}>
        <boxGeometry args={[0.3, 0.6, 0.01]} />
        <meshStandardMaterial color={MAT.gold} metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Rug() {
  return (
    <mesh receiveShadow position={[-0.4, -0.49, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3.2, 2.6]} />
      <meshStandardMaterial color="#3a3a44" roughness={0.95} />
    </mesh>
  );
}

// =============================================================================
// Scene composition — auto-rotates slowly. Float adds the gentle bob.
// =============================================================================
function RotatingRoom() {
  const groupRef = useRef();
  // Slow continuous rotation around Y. ~24s per full revolution.
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.075;
    }
  });
  return (
    <group ref={groupRef}>
      <Floor />
      <BackWall />
      <SideWall />
      <Rug />
      <Window />
      <ArtFrame />
      <Bed />
      <Nightstand />
      <TableLamp />
      <PottedPlant />
    </group>
  );
}

// =============================================================================
// Entry — wraps the whole scene in a Canvas with proper lighting + camera.
// Mobile users can disable the WebGL render entirely by passing `disabled`.
// =============================================================================
export default function RoomScene3D({ disabled = false, className = "" }) {
  if (disabled) {
    return (
      <div
        className={["relative w-full aspect-square", className].join(" ")}
        style={{
          background:
            "radial-gradient(ellipse at 30% 30%, rgba(27,143,160,0.15), transparent 70%)",
        }}
      />
    );
  }

  return (
    <div className={["relative w-full aspect-square", className].join(" ")}>
      <Canvas
        shadows
        dpr={[1, 1.5]}                     // cap pixel ratio — phones don't need 3x
        camera={{ position: [4.5, 3.2, 5.5], fov: 32 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        {/* Lighting — keyed off the window position so it feels like daylight. */}
        <ambientLight intensity={0.3} color="#b8c5d6" />
        <directionalLight
          position={[5, 6, 4]}
          intensity={1.4}
          color="#fff5e6"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={20}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        {/* Soft fill from the opposite side */}
        <pointLight position={[-3, 2, 3]} intensity={0.4} color="#1B8FA0" />
        {/* Warm bounce light from the lamp */}
        <pointLight position={[1.2, 0.6, -0.8]} intensity={0.6} color="#C9963A" distance={3} />

        <Suspense fallback={null}>
          <Float speed={0.6} rotationIntensity={0.15} floatIntensity={0.2}>
            <RotatingRoom />
          </Float>
        </Suspense>

        {/* Optional: enable user dragging to inspect. Disabled by default for
            the auto-rotating "ambient" feel on the home page. */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}
