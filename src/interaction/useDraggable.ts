import { useRef, useEffect } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import { playTap, playVelocityImpact, type Material } from "./sounds";

interface DraggableOptions {
  /** Rapier body to move. If omitted the object is "tap only" (sound, no drag). */
  bodyRef?: React.RefObject<RapierRigidBody>;
  material: Material;
  /** Disable dragging (e.g. for fixed scenery that should only play a tap). */
  tapOnly?: boolean;
}

const _rayDir = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _point = new THREE.Vector3();
const _target = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _bodyPos = new THREE.Vector3();

const MIN_DIST = 1.2;
const MAX_DIST = 6;

/**
 * Returns pointer handlers that make a Rapier-backed mesh draggable and play a
 * material-specific tap on grab. The object follows the cursor along a ray from
 * the camera, and the mouse wheel pushes it nearer / farther in depth. Works
 * with mouse, touch and pen via pointer events + setPointerCapture.
 */
export function useDraggable({ bodyRef, material, tapOnly }: DraggableOptions) {
  const active = useRef(false);
  const distance = useRef(3);
  const lastPos = useRef(new THREE.Vector3());
  const velocity = useRef(new THREE.Vector3());
  const lastTime = useRef(0);

  // Compute the dragged world position from the current ray + distance, write
  // it to the kinematic body, and track velocity for the throw on release.
  const updateFromRay = () => {
    if (!bodyRef?.current) return;
    _point.copy(_rayDir).multiplyScalar(distance.current).add(_rayOrigin);
    _target.copy(_point).add(_offset);

    const now = performance.now();
    const dt = Math.max(0.001, (now - lastTime.current) / 1000);
    velocity.current.copy(_target).sub(lastPos.current).divideScalar(dt);
    lastPos.current.copy(_target);
    lastTime.current = now;

    bodyRef.current.setNextKinematicTranslation(_target);
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
      updateFromRay();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    playTap(material, 0.6);

    if (tapOnly || !bodyRef?.current) return;

    active.current = true;
    (e.target as Element)?.setPointerCapture?.(e.pointerId);

    const body = bodyRef.current;
    // Freeze the body so it tracks the pointer exactly while held.
    body.setBodyType(2 /* kinematicPosition */, true);

    const t = body.translation();
    _bodyPos.set(t.x, t.y, t.z);

    _rayOrigin.copy(e.ray.origin);
    _rayDir.copy(e.ray.direction).normalize();

    // Distance along the ray to the body's depth, so it doesn't snap on grab.
    distance.current = THREE.MathUtils.clamp(
      _bodyPos.clone().sub(_rayOrigin).dot(_rayDir),
      MIN_DIST,
      MAX_DIST
    );
    _point.copy(_rayDir).multiplyScalar(distance.current).add(_rayOrigin);
    _offset.copy(_bodyPos).sub(_point);

    lastPos.current.copy(_bodyPos);
    lastTime.current = performance.now();
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!active.current || !bodyRef?.current) return;
    e.stopPropagation();
    _rayOrigin.copy(e.ray.origin);
    _rayDir.copy(e.ray.direction).normalize();
    updateFromRay();
  };

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (!active.current || !bodyRef?.current) return;
    e.stopPropagation();
    active.current = false;
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);

    const body = bodyRef.current;
    // Hand control back to the physics solver and impart a throw velocity.
    body.setBodyType(0 /* dynamic */, true);
    const v = velocity.current;
    body.setLinvel(
      {
        x: THREE.MathUtils.clamp(v.x, -6, 6),
        y: THREE.MathUtils.clamp(v.y, -6, 6),
        z: THREE.MathUtils.clamp(v.z, -6, 6),
      },
      true
    );
    body.wakeUp();
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
