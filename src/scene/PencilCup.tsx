import { useCallback, useMemo, useRef, useState } from "react";
import {
  RigidBody,
  CuboidCollider,
  CylinderCollider,
  CapsuleCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { palette } from "./palette";
import { useDraggable } from "../interaction/useDraggable";
import { playTap, playImpact, playVelocityImpact } from "../interaction/sounds";

type Handlers = ReturnType<typeof useDraggable>["handlers"];

// ---- Cup dimensions (local space; base rests on the desk at y = 0) ----
const R = 0.085; // outer radius
const HC = 0.24; // overall height
const BASE_T = 0.02; // solid base thickness
const WT = 0.012; // wall thickness
const N_WALL = 12; // collider segments forming the hollow wall ring

// Mass of the intact cup body (also used by the shatter test below).
const CUP_MASS = 1.5;
// Shatter tests:
//  • A moving *prop* breaks the cup if it's reasonably heavy AND strikes with
//    real speed — so a heavy object dropped on it shatters it even from a
//    gentle drop, while the light pens/pencil (m≈0.05) never can. (A kinetic-
//    energy gate ½·m·v² was too speed-sensitive: a heavy but slow drop never
//    reached it, which is why it felt impossible to break by dropping things.)
//  • A *static surface* (desk, floor, walls) uses the cup's OWN kinetic energy,
//    so it only shatters on a genuinely hard slam, not a casual set-down.
const DYN_MIN_MASS = 0.5; // kg — lighter strikers (the pens) can never break it
const DYN_MIN_SPEED = 3.25; // m/s — relative impact speed a heavy prop needs
const FIXED_BREAK = 9; // ½·m·v² (J) threshold for hard static-surface slams

/**
 * Pencil / pen — a slim writing implement that is its own draggable physics
 * body so it can be lifted out of the cup or scattered when the cup breaks.
 */
const CLIP_COLOR = "#c7cbd2"; // brushed metal clip
const FERRULE_COLOR = "#b9bcc4"; // pencil's metal band

function Writer({
  position,
  rotation,
  bodyColor,
  tipColor,
  nibColor,
  capColor,
  material,
  mass,
  kind,
  buttonColor,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  bodyColor: string;
  tipColor: string;
  nibColor: string;
  capColor: string;
  material: "wood" | "plastic";
  mass: number;
  kind: "pen" | "pencil";
  /** End-button colour (pens only). Defaults to the body colour. */
  buttonColor?: string;
}) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const { handlers, bodyProps } = useDraggable({ bodyRef, material });
  const L = 0.5;
  const r = 0.014;
  const halfBarrel = L * 0.4; // barrel spans ±0.2 around the body origin

  return (
    <RigidBody
      ref={bodyRef}
      position={position}
      rotation={rotation}
      colliders={false}
      ccd
      friction={0.7}
      restitution={0.05}
      linearDamping={0.4}
      angularDamping={0.7}
      {...bodyProps}
    >
      {/* Mass goes on the collider (rapier ignores `mass` on the RigidBody). */}
      <CapsuleCollider args={[(L - 2 * r) / 2, r]} mass={mass} />

      {/* main barrel */}
      <mesh castShadow {...handlers}>
        <cylinderGeometry args={[r, r, halfBarrel * 2, 12]} />
        <meshStandardMaterial color={bodyColor} flatShading />
      </mesh>

      {/* sharpened tip: a wood/plastic frustum tapering from the barrel down to
          the writing point so it stays seamlessly attached to the body */}
      <mesh position={[0, -halfBarrel - L * 0.04, 0]} {...handlers}>
        <cylinderGeometry args={[r, r * 0.34, L * 0.08, 12]} />
        <meshStandardMaterial color={tipColor} flatShading />
      </mesh>
      {/* small writing point (graphite / metal nib) continuing from the frustum */}
      <mesh
        position={[0, -halfBarrel - L * 0.1, 0]}
        rotation={[Math.PI, 0, 0]}
        {...handlers}
      >
        <coneGeometry args={[r * 0.34, L * 0.04, 10]} />
        <meshStandardMaterial color={nibColor} flatShading />
      </mesh>

      {kind === "pencil" ? (
        <>
          {/* metal ferrule band */}
          <mesh position={[0, halfBarrel - L * 0.02, 0]} {...handlers}>
            <cylinderGeometry args={[r * 1.06, r * 1.06, L * 0.05, 12]} />
            <meshStandardMaterial color={FERRULE_COLOR} flatShading metalness={0.6} roughness={0.4} />
          </mesh>
          {/* eraser on top */}
          <mesh position={[0, halfBarrel + L * 0.025, 0]} {...handlers}>
            <cylinderGeometry args={[r * 1.0, r * 1.0, L * 0.06, 12]} />
            <meshStandardMaterial color={capColor} flatShading />
          </mesh>
        </>
      ) : (
        <>
          {/* coloured cap band near the top */}
          <mesh position={[0, halfBarrel - L * 0.02, 0]} {...handlers}>
            <cylinderGeometry args={[r * 1.08, r * 1.08, L * 0.05, 12]} />
            <meshStandardMaterial color={capColor} flatShading />
          </mesh>
          {/* end push-button (part of the pen: draggable/tappable, just not a
              click target like the keyboard keys) */}
          <mesh position={[0, halfBarrel + L * 0.03, 0]} {...handlers}>
            <cylinderGeometry args={[r * 0.62, r * 0.62, L * 0.06, 12]} />
            <meshStandardMaterial
              color={buttonColor ?? bodyColor}
              flatShading
              metalness={0.3}
              roughness={0.5}
            />
          </mesh>
          {/* pocket clip (part of the pen) */}
          <mesh position={[r * 1.15, halfBarrel - L * 0.14, 0]} {...handlers}>
            <boxGeometry args={[r * 0.32, L * 0.22, r * 0.7]} />
            <meshStandardMaterial color={CLIP_COLOR} flatShading metalness={0.6} roughness={0.35} />
          </mesh>
          {/* clip's top bend, connecting it back over the cap */}
          <mesh position={[r * 0.75, halfBarrel - L * 0.02, 0]} {...handlers}>
            <boxGeometry args={[r * 1.4, r * 0.55, r * 0.7]} />
            <meshStandardMaterial color={CLIP_COLOR} flatShading metalness={0.6} roughness={0.35} />
          </mesh>
        </>
      )}
    </RigidBody>
  );
}

