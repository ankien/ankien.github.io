import { Html } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useThree } from "@react-three/fiber";
import { Portfolio } from "../portfolio/Portfolio";
import { useDraggable } from "../interaction/useDraggable";
import { palette } from "./palette";
import { useRef } from "react";
import type { RapierRigidBody } from "@react-three/rapier";

// Physical size of the visible screen, in world units. A 4:3 panel (slightly
// narrower + shorter than a widescreen) reads as a classic desktop monitor.
const SCREEN_W = 1.28;
const SCREEN_H = 0.96; // 4:3
// The portfolio page is authored at 480x360 px (also 4:3). We deliberately use
// drei's NON-transform (billboard) Html mode rather than `transform`: the
// transform mode places the page with a CSS `matrix3d`/`preserve-3d` element,
// which iOS Safari mis-hit-tests (the touchable region is displaced/oversized,
// spilling past the monitor and stealing touches meant for the scene). The
// billboard mode draws the page as a plain 2D overlay (translate3d + scale),
// which every browser hit-tests correctly. `distanceFactor` scales the 480px
// page so it exactly covers the SCREEN_W world units: with drei's billboard
// scaling the on-screen page width is `SCREEN_PX_W * distanceFactor / (2*tan(fov/2)*dist)`
// and the monitor's on-screen width is `SCREEN_W * viewportH / (2*tan(fov/2)*dist)`,
// so equating them gives distanceFactor = SCREEN_W * viewportH / SCREEN_PX_W.
const SCREEN_PX_W = 480;

/**
 * Monitor on a stand. The screen embeds the real, scrollable portfolio page
 * via drei <Html> (billboard mode). The body is a fixed-ish heavy prop you can
 * still tap (for the glassy click) but it stays put so the screen never drifts.
 */
export function Monitor() {
  const bodyRef = useRef<RapierRigidBody>(null);
  // Tap-only: play a tap but don't drag (keeps the readable screen anchored).
  const { handlers } = useDraggable({ bodyRef, material: "plastic", tapOnly: true });
  // Recomputed on viewport resize so the page keeps covering the screen exactly.
  const viewportHeight = useThree((s) => s.size.height);
  const distanceFactor = (SCREEN_W * viewportHeight) / SCREEN_PX_W;

  return (
    <RigidBody ref={bodyRef} type="fixed" position={[0, 0, -0.62]} colliders="cuboid">
      {/* Base — rests on the desk top (y = 0) */}
      <mesh position={[0, 0.03, 0.02]} castShadow {...handlers}>
        <boxGeometry args={[0.46, 0.06, 0.24]} />
        <meshStandardMaterial color={palette.monitorBody} flatShading />
      </mesh>

      {/* Neck — sits BEHIND the screen so it never covers it */}
      <mesh position={[0, 0.32, -0.06]} castShadow {...handlers}>
        <boxGeometry args={[0.09, 0.55, 0.05]} />
        <meshStandardMaterial color={palette.monitorBody} flatShading />
      </mesh>

      {/* Bezel */}
      <mesh position={[0, 0.62, 0]} castShadow {...handlers}>
        <boxGeometry args={[SCREEN_W + 0.1, SCREEN_H + 0.1, 0.045]} />
        <meshStandardMaterial color={palette.monitorBezel} flatShading />
      </mesh>

      {/* Screen glow plane (sits just in front of the bezel face) */}
      <mesh position={[0, 0.62, 0.024]}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial color={palette.screenGlow} toneMapped={false} />
      </mesh>

      {/* The actual scrollable portfolio page */}
      <Html
        position={[0, 0.62, 0.03]}
        center
        distanceFactor={distanceFactor}
        style={{ pointerEvents: "auto" }}
      >
        <Portfolio />
      </Html>
    </RigidBody>
  );
}
