import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import { palette } from "./palette";

/**
 * A cheery cartoon sun with animated rotating rays, sunglasses and a smile.
 * Built from flat unlit geometry so it stays bright regardless of scene light,
 * and faces the camera (+z) from deep in the backyard.
 */
function Sun({ position }: { position: [number, number, number] }) {
  const raysRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (raysRef.current) {
      raysRef.current.rotation.z += delta * 0.35;
      const s = 1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.07;
      raysRef.current.scale.setScalar(s);
    }
  });

  const rays = Array.from({ length: 12 }, (_, i) => (i * Math.PI * 2) / 12);

  return (
    <group position={position}>
      {/* Animated rays */}
      <group ref={raysRef}>
        {rays.map((a, i) => (
          <mesh
            key={i}
            position={[Math.cos(a) * 1.0, Math.sin(a) * 1.0, -0.05]}
            rotation={[0, 0, a - Math.PI / 2]}
            // Flatten the cone in depth so it can't poke forward through the sun
            // disc / border (which sit at z >= -0.01) and z-fight with them.
            scale={[1, 1, 0.12]}
          >
            <coneGeometry args={[0.13, 0.55, 4]} />
            <meshBasicMaterial color="#ffd23f" />
          </mesh>
        ))}
      </group>

      {/* Sun disc */}
      <mesh>
        <circleGeometry args={[0.72, 40]} />
        <meshBasicMaterial color="#ffd23f" />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[0.82, 40]} />
        <meshBasicMaterial color="#ffb703" />
      </mesh>

      {/* Rosy cheeks */}
      <mesh position={[-0.34, -0.12, 0.02]}>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color="#ff9e6d" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0.34, -0.12, 0.02]}>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color="#ff9e6d" transparent opacity={0.7} />
      </mesh>

      {/* Sunglasses: two lenses + bridge */}
      <mesh position={[-0.24, 0.12, 0.03]}>
        <circleGeometry args={[0.17, 24]} />
        <meshBasicMaterial color="#1f2630" />
      </mesh>
      <mesh position={[0.24, 0.12, 0.03]}>
        <circleGeometry args={[0.17, 24]} />
        <meshBasicMaterial color="#1f2630" />
      </mesh>
      {/* lens highlights */}
      <mesh position={[-0.29, 0.17, 0.04]}>
        <circleGeometry args={[0.05, 12]} />
        <meshBasicMaterial color="#3a4a5c" />
      </mesh>
      <mesh position={[0.19, 0.17, 0.04]}>
        <circleGeometry args={[0.05, 12]} />
        <meshBasicMaterial color="#3a4a5c" />
      </mesh>
      {/* bridge */}
      <mesh position={[0, 0.12, 0.03]}>
        <boxGeometry args={[0.16, 0.035, 0.01]} />
        <meshBasicMaterial color="#1f2630" />
      </mesh>
      {/* temple arms */}
      <mesh position={[-0.45, 0.14, 0.03]}>
        <boxGeometry args={[0.12, 0.03, 0.01]} />
        <meshBasicMaterial color="#1f2630" />
      </mesh>
      <mesh position={[0.45, 0.14, 0.03]}>
        <boxGeometry args={[0.12, 0.03, 0.01]} />
        <meshBasicMaterial color="#1f2630" />
      </mesh>

      {/* Smile */}
      <mesh position={[0, -0.16, 0.03]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.22, 0.04, 8, 20, Math.PI]} />
        <meshBasicMaterial color="#7a4a1e" />
      </mesh>
    </group>
  );
}

/** A single low-poly cartoon tree: a tapered trunk under a full, irregular
 * crown built from several overlapping foliage blobs in a few green shades so
 * it reads as layered leaves rather than one flat ball. The crown sits high on
 * the trunk so its lowest blobs stay well clear of the foreground bushes. */
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* trunk */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.17, 1.1, 7]} />
        <meshStandardMaterial color={palette.trunk} flatShading />
      </mesh>
      {/* crown — a cluster of blobs, largest in the middle */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color={palette.foliage} flatShading />
      </mesh>
      <mesh position={[0.45, 1.25, 0.15]} castShadow>
        <icosahedronGeometry args={[0.52, 0]} />
        <meshStandardMaterial color={palette.grassDark} flatShading />
      </mesh>
      <mesh position={[-0.45, 1.3, -0.12]} castShadow>
        <icosahedronGeometry args={[0.48, 0]} />
        <meshStandardMaterial color={palette.leafDark} flatShading />
      </mesh>
      <mesh position={[0.08, 1.9, -0.15]} castShadow>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={palette.foliage} flatShading />
      </mesh>
      <mesh position={[-0.12, 1.02, 0.32]} castShadow>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color={palette.grassDark} flatShading />
      </mesh>
    </group>
  );
}

/** A leafy shrub: a small cluster of overlapping lobes in mixed greens so it
 * looks bushy and full instead of a single solid. */