/** Pre-computed collider ring that turns a smooth cylinder into a hollow cup. */
function useWallSegments() {
  return useMemo(() => {
    const yCenter = BASE_T + (HC - BASE_T) / 2;
    const wallHeight = HC - BASE_T;
    const width = (2 * Math.PI * R) / N_WALL * 1.05;
    const rW = R - WT / 2;
    return Array.from({ length: N_WALL }, (_, i) => {
      const a = (i / N_WALL) * Math.PI * 2;
      return {
        pos: [Math.cos(a) * rW, yCenter, Math.sin(a) * rW] as [number, number, number],
        rot: [0, Math.PI / 2 - a, 0] as [number, number, number],
        args: [width / 2, wallHeight / 2, WT / 2] as [number, number, number],
      };
    });
  }, []);
}

/** A single random glass fragment that flies off when the cup shatters. */
interface ShardSpec {
  offset: [number, number, number];
  rot: [number, number, number];
  vel: [number, number, number];
  avel: [number, number, number];
  size: number;
}

const _shardSound = {
  onCollisionEnter: (payload: { other: { rigidBody?: RapierRigidBody | null } }) => {
    playVelocityImpact("glass", payload.other.rigidBody?.linvel(), {
      minSpeed: 0.4,
      maxVolume: 0.35,
    });
  },
};

