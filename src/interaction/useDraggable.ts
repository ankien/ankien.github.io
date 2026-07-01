import { useEffect, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useRapier, type RapierRigidBody } from "@react-three/rapier";
import { playTap, playVelocityImpact, type Material } from "./sounds";
import { dragState } from "./dragState";

interface DraggableOptions {
  /** Rapier body to move. If omitted the object is "tap only" (sound, no drag). */
  bodyRef?: React.RefObject<RapierRigidBody>;
  material: Material;
  /** Disable dragging (e.g. for fixed scenery that should only play a tap). */
  tapOnly?: boolean;
}

const _rayDir = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _target = new THREE.Vector3();
const _local = new THREE.Vector3();
const _quat = new THREE.Quaternion();

const MIN_DIST = 1.2;
const MAX_DIST = 6;

/**
 * Returns pointer handlers that make a Rapier-backed mesh draggable and play a
 * material-specific tap on grab. Rather than being lifted rigidly, the object
 * is pinned at the exact point you grabbed via a spherical joint to an
 * invisible kinematic "cursor" body, so it *dangles* and swings from that
 * contact point under gravity as you move it around. The mouse wheel pushes it
 * nearer / farther in depth. Works with mouse, touch and pen via pointer events.
 *
 * Non-draggable scenery (`tapOnly`) plays a tap on desktop but stays silent on
 * touch, where the same press is used to pan the camera around the desk.
 */
export function useDraggable({ bodyRef, material, tapOnly }: DraggableOptions) {
  const { world, rapier } = useRapier();
  const active = useRef(false);
  const distance = useRef(3);
  const anchor = useRef<RapierRigidBody | null>(null);
  const joint = useRef<ReturnType<typeof world.createImpulseJoint> | null>(null);

  // Move the invisible cursor body along the current ray at the grab depth; the
  // grabbed object follows via the joint (and lags/swings like a real dangle).
  const moveAnchorToRay = () => {
    if (!anchor.current) return;
    _target.copy(_rayDir).multiplyScalar(distance.current).add(_rayOrigin);
    anchor.current.setNextKinematicTranslation(_target);
  };

  // Wheel handler (window-level so it works even when the pointer is captured
  // and not moving). Active only while dragging an object.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!active.current) return;
      e.preventDefault();
      distance.current = THREE.MathUtils.clamp(
        distance.current + e.deltaY * 0.0016,
        MIN_DIST,
        MAX_DIST
      );
      moveAnchorToRay();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tear down the joint + cursor body if the object unmounts mid-drag (e.g. the
  // "reset desk" button remounts every prop).
  useEffect(() => {
    return () => {
      if (joint.current) {
        try {
          world.removeImpulseJoint(joint.current, true);
        } catch {
          /* world already torn down */
        }
        joint.current = null;
      }
      if (anchor.current) {
        try {
          world.removeRigidBody(anchor.current);
        } catch {
          /* world already torn down */
        }
        anchor.current = null;
      }
      if (active.current) {
        active.current = false;
        dragState.grabbing = Math.max(0, dragState.grabbing - 1);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const isTouch = e.pointerType === "touch";

    // Tap-only scenery (or a hook with no body): tick on desktop, but stay
    // silent on touch so this press pans the viewport instead of "clicking".
    if (tapOnly || !bodyRef?.current) {
      if (!isTouch) playTap(material, 0.6);
      return;
    }

    playTap(material, 0.6);
    active.current = true;
    dragState.grabbing++;
    (e.target as Element)?.setPointerCapture?.(e.pointerId);

    const body = bodyRef.current;
    body.wakeUp();

    // The world-space point actually under the cursor becomes the pivot.
    const p = e.point;
    _rayOrigin.copy(e.ray.origin);
    _rayDir.copy(e.ray.direction).normalize();
    distance.current = THREE.MathUtils.clamp(
      _target.copy(p).sub(_rayOrigin).dot(_rayDir),
      MIN_DIST,
      MAX_DIST
    );

    // Express that pivot in the body's local frame for the joint's anchor.
    const bt = body.translation();
    const br = body.rotation();
    _quat.set(br.x, br.y, br.z, br.w).invert();
    _local.set(p.x - bt.x, p.y - bt.y, p.z - bt.z).applyQuaternion(_quat);

    // Invisible kinematic "cursor" body, placed at the pivot.
    if (!anchor.current) {
      const desc = rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(
        p.x,
        p.y,
        p.z
      );
      anchor.current = world.createRigidBody(desc);
    } else {
      anchor.current.setTranslation({ x: p.x, y: p.y, z: p.z }, true);
      anchor.current.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
    }

    // Ball joint pinning the grabbed point to the cursor: the rest of the body
    // hangs below and swings under gravity — a dangle rather than a rigid lift.
    const params = rapier.JointData.spherical(
      { x: 0, y: 0, z: 0 },
      { x: _local.x, y: _local.y, z: _local.z }
    );
    joint.current = world.createImpulseJoint(params, anchor.current, body, true);
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!active.current) return;
    e.stopPropagation();
    _rayOrigin.copy(e.ray.origin);
    _rayDir.copy(e.ray.direction).normalize();
    moveAnchorToRay();
  };

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (!active.current) return;
    e.stopPropagation();
    active.current = false;
    dragState.grabbing = Math.max(0, dragState.grabbing - 1);
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);

    // Release the pivot; the body keeps its current swing velocity as the throw.
    if (joint.current) {
      world.removeImpulseJoint(joint.current, true);
      joint.current = null;
    }
    bodyRef?.current?.wakeUp();
  };

  // Pointer capture means we also need to honor `pointercancel`.
  const handlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  // Props to spread on the RigidBody so contacts play a throttled tap. We read
  // the body's own speed and ignore tiny resting jitters so only real knocks
  // make noise. Loudness scales with impact speed and is capped at the normal
  // tap volume (0.6), so a fast collision is at most as loud as tapping.
  const bodyProps = {
    onCollisionEnter: () => {
      playVelocityImpact(material, bodyRef?.current?.linvel());
    },
  };

  return { handlers, bodyProps };
}