function Bush({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <dodecahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color={palette.foliage} flatShading />
      </mesh>
      <mesh position={[0.34, -0.05, 0.06]} castShadow>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={palette.grassDark} flatShading />
      </mesh>
      <mesh position={[-0.32, -0.03, -0.05]} castShadow>
        <dodecahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={palette.leafDark} flatShading />
      </mesh>
      <mesh position={[0.04, 0.22, -0.02]} castShadow>
        <dodecahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial color={palette.leaf} flatShading />
      </mesh>
    </group>
  );
}

/** A single puffy 2D cloud built from a few overlapping white circles. Each
 * puff sits at a slightly different z so the circles are never coplanar (which
 * caused z-fighting), and depthWrite is off so the transparent stack blends
 * cleanly regardless of draw order. */
function Cloud({ scale = 1 }: { scale?: number }) {
  const puffs: [number, number, number][] = [
    [0, 0, 0.6],
    [0.5, 0.08, 0.5],
    [-0.5, 0.05, 0.5],
    [0.25, 0.18, 0.45],
    [-0.25, 0.14, 0.45],
  ];
  return (
    <group scale={scale}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p[0], p[1], i * 0.01]}>
          <circleGeometry args={[p[2], 20]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.92}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A drifting band of 2D clouds. Each cloud slides slowly across the sky and
 * wraps back around to the far side, so the backyard always has gentle motion.
 */
function Clouds() {
  const SPAN = 26; // horizontal wrap distance
  const clouds = useMemo(
    () =>
      [
        // z = -1.2 sits IN FRONT of the sun (which is at z = -1.5), so clouds
        // drift across its face. More of them for a busier sky.
        { x: -11, y: 3.4, z: -1.2, s: 1.1, speed: 0.4 },
        { x: -6, y: 4.4, z: -1.15, s: 1.5, speed: 0.3 },
        { x: -2, y: 2.6, z: -1.25, s: 0.85, speed: 0.5 },
        { x: 2, y: 3.7, z: -1.2, s: 1.25, speed: 0.34 },
        { x: 6, y: 2.9, z: -1.15, s: 0.95, speed: 0.46 },
        { x: 10, y: 4.1, z: -1.25, s: 1.35, speed: 0.28 },
        { x: 13, y: 3.1, z: -1.2, s: 1.05, speed: 0.42 },
      ] as const,
    []
  );
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame((_, delta) => {
    clouds.forEach((c, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.x += c.speed * delta;
      if (g.position.x > SPAN / 2) g.position.x -= SPAN;
    });
  });

  return (
    <group>
      {clouds.map((c, i) => (
        <group
          key={i}
          ref={(el) => (refs.current[i] = el)}
          position={[c.x, c.y, c.z]}
        >
          <Cloud scale={c.s} />
        </group>
      ))}
    </group>
  );
}

/** A framed image poster on the wall. The frame is sized to the image's natural
 * aspect ratio, fitted within a shared (maxW x maxH) budget so the two posters
 * stay visually balanced. Flat, unlit art so it reads as printed paper.
 * Purely decorative — no physics, no pointer handlers. */
function ImagePoster({
  url,
  position,
  rotation = [0, 0, 0],
  maxW = 1.05,
  maxH = 1.35,
}: {
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  maxW?: number;
  maxH?: number;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    // Resolve against Vite's base path (e.g. "/portfolio/") so public assets
    // load both on the dev server and when deployed to a sub-path.
    const resolved = import.meta.env.BASE_URL + url.replace(/^\//, "");
    const loader = new THREE.TextureLoader();
    let tex: THREE.Texture | null = null;
    loader.load(resolved, (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace;
      tex = loaded;
      setTexture(loaded);
    });
    return () => tex?.dispose();
  }, [url]);

  // Fit the image inside the budget while preserving its natural aspect ratio.
  const { w, h } = useMemo(() => {
    const img = texture?.image as { width: number; height: number } | undefined;
    if (!img?.width || !img?.height) return { w: maxW, h: maxH };
    const aspect = img.width / img.height;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    return { w, h };
  }, [texture, maxW, maxH]);

  if (!texture) return null;

  return (
    <group position={position} rotation={rotation}>
      {/* dark frame */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[w + 0.07, h + 0.07]} />
        <meshStandardMaterial color="#1c1c20" flatShading />
      </mesh>
      {/* image */}
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  );
}

/**
 * The room enclosure plus the backyard seen through the window behind the desk.
 * Everything here is non-interactive scenery (no physics) to keep it cheap.
 */
