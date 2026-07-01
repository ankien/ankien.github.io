import { Html } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { Portfolio } from "../portfolio/Portfolio";
import { useDraggable } from "../interaction/useDraggable";
import { palette } from "./palette";
import { useRef } from "react";
import type { RapierRigidBody } from "@react-three/rapier";

// Physical size of the visible screen, in world units. A 4:3 panel (slightly
// narrower + shorter than a widescreen) reads as a classic desktop monitor.
const SCREEN_W = 1.28;
const SCREEN_H = 0.96; // 4:3
// The HTML page is authored at 480x360 px (also 4:3); we map those pixels onto
// the screen. drei's <Html transform> internally divides the group scale by
// 400/(distanceFactor||10) = 40, so we multiply by 40 to get the page to fill
// the screen at the intended physical size (otherwise it renders as a speck).
const SCREEN_PX_W = 480;
const HTML_SCALE = (SCREEN_W / SCREEN_PX_W) * 40;

/**
 * Monitor on a stand. The screen embeds the real portfolio page via drei
 * <Html transform> so it lives in true 3D — it keeps correct perspective as the
 * camera pans and is occluded by props that pass in front of it. The page
 * scrolls via a JS transform (see Portfolio), NOT a native overflow container:
 * a native scroller inside drei's matrix3d/preserve-3d context is mis-rendered
 * by iOS Safari (blank band on top, content spilling past the bottom). The body
 * is a fixed-ish heavy prop you can still tap (for the glassy click) but it
 * stays put so the screen never drifts.
 */
export function Monitor() {
  const bodyRef = useRef<RapierRigidBody>(null);
  // Tap-only: play a tap but don't drag (keeps the readable screen anchored).
  const { handlers } = useDraggable({ bodyRef, material: "plastic", tapOnly: true });

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

      {/* The actual portfolio page (scrolls via a JS transform, not overflow) */}
      <Html
        transform
        position={[0, 0.62, 0.03]}
        scale={HTML_SCALE}
        occlude="blending"
        style={{ pointerEvents: "auto" }}
      >
        <Portfolio />
      </Html>
    </RigidBody>
  );
}