/** The burst of glass shards, spawned at the cup's transform when it breaks. */
function Shards({
  origin,
}: {
  origin: { pos: [number, number, number]; quat: [number, number, number, number] };
}) {
  const shards = useMemo<ShardSpec[]>(() => {
    const N = 12;
    return Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const rr = R * (0.5 + Math.random() * 0.5);
      const hh = BASE_T + Math.random() * (HC - BASE_T);
      const speed = 1.0 + Math.random() * 1.6;
      const up = 0.6 + Math.random() * 1.2;
      const tang = (Math.random() - 0.5) * 0.8;
      return {
        offset: [Math.cos(a) * rr, hh, Math.sin(a) * rr],
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        vel: [
          Math.cos(a) * speed - Math.sin(a) * tang,
          up,
          Math.sin(a) * speed + Math.cos(a) * tang,
        ],
        avel: [
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
        ],
        size: 0.02 + Math.random() * 0.018,
      };
    });
  }, []);

  const quat = useMemo(() => new THREE.Quaternion(...origin.quat), [origin.quat]);

  return (
    <>
      {shards.map((s, i) => {
        const off = new THREE.Vector3(...s.offset).applyQuaternion(quat);
        const vel = new THREE.Vector3(...s.vel).applyQuaternion(quat);
        const pos: [number, number, number] = [
          origin.pos[0] + off.x,
          origin.pos[1] + off.y,
          origin.pos[2] + off.z,
        ];
        return (
          <RigidBody
            key={i}
            position={pos}
            rotation={s.rot}
            colliders={false}
            ccd
            linearVelocity={[vel.x, vel.y, vel.z]}
            angularVelocity={s.avel}
            friction={0.6}
            restitution={0.2}
            mass={0.04}
            {..._shardSound}
          >
            <CuboidCollider args={[s.size * 0.7, s.size * 0.7, 0.007]} />
            <mesh castShadow scale={[1, 1, 0.4]}>
              <tetrahedronGeometry args={[s.size, 0]} />
              <meshStandardMaterial
                color={palette.glass}
                transparent
                opacity={0.55}
                roughness={0.1}
                metalness={0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
          </RigidBody>
        );
      })}
    </>
  );
}

/** The intact glass cup body (walls + base), draggable and breakable. */
function GlassCup({
  bodyRef,
  position,
  handlers,
  onCollision,
}: {
  bodyRef: React.RefObject<RapierRigidBody>;
  position: [number, number, number];
  handlers: Handlers;
  onCollision: (payload: { other: { rigidBody?: RapierRigidBody | null } }) => void;
}) {
  const walls = useWallSegments();
  return (
    <RigidBody
      ref={bodyRef}
      position={position}
      colliders={false}
      ccd
      friction={0.7}
      restitution={0.1}
      linearDamping={0.4}
      angularDamping={0.6}
      mass={CUP_MASS}
      onCollisionEnter={onCollision}
    >
      {/* hollow collider: solid base disc + ring of wall segments */}
      <CylinderCollider args={[BASE_T / 2, R * 0.92]} position={[0, BASE_T / 2, 0]} />
      {walls.map((w, i) => (
        <CuboidCollider key={i} args={w.args} position={w.pos} rotation={w.rot} />
      ))}

      {/* glass walls (open cylinder) */}
      <mesh position={[0, HC / 2, 0]} castShadow {...handlers}>
        <cylinderGeometry args={[R, R * 0.88, HC, 24, 1, true]} />
        <meshStandardMaterial
          color={palette.glass}
          transparent
          opacity={0.3}
          roughness={0.05}
          metalness={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* slightly more solid glass base */}
      <mesh position={[0, BASE_T / 2, 0]} castShadow receiveShadow {...handlers}>
        <cylinderGeometry args={[R * 0.9, R * 0.84, BASE_T, 24]} />
        <meshStandardMaterial
          color={palette.glass}
          transparent
          opacity={0.5}
          roughness={0.05}
          metalness={0.1}
        />
      </mesh>
      {/* top rim highlight */}
      <mesh position={[0, HC, 0]} rotation={[Math.PI / 2, 0, 0]} {...handlers}>
        <torusGeometry args={[R, WT * 0.5, 8, 24]} />
        <meshStandardMaterial
          color={palette.glass}
          transparent
          opacity={0.55}
          roughness={0.05}
        />
      </mesh>
    </RigidBody>
  );
}

