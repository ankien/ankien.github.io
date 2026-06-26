import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  CuboidCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { palette } from "./palette";
import { useDraggable } from "../interaction/useDraggable";

type Handlers = ReturnType<typeof useDraggable>["handlers"];

/**
 * A spinning cooling fan. Built facing +z (spin axis = z); reorient with a
 * parent rotation to make it face other directions. The blade group rotates
 * every frame for a continuous spin.
 */
function Fan({
  radius,
  speed = 6,
  bladeCount = 7,
  housing = "#0f1115",
  blade = "#2a2e35",
}: {
  radius: number;
  speed?: number;
  bladeCount?: number;
  housing?: string;
  blade?: string;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * speed;
  });

  const blades = Array.from(
    { length: bladeCount },
    (_, i) => (i / bladeCount) * Math.PI * 2
  );

  return (
    <group>
      {/* square housing */}
      <mesh>
        <boxGeometry args={[radius * 2.1, radius * 2.1, 0.02]} />
        <meshStandardMaterial color={housing} flatShading />
      </mesh>
      {/* recessed ring */}
      <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, 0.02, 20, 1, true]} />
        <meshStandardMaterial color="#05070a" side={THREE.DoubleSide} />
      </mesh>
      {/* spinning blades */}
      <group ref={ref} position={[0, 0, 0.02]}>
        {blades.map((a, i) => (
          <group key={i} rotation={[0, 0, a]}>
            <mesh position={[0, radius * 0.45, 0]} rotation={[0.4, 0, 0]} castShadow>
              <boxGeometry args={[radius * 0.55, radius * 0.7, 0.006]} />
              <meshStandardMaterial color={blade} flatShading />
            </mesh>
          </group>
        ))}
        {/* hub */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius * 0.22, radius * 0.22, 0.04, 12]} />
          <meshStandardMaterial color="#15171b" flatShading />
        </mesh>
      </group>
    </group>
  );
}

/**
 * A small emissive bar that cycles through the RGB hue wheel. Reused for the
 * case strip, the RAM tops and the GPU accent so the lighting feels unified.
 */
function RGBStrip({
  size,
  position,
  rotation,
  speed = 0.08,
  offset = 0,
}: {
  size: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  speed?: number;
  offset?: number;
}) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const hue = (clock.elapsedTime * speed + offset) % 1;
      ref.current.color.setHSL(hue, 0.85, 0.6);
      ref.current.emissive.setHSL(hue, 0.85, 0.55);
    }
  });
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial ref={ref} emissiveIntensity={2} toneMapped={false} />
    </mesh>
  );
}

/**
 * Simplified internal hardware, laid out to be seen through the left glass
 * panel (which faces -x). GPU and CPU fans face the glass and spin.
 */
function PCInternals({ handlers }: { handlers: Handlers }) {
  return (
    <group>
      {/* PSU at the bottom */}
      <mesh position={[0, -0.25, 0]} {...handlers}>
        <boxGeometry args={[0.3, 0.1, 0.54]} />
        <meshStandardMaterial color="#15171b" flatShading />
      </mesh>

      {/* Motherboard against the far (+x) inner wall */}
      <mesh position={[0.135, 0.06, 0]} {...handlers}>
        <boxGeometry args={[0.02, 0.42, 0.48]} />
        <meshStandardMaterial color="#1d3b2f" flatShading />
      </mesh>

      {/* RAM: four prominent sticks standing on the board, set back toward the
          exhaust fan (−z) and a little lower so they don't overlap the CPU
          cooler. Each stick has its own vertical RGB strip down its
          glass-facing face. */}
      {[-0.18, -0.14, -0.1, -0.06].map((z, i) => (
        <group key={i} position={[0.095, 0.14, z]}>
          {/* stick body (lighter so it stands out against the dark board) */}
          <mesh {...handlers}>
            <boxGeometry args={[0.02, 0.16, 0.03]} />
            <meshStandardMaterial color="#3a4150" flatShading />
          </mesh>
          {/* heatspreader notch */}
          <mesh position={[0, 0.0, 0]}>
            <boxGeometry args={[0.022, 0.1, 0.031]} />
            <meshStandardMaterial color="#272d38" flatShading />
          </mesh>
          {/* vertical RGB strip running down the glass-facing (−x) face */}
          <RGBStrip
            size={[0.006, 0.13, 0.012]}
            position={[-0.012, 0.0, 0]}
            speed={0.12}
            offset={i * 0.12}
          />
        </group>
      ))}

      {/* CPU cooler: heatsink block + fan facing the glass (-x) */}
      <mesh position={[0.085, 0.17, 0.06]} {...handlers}>
        <boxGeometry args={[0.07, 0.15, 0.13]} />
        <meshStandardMaterial color="#3a4049" flatShading />
      </mesh>
      <group position={[0.02, 0.17, 0.06]} rotation={[0, -Math.PI / 2, 0]}>
        <Fan radius={0.072} speed={7} blade="#4a5160" />
      </group>

      {/* GPU mounted vertically, fans facing the glass (-x) */}
      <mesh position={[0.02, -0.06, 0]} {...handlers}>
        <boxGeometry args={[0.06, 0.17, 0.34]} />
        <meshStandardMaterial color="#202329" flatShading />
      </mesh>
      {/* GPU backplate accent */}
      <mesh position={[0.055, -0.06, 0]}>
        <boxGeometry args={[0.008, 0.17, 0.34]} />
        <meshStandardMaterial color="#2c313a" flatShading />
      </mesh>
      {/* GPU side RGB light bar (faces the glass, -x edge) */}
      <RGBStrip
        size={[0.006, 0.02, 0.32]}
        position={[-0.048, 0.02, 0]}
        speed={0.1}
        offset={0.5}
      />
      {[-0.085, 0.085].map((z, i) => (
        <group key={i} position={[-0.02, -0.06, z]} rotation={[0, -Math.PI / 2, 0]}>
          <Fan radius={0.066} speed={9} blade="#1b1e24" />
        </group>
      ))}
    </group>
  );
}

