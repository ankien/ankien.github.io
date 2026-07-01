import { RigidBody } from "@react-three/rapier";
import { MonitorScreenTexture } from "./MonitorScreenTexture";
import { MonitorScreenBillboard } from "./MonitorScreenBillboard";
import { useDraggable } from "../interaction/useDraggable";
import { palette } from "./palette";
import { useRef } from "react";
import type { RapierRigidBody } from "@react-three/rapier";

// Physical size of the visible screen, in world units. A 4:3 panel (slightly
// narrower + shorter than a widescreen) reads as a classic desktop monitor.
const SCREEN_W = 1.28;
const SCREEN_H = 0.96; // 4:3

// Which screen implementation to embed:
//  - "texture"  : render-to-texture on a real 3D plane. True perspective +
//                 depth occlusion, and no CSS matrix3d for iOS Safari to break.
//  - "billboard": the original iOS-safe drei <Html> 2D overlay (preserved in
//                 MonitorScreenBillboard). Flip here to swap back instantly.
const SCREEN_MODE: "texture" | "billboard" = "texture";

/**
 * Monitor on a stand. The screen embeds the real portfolio page — either
 * rasterized onto a 3D plane (SCREEN_MODE "texture") or as a drei <Html>
 * billboard overlay (SCREEN_MODE "billboard"). The body is a fixed-ish heavy
 * prop you can still tap (for the glassy click) but it stays put so the screen
 * never drifts.
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

      {/* Screen glow plane (sits just in front of the bezel face). Shows while
          the texture rasterizes; the screen sits just in front of it. */}
      <mesh position={[0, 0.62, 0.024]}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial color={palette.screenGlow} toneMapped={false} />
      </mesh>

      {/* The actual portfolio page. */}
      {SCREEN_MODE === "texture" ? (
        <MonitorScreenTexture position={[0, 0.62, 0.03]} />
      ) : (
        <MonitorScreenBillboard position={[0, 0.62, 0.03]} />
      )}
    </RigidBody>
  );
}
