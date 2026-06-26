import { useRef } from "react";
import { RigidBody, CylinderCollider, type RapierRigidBody } from "@react-three/rapier";
import { palette } from "./palette";
import { useDraggable } from "../interaction/useDraggable";

type Handlers = ReturnType<typeof useDraggable>["handlers"];

/** A single leaf: a visible green stem topped with a flat leaf blade. */
function Leaf({
  angle,
  tilt,
  length,
  color,
  handlers,
}: {
  angle: number;
  tilt: number;
  length: number;
  color: string;
  handlers: Handlers;
}) {
  return (
    <group rotation={[0, -angle, 0]}>
      <group rotation={[tilt, 0, 0]}>
        {/* stem */}
        <mesh position={[0, length / 2, 0]} castShadow {...handlers}>
          <cylinderGeometry args={[0.006, 0.01, length, 6]} />
          <meshStandardMaterial color={palette.leafDark} flatShading />
        </mesh>
        {/* leaf blade (flattened ellipsoid) */}
        <mesh
          position={[0, length + 0.045, 0]}
          scale={[0.05, 0.095, 0.018]}
          castShadow
          {...handlers}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        {/* small mid-rib accent */}
        <mesh position={[0, length + 0.045, 0.01]} scale={[0.008, 0.085, 0.005]}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial color={palette.leafDark} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/** A single flower on a slender stem: a ring of petals around a round center. */
function Flower({
  angle,
  tilt,
  length,
  color,
  handlers,
}: {
  angle: number;
  tilt: number;
  length: number;
  color: string;
  handlers: Handlers;
}) {
  const petals = Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2);
  return (
    <group rotation={[0, -angle, 0]}>
      <group rotation={[tilt, 0, 0]}>
        {/* stem */}
        <mesh position={[0, length / 2, 0]} castShadow {...handlers}>
          <cylinderGeometry args={[0.005, 0.007, length, 6]} />
          <meshStandardMaterial color={palette.leafDark} flatShading />
        </mesh>
        {/* blossom */}
        <group position={[0, length + 0.01, 0]}>
          {petals.map((a, i) => (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.028, 0, Math.sin(a) * 0.028]}
              scale={[0.022, 0.01, 0.014]}
              castShadow
              {...handlers}
            >
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color={color} flatShading />
            </mesh>
          ))}
          {/* center */}
          <mesh scale={0.018}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color={palette.flowerCenter} flatShading />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** A single potted plant: tapered pot, a dirt mound, and leafy stems. */
function PottedPlant({
  position,
  scale = 1,
  flowering = false,
}: {
  position: [number, number, number];
  scale?: number;
  flowering?: boolean;
}) {
  const bodyRef = useRef<RapierRigidBody>(null);
  // Pot uses a plastic tap; the foliage/dirt use a leafy rustle. Both drive the
  // same body. We take the rustle hook's `bodyProps` so a falling plant's
  // collision sounds like rustling leaves rather than plastic.
  const potDrag = useDraggable({ bodyRef, material: "plastic" });
  const leafDrag = useDraggable({ bodyRef, material: "leaves" });
  const handlers = potDrag.handlers;
  const leafHandlers = leafDrag.handlers;
  const bodyProps = leafDrag.bodyProps;

  // A ring of leaves at varying angles/heights, plus a couple of taller central
  // shoots, so the plant reads as full and bushy.
  const leaves = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const tilt = 0.55 + (i % 3) * 0.18;
    const length = 0.12 + (i % 4) * 0.035;
    return { a, tilt, length, color: i % 2 === 0 ? palette.leaf : palette.leafDark };
  });
  const centerLeaves = [
    { a: 0.4, tilt: 0.12, length: 0.26, color: palette.leaf },
    { a: 3.4, tilt: 0.18, length: 0.22, color: palette.leafDark },
  ];
  // Flowers poke up between the leaves on the flowering plant, alternating
  // colours so it reads as a cheerful blooming plant.
  const flowers = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const tilt = 0.2 + (i % 2) * 0.22;
    const length = 0.2 + (i % 3) * 0.04;
    return { a, tilt, length, color: i % 2 === 0 ? palette.flower : palette.flowerAlt };
  });

  return (
    <RigidBody
      ref={bodyRef}
      position={position}
      colliders={false}
      ccd
      friction={0.9}
      restitution={0.1}
      linearDamping={0.5}
      angularDamping={0.7}
      {...bodyProps}
    >
      <group scale={scale}>
        {/* Solid pot collider. Mass lives on the collider because
            react-three-rapier strips `mass` off <RigidBody> when explicit
            colliders are used, so it must be set here to take effect. */}
        <CylinderCollider args={[0.12, 0.14]} position={[0, 0.015, 0]} mass={0.6} />
        {/* Pot */}
        <mesh castShadow receiveShadow {...handlers}>
          <cylinderGeometry args={[0.13, 0.1, 0.2, 14]} />
          <meshStandardMaterial color={palette.pot} flatShading />
        </mesh>
        {/* Rim */}
        <mesh position={[0, 0.1, 0]} {...handlers}>
          <cylinderGeometry args={[0.14, 0.13, 0.045, 14]} />
          <meshStandardMaterial color={palette.potDark} flatShading />
        </mesh>

        {/* Dirt: a rounded mound sitting in the pot */}
        <mesh position={[0, 0.1, 0]} {...leafHandlers}>
          <sphereGeometry args={[0.118, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={palette.soil} flatShading />
        </mesh>
        {/* a few dirt clumps for texture */}
        {[
          [0.05, 0.0, 0.04],
          [-0.06, 0.0, 0.02],
          [0.0, 0.0, -0.06],
          [0.04, 0.0, -0.03],
        ].map((p, i) => (
          <mesh key={i} position={[p[0], 0.115, p[2]]} scale={0.02 + (i % 2) * 0.008} {...leafHandlers}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={palette.soil} flatShading />
          </mesh>
        ))}

        {/* Leafy stems rooted in the dirt */}
        <group position={[0, 0.12, 0]}>
          {leaves.map((l, i) => (
            <Leaf
              key={i}
              angle={l.a}
              tilt={l.tilt}
              length={l.length}
              color={l.color}
              handlers={leafHandlers}
            />
          ))}
          {centerLeaves.map((l, i) => (
            <Leaf
              key={`c${i}`}
              angle={l.a}
              tilt={l.tilt}
              length={l.length}
              color={l.color}
              handlers={leafHandlers}
            />
          ))}
          {flowering &&
            flowers.map((f, i) => (
              <Flower
                key={`f${i}`}
                angle={f.a}
                tilt={f.tilt}
                length={f.length}
                color={f.color}
                handlers={leafHandlers}
              />
            ))}
        </group>
      </group>
    </RigidBody>
  );
}

/** Cluster of small potted plants placed around the desk. */
export function Plants() {
  return (
    <>
      {/* Two plants on the left of the desk, set further back (toward the wall)
          but still fully in view beside the monitor. Y is set so each pot rests
          exactly on the desk (top at y=0), so they don't drop/tunnel on load.
          The larger plant blooms with flowers to distinguish it. */}
      <PottedPlant position={[-1.35, 0.105, -0.35]} scale={1.0} flowering />
      <PottedPlant position={[-1.65, 0.087, 0.1]} scale={0.82} />
    </>
  );
}