/**
 * A glass cup holding a pencil and two pens. The cup shatters into shards when
 * another object slams into it fast enough; the pencil and pens are independent
 * bodies that scatter once their container is gone.
 */
export function PencilCup({
  position = [1.0, 0, 0.42] as [number, number, number],
}: {
  position?: [number, number, number];
}) {
  const cupBody = useRef<RapierRigidBody>(null);
  const [broken, setBroken] = useState(false);
  const [origin, setOrigin] = useState<{
    pos: [number, number, number];
    quat: [number, number, number, number];
  }>({ pos: position, quat: [0, 0, 0, 1] });

  const { handlers } = useDraggable({ bodyRef: cupBody, material: "glass" });

  const breakCup = useCallback(() => {
    const body = cupBody.current;
    if (!body) return;
    const t = body.translation();
    const r = body.rotation();
    setOrigin({ pos: [t.x, t.y, t.z], quat: [r.x, r.y, r.z, r.w] });
    setBroken(true);
    // Layered shatter: one sharp crack followed by tinkling fragments.
    playTap("glass", 0.6);
    window.setTimeout(() => playTap("glass", 0.4), 45);
    window.setTimeout(() => playTap("glass", 0.28), 95);
  }, []);

  const onCollision = useCallback(
    (payload: { other: { rigidBody?: RapierRigidBody | null } }) => {
      if (broken) return;
      const other = payload.other.rigidBody;
      if (!other) return;
      const ov = other.linvel();
      const cv = cupBody.current?.linvel();
      const rel = Math.hypot(
        ov.x - (cv?.x ?? 0),
        ov.y - (cv?.y ?? 0),
        ov.z - (cv?.z ?? 0)
      );
      if (rel > 0.6) playImpact("glass", Math.min(1, rel / 4) * 0.6);

      // Durability. Two cases (see the thresholds above):
      if (other.isFixed()) {
        // Static surface (desk, floor, walls): gauge the cup's OWN kinetic
        // energy so it only shatters on a hard slam, not a casual drop.
        if (0.5 * CUP_MASS * rel * rel > FIXED_BREAK) breakCup();
      } else {
        // A moving prop: a reasonably heavy striker at real speed shatters it
        // (even a gentle drop), while the light pens/pencil never can.
        const m = other.mass() ?? 0;
        if (m >= DYN_MIN_MASS && rel > DYN_MIN_SPEED) breakCup();
      }
    },
    [broken, breakCup]
  );

  return (
    <>
      {!broken && (
        <GlassCup
          bodyRef={cupBody}
          position={position}
          handlers={handlers}
          onCollision={onCollision}
        />
      )}
      {broken && <Shards origin={origin} />}

      {/* Pencil + two pens standing in the cup */}
      <Writer
        position={[position[0] - 0.01, 0.28, position[2] + 0.01]}
        rotation={[0.14, 0, 0.1]}
        bodyColor="#f2c14e"
        tipColor={palette.trunk}
        nibColor="#2b2b2b"
        capColor="#ff8fb0"
        material="wood"
        mass={0.002}
        kind="pencil"
      />
      <Writer
        position={[position[0] + 0.022, 0.28, position[2] - 0.008]}
        rotation={[0.06, 0, -0.16]}
        bodyColor="#2f6fe0"
        tipColor="#1f1f24"
        nibColor="#d6d8dc"
        capColor="#22529f"
        material="plastic"
        mass={0.002}
        kind="pen"
        buttonColor="#22529f"
      />
      <Writer
        position={[position[0] - 0.018, 0.28, position[2] - 0.02]}
        rotation={[-0.12, 0, 0.15]}
        bodyColor="#d94545"
        tipColor="#1f1f24"
        nibColor="#d6d8dc"
        capColor="#a83232"
        material="plastic"
        mass={0.002}
        kind="pen"
        buttonColor="#a83232"
      />
    </>
  );
}