export function Room() {
  // Vibrant vertical sky gradient (bright azure up top fading to a soft horizon).
  const skyTexture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, "#0a4fb0"); // deep azure zenith
    grad.addColorStop(0.45, "#1f74d8"); // rich sky blue
    grad.addColorStop(0.78, "#4f9ee6"); // mid blue
    grad.addColorStop(1.0, "#bfe2f7"); // soft hazy horizon
    g.fillStyle = grad;
    g.fillRect(0, 0, 8, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <group>
      {/* Static physics shell: the floor, two side walls and the back wall are
          fixed colliders (like the desk) so props rest on the floor and can't
          pass through the walls. Invisible — the visuals are the meshes below. */}
      <RigidBody type="fixed" colliders={false} friction={0.9} restitution={0.05}>
        {/* Floor — top surface at y = -1.2 */}
        <CuboidCollider args={[8, 0.15, 8]} position={[0, -1.35, 0]} />
        {/* Left / right side walls (inner faces ~x = ±4.6) */}
        <CuboidCollider args={[0.1, 2.5, 6]} position={[-4.7, 1.3, 0]} />
        <CuboidCollider args={[0.1, 2.5, 6]} position={[4.7, 1.3, 0]} />
        {/* Back wall behind the desk (inner face ~z = -2.88) */}
        <CuboidCollider args={[4.85, 2.5, 0.12]} position={[0, 1.3, -3]} />
      </RigidBody>

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color={palette.floor} />
      </mesh>

      {/* Back wall split into pieces to leave a big window opening in the middle */}
      <group position={[0, 0, -3]}>
        {/* left pillar */}
        <mesh position={[-3.1, 1.3, 0]} receiveShadow>
          <boxGeometry args={[3.2, 5, 0.2]} />
          <meshStandardMaterial color={palette.wallBack} />
        </mesh>
        {/* right pillar */}
        <mesh position={[3.1, 1.3, 0]} receiveShadow>
          <boxGeometry args={[3.2, 5, 0.2]} />
          <meshStandardMaterial color={palette.wallBack} />
        </mesh>
        {/* header above window */}
        <mesh position={[0, 3.2, 0]} receiveShadow>
          <boxGeometry args={[3.0, 1.4, 0.2]} />
          <meshStandardMaterial color={palette.wallBack} />
        </mesh>
        {/* sill below window */}
        <mesh position={[0, -0.7, 0.02]} receiveShadow>
          <boxGeometry args={[3.4, 0.3, 0.32]} />
          <meshStandardMaterial color={palette.trim} flatShading />
        </mesh>

        {/* Window frame cross bars */}
        <mesh position={[0, 1.25, 0.05]}>
          <boxGeometry args={[3.0, 0.08, 0.12]} />
          <meshStandardMaterial color={palette.trim} />
        </mesh>
        <mesh position={[0, 1.25, 0.05]}>
          <boxGeometry args={[0.08, 3.5, 0.12]} />
          <meshStandardMaterial color={palette.trim} />
        </mesh>
      </group>

      {/* Side walls */}
      <mesh position={[-4.7, 1.3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial color={palette.wallSide} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[4.7, 1.3, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial color={palette.wallSide} side={THREE.DoubleSide} />
      </mesh>

      {/* ---- Decorative wall posters (non-interactive) ---- */}
      {/* Mounted on the back-wall pillars beside the window, facing the camera
          (+z) so they're clearly in view. Pillar faces sit at world z ≈ -2.89.
          Each frame fits its image's natural aspect ratio. */}
      <ImagePoster url="/posters/poster-anime.png" position={[-3.05, 1.7, -2.86]} />
      <ImagePoster url="/posters/poster-mecha.png" position={[3.05, 1.7, -2.86]} />

      {/* ---- Backyard, seen through the window ---- */}
      <group position={[0, 0, -8]}>
        {/* sky */}
        <mesh position={[0, 3, -2]}>
          <planeGeometry args={[40, 24]} />
          <meshBasicMaterial map={skyTexture} />
        </mesh>
        {/* drifting 2D clouds */}
        <Clouds />
        {/* cheery cartoon sun, high in the visible sky */}
        <Sun position={[-0.7, 2.1, -1.5]} />
        {/* grass ground (kept well below the room floor to avoid z-fighting) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 2]}>
          <planeGeometry args={[40, 24]} />
          <meshStandardMaterial
            color={palette.grass}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
        {/* gentle hill */}
        <mesh position={[6, -0.9, -1]} scale={[6, 2.4, 4]}>
          <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={palette.grassDark} flatShading />
        </mesh>

        <Tree position={[-3.5, -1.5, -0.5]} scale={1.3} />
        <Tree position={[3.5, -1.5, -1.5]} scale={1.6} />
        <Tree position={[-6, -1.5, -2]} scale={1.1} />
        {/* Bushes sit well in front (z >= 2.6) of every tree crown so they
            never clip through the low-hanging leaves, and are spaced apart in x
            so they don't intersect each other. */}
        <Bush position={[-1.4, -1.3, 2.6]} scale={1.0} />
        <Bush position={[0.8, -1.35, 3.0]} scale={1.15} />
        <Bush position={[2.4, -1.3, 2.6]} scale={0.85} />
      </group>
    </group>
  );
}
