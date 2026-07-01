import { RigidBody, CuboidCollider } from "@react-three/rapier";
import type { ThreeEvent } from "@react-three/fiber";
import { useRef } from "react";
import { palette } from "./palette";
import { playTap, playVelocityImpact, type CollisionPayload } from "../interaction/sounds";

// A touch counts as a "tap" (not a pan) if the finger barely moved between
// press and release.
const TAP_MOVE_PX = 10;

/**
 * Desk top + legs. The top is a FIXED physics collider so dropped/dragged props
 * rest on it. Top surface sits at y = 0. The collider is deliberately thick
 * (extends well below the visible top) so fast-moving props can't tunnel
 * through it on load. Tapping the top, or props knocking into it, plays a wood
 * "knock". The desk itself is never draggable.
 */
export function Desk() {
  // Where a touch press began, so we can tell a tap from a pan on release.
  const touchStart = useRef<{ id: number; x: number; y: number } | null>(null);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.pointerType !== "touch") {
      // Mouse/pen: click immediately.
      playTap("wood", 0.6);
      return;
    }
    // Touch: defer — a press that turns into a drag pans the camera and should
    // stay silent; only a near-stationary release (a real tap) knocks.
    touchStart.current = {
      id: e.pointerId,
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
    };
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType !== "touch") return;
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || start.id !== e.pointerId) return;
    const moved = Math.hypot(
      e.nativeEvent.clientX - start.x,
      e.nativeEvent.clientY - start.y
    );
    if (moved <= TAP_MOVE_PX) playTap("wood", 0.6);
  };

  const tapHandlers = { onPointerDown, onPointerUp };

  // A prop hit the desk: the desk is static, so read the *other* body's speed
  // and play a throttled wood knock scaled by impact speed (capped at tap level).
  const onImpact = (payload: CollisionPayload) => {
    playVelocityImpact("wood", payload.other.rigidBody?.linvel(), { minSpeed: 0.6 });
  };

  return (
    <group>
      <RigidBody
        type="fixed"
        colliders={false}
        friction={0.9}
        restitution={0.05}
        onCollisionEnter={onImpact}
      >
        {/* Thick collider: top surface at y = 0, but 0.6 deep so nothing tunnels. */}
        <CuboidCollider args={[2.3, 0.3, 0.95]} position={[0, -0.3, 0]} />

        {/* Desk top (visual; top surface at y = 0) */}
        <mesh position={[0, -0.05, 0]} castShadow receiveShadow {...tapHandlers}>
          <boxGeometry args={[4.6, 0.1, 1.9]} />
          <meshStandardMaterial color={palette.deskTop} flatShading />
        </mesh>
      </RigidBody>

      {/* Front edge accent (no collider needed, purely visual) */}
      <mesh position={[0, -0.12, 0.94]} receiveShadow {...tapHandlers}>
        <boxGeometry args={[4.6, 0.06, 0.04]} />
        <meshStandardMaterial color={palette.deskTopDark} flatShading />
      </mesh>

      {/* Trestle-style legs to echo the reference photo */}
      {[
        [-2.0, 0.6],
        [2.0, 0.6],
        [-2.0, -0.6],
        [2.0, -0.6],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.65, z]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 8]} />
          <meshStandardMaterial color={palette.deskLeg} flatShading />
        </mesh>
      ))}

      {/* Cross supports between front/back legs */}
      {[-2.0, 2.0].map((x, i) => (
        <mesh key={i} position={[x, -1.15, 0]} castShadow>
          <boxGeometry args={[0.05, 0.05, 1.3]} />
          <meshStandardMaterial color={palette.deskLeg} flatShading />
        </mesh>
      ))}
    </group>
  );
}
