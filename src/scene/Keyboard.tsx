import { useCallback, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  CuboidCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { palette } from "./palette";
import { useDraggable } from "../interaction/useDraggable";
import { playTap } from "../interaction/sounds";

// One key unit, in world units, plus the gap between caps and their height.
const U = 0.045;
const GAP = 0.006;
const KEY_H = 0.018;
const KEY_BASE_Y = 0.02 + KEY_H / 2;

// All keycaps share one flat-shaded material — they're identical, so there's no
// reason to allocate ~80 copies.
const KEYCAP_MATERIAL = new THREE.MeshStandardMaterial({
  color: palette.keycap,
  flatShading: true,
});

// Centering offsets so the board is symmetric around its rigid body origin.
const CENTER_U_X = 9.5; // half of the 19U total width
const CENTER_U_Z = 2.75; // mid of the 6.5U total depth

type RowSpec = number[]; // positive = key width (U); negative = empty gap (U)

// Function row (Esc + F1-F12 with cluster gaps).
const FROW: RowSpec = [1, -1, 1, 1, 1, 1, -0.5, 1, 1, 1, 1, -0.5, 1, 1, 1, 1];
// Main typing block rows (each totals 15U).
const MAIN: RowSpec[] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2], // number row + Backspace
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5], // Tab row
  [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25], // Caps row
  [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75], // Shift row
  [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25], // bottom row
];

interface KeyDesc {
  xU: number; // center, in U
  wU: number; // width, in U
  zU: number; // row, in U
}

function layoutRow(spec: RowSpec, zU: number): KeyDesc[] {
  const keys: KeyDesc[] = [];
  let cursor = 0;
  for (const w of spec) {
    if (w < 0) {
      cursor += -w;
      continue;
    }
    keys.push({ xU: cursor + w / 2, wU: w, zU });
    cursor += w;
  }
  return keys;
}

// The TKL navigation cluster to the right of the main block.
const NAV: KeyDesc[] = [
  { xU: 16.5, wU: 1, zU: 0 }, { xU: 17.5, wU: 1, zU: 0 }, { xU: 18.5, wU: 1, zU: 0 }, // PrtSc/ScrLk/Pause
  { xU: 16.5, wU: 1, zU: 1.5 }, { xU: 17.5, wU: 1, zU: 1.5 }, { xU: 18.5, wU: 1, zU: 1.5 }, // Ins/Home/PgUp
  { xU: 16.5, wU: 1, zU: 2.5 }, { xU: 17.5, wU: 1, zU: 2.5 }, { xU: 18.5, wU: 1, zU: 2.5 }, // Del/End/PgDn
  { xU: 17.5, wU: 1, zU: 4.5 }, // Up
  { xU: 16.5, wU: 1, zU: 5.5 }, { xU: 17.5, wU: 1, zU: 5.5 }, { xU: 18.5, wU: 1, zU: 5.5 }, // Left/Down/Right
];

/** A single keycap. The board owns the spring animation (a single shared loop)
 * and the keycap material, so individual caps stay cheap even at ~80 per board. */
function Key({
  desc,
  index,
  innerRefs,
  onPress,
}: {
  desc: KeyDesc;
  index: number;
  innerRefs: React.MutableRefObject<(THREE.Group | null)[]>;
  onPress: (index: number) => void;
}) {
  const x = (desc.xU - CENTER_U_X) * U;
  const z = (desc.zU - CENTER_U_Z) * U;
  const w = desc.wU * U - GAP;
  const d = U - GAP;

  return (
    <group position={[x, KEY_BASE_Y, z]}>
      <group ref={(el) => (innerRefs.current[index] = el)}>
        <mesh
          material={KEYCAP_MATERIAL}
          onPointerDown={(e) => {
            e.stopPropagation(); // don't start dragging the whole board
            onPress(index);
          }}
          castShadow
        >
          <boxGeometry args={[w, KEY_H, d]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * A tenkeyless (TKL) mechanical keyboard. The whole board is a draggable prop;
 * every keycap is individually clickable and clacks + springs when pressed. It
 * doesn't type anything — it's purely tactile scenery.
 */
export function Keyboard({
  position = [0, 0.012, 0.2] as [number, number, number],
}) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const { handlers, bodyProps } = useDraggable({ bodyRef, material: "plastic" });

  const keys = useMemo<KeyDesc[]>(
    () => [
      ...layoutRow(FROW, 0),
      ...MAIN.flatMap((r, i) => layoutRow(r, 1.5 + i)),
      ...NAV,
    ],
    []
  );

  // One shared animation loop for every keycap instead of one useFrame each:
  // pressed caps spring down toward their target and ease back to rest.
  const innerRefs = useRef<(THREE.Group | null)[]>([]);
  const targets = useRef<number[]>([]);

  useFrame(() => {
    const groups = innerRefs.current;
    const t = targets.current;
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (!g) continue;
      const goal = t[i] ?? 0;
      const diff = goal - g.position.y;
      if (Math.abs(diff) < 1e-5) {
        g.position.y = goal;
        continue;
      }
      g.position.y += diff * 0.35;
    }
  });

  const press = useCallback((i: number) => {
    targets.current[i] = -0.009;
    playTap("key", 0.9);
    window.setTimeout(() => {
      targets.current[i] = 0;
    }, 80);
  }, []);

  return (
    <RigidBody
      ref={bodyRef}
      position={position}
      colliders={false}
      ccd
      friction={0.9}
      restitution={0.05}
      linearDamping={0.6}
      angularDamping={1}
      {...bodyProps}
    >
      {/* Mass must live on the collider, not the RigidBody (rapier strips it). */}
      <CuboidCollider args={[0.45, 0.025, 0.165]} position={[0, 0.015, 0]} mass={0.5} />

      {/* Case base */}
      <mesh position={[0, 0.01, 0]} castShadow receiveShadow {...handlers}>
        <boxGeometry args={[0.9, 0.02, 0.34]} />
        <meshStandardMaterial color={palette.kbBase} flatShading />
      </mesh>
      {/* Top plate (dark gaps show between caps) */}
      <mesh position={[0, 0.021, 0]} {...handlers}>
        <boxGeometry args={[0.88, 0.006, 0.32]} />
        <meshStandardMaterial color={palette.kbBaseDark} flatShading />
      </mesh>

      {keys.map((k, i) => (
        <Key key={i} desc={k} index={i} innerRefs={innerRefs} onPress={press} />
      ))}
    </RigidBody>
  );
}