/**
 * Gaming PC tower — a draggable dynamic prop with a hollow case, a transparent
 * left glass panel, simplified internal hardware and animated cooling fans.
 */
export function PCTower({
  position = [1.55, 0.32, -0.2] as [number, number, number],
}) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const { handlers, bodyProps } = useDraggable({ bodyRef, material: "plastic" });

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const hue = (clock.elapsedTime * 0.08) % 1;
      glowRef.current.color.setHSL(hue, 0.8, 0.6);
      glowRef.current.emissive.setHSL(hue, 0.8, 0.55);
    }
  });

  // Half-extents of the case.
  const HX = 0.17;
  const HY = 0.31;
  const HZ = 0.3;

  return (
    <RigidBody
      ref={bodyRef}
      position={position}
      rotation={[0, 0.5, 0]}
      colliders={false}
      ccd
      friction={0.8}
      restitution={0.1}
      linearDamping={0.4}
      angularDamping={0.6}
      {...bodyProps}
    >
      {/* Solid box collider (visuals are hollow so we can see inside).
          Mass lives on the collider: react-three-rapier strips `mass` off
          <RigidBody> when explicit child colliders are used, so the configured
          weight only takes effect when set here. */}
      <CuboidCollider args={[HX, HY, HZ]} mass={3} />

      {/* ---- Case shell (open on the -x / glass side) ---- */}
      {/* far side (+x), opaque */}
      <mesh position={[HX, 0, 0]} castShadow receiveShadow {...handlers}>
        <boxGeometry args={[0.02, HY * 2, HZ * 2]} />
        <meshStandardMaterial color={palette.towerBody} flatShading />
      </mesh>
      {/* top */}
      <mesh position={[0, HY, 0]} castShadow {...handlers}>
        <boxGeometry args={[HX * 2, 0.02, HZ * 2]} />
        <meshStandardMaterial color={palette.towerBody} flatShading />
      </mesh>
      {/* bottom */}
      <mesh position={[0, -HY, 0]} castShadow {...handlers}>
        <boxGeometry args={[HX * 2, 0.02, HZ * 2]} />
        <meshStandardMaterial color={palette.towerBody} flatShading />
      </mesh>
      {/* back (-z) */}
      <mesh position={[0, 0, -HZ]} castShadow {...handlers}>
        <boxGeometry args={[HX * 2, HY * 2, 0.02]} />
        <meshStandardMaterial color={palette.towerPanel} flatShading />
      </mesh>
      {/* front (+z) frame: thin border rails so the intake fans show through */}
      {[
        { p: [0, HY - 0.03, HZ] as [number, number, number], s: [HX * 2, 0.06, 0.02] as [number, number, number] },
        { p: [0, -HY + 0.03, HZ] as [number, number, number], s: [HX * 2, 0.06, 0.02] as [number, number, number] },
        { p: [HX - 0.02, 0, HZ] as [number, number, number], s: [0.04, HY * 2, 0.02] as [number, number, number] },
        { p: [-HX + 0.02, 0, HZ] as [number, number, number], s: [0.04, HY * 2, 0.02] as [number, number, number] },
      ].map((r, i) => (
        <mesh key={i} position={r.p} castShadow {...handlers}>
          <boxGeometry args={r.s} />
          <meshStandardMaterial color={palette.towerBody} flatShading />
        </mesh>
      ))}

      {/* ---- Tempered-glass side panel (-x), see-through ---- */}
      <mesh position={[-HX - 0.004, 0, 0]} {...handlers}>
        <boxGeometry args={[0.008, HY * 2 - 0.02, HZ * 2 - 0.02]} />
        <meshStandardMaterial
          color={palette.glass}
          transparent
          opacity={0.16}
          roughness={0.05}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* ---- Internal hardware ---- */}
      <PCInternals handlers={handlers} />

      {/* ---- Rear exhaust fan, mounted on the back wall but with its blades
          facing the viewer (+z) so you can see it spinning through the front /
          glass instead of looking at a solid housing backplate. ---- */}
      <group position={[-0.02, 0.18, -HZ + 0.03]}>
        <Fan radius={0.07} speed={6} blade="#23272e" />
      </group>

      {/* ---- Front intake fans (face +z) ---- */}
      <group position={[0, -0.12, HZ - 0.015]}>
        <Fan radius={0.082} speed={5} blade="#23272e" />
      </group>
      <group position={[0, 0.08, HZ - 0.015]}>
        <Fan radius={0.082} speed={5} blade="#23272e" />
      </group>

      {/* ---- RGB light strip on the front edge ---- */}
      {/* Sits proud of the front frame (z beyond HZ) so it never z-fights the rails. */}
      <mesh position={[-HX + 0.025, 0, HZ + 0.012]} {...handlers}>
        <boxGeometry args={[0.016, HY * 1.8, 0.01]} />
        <meshStandardMaterial
          ref={glowRef}
          color={palette.rgb}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
    </RigidBody>
  );
}
