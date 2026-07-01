import { useEffect, useRef } from "react";
import { useThree, useFrame, type ThreeEvent } from "@react-three/fiber";
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

const MIN_DIST = 1.2;
const MAX_DIST = 6;
// Safety caps so pointer jitter can't pump runaway energy into the off-centre
// ball joint (which on touch used to make grabbed props fly up and spin fast).
const MAX_LINVEL = 9;
const MAX_ANGVEL = 10;
// Extra damping applied only while held, so the prop dangles / settles instead
// of whipping around the grab point. Restored to the body's values on release.
const GRAB_LIN_DAMP = 1.2;
const GRAB_ANG_DAMP = 3.0;

const _ndc = new THREE.Vector2();
const _rayDir = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _target = new THREE.Vector3();
const _local = new THREE.Vector3();
const _quat = new THREE.Quaternion();

/**
 * Returns pointer handlers that make a Rapier-backed mesh draggable and play a
 * material-specific tap on grab. Rather than being lifted rigidly, the object
 * is pinned at the exact point you grabbed via a spherical joint to an
 * invisible kinematic "cursor" body, so it *dangles* and swings from that
 * contact point under gravity as you move it around. The mouse wheel pushes it
 * nearer / farther in depth.
 *
 * The grab STARTS from R3F's `onPointerDown` (which gives us the exact contact
 * point + object), but move / release run on plain window pointer listeners
 * with a manual raycast. R3F's own move/up dispatch through captured meshes is
 * unreliable on touch — when the release never reached the object the joint was
 * left attached (prop kept spinning) and the global "grabbing" flag stayed set
 * (camera pan stayed dead). Window listeners fire on every platform.
 *
 * Non-draggable scenery (`tapOnly`) plays a tap on desktop but stays silent on
 * touch, where the same press is used to pan the camera around the desk.
 */
export function useDraggable({ bodyRef, material, tapOnly }: DraggableOptions) {
  const { world, rapier } = useRapier();
  const { camera, gl } = useThree();

  const active = useRef(false);
  const pointerId = useRef<number | null>(null);
  const distance = useRef(3);
  const anchor = useRef<RapierRigidBody | null>(null);
  const joint = useRef<ReturnType<typeof world.createImpulseJoint> | null>(null);
  const prevDamp = useRef<{ lin: number; ang: number } | null>(null);
  const raycaster = useRef(new THREE.Raycaster());

  // Rebuild the pointer ray from raw client coords (robust on touch, where the
  // R3F event's captured-mesh ray isn't reliably delivered).
  const rayFromClient = (clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    _ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(_ndc, camera);
    _rayOrigin.copy(raycaster.current.ray.origin);
    _rayDir.copy(raycaster.current.ray.direction).normalize();
  };

  // Move the invisible cursor body along the current ray at the grab depth; the
  // grabbed object follows via the joint (and lags/swings like a real dangle).
  const moveAnchorToRay = () => {
    if (!anchor.current) return;
    _target.copy(_rayDir).multiplyScalar(distance.current).add(_rayOrigin);
    anchor.current.setNextKinematicTranslation(_target);
  };

  // Fully release the current grab: drop the joint, restore damping, clear the
  // global flag. Safe to call more than once.
  const stopDrag = () => {
    if (!active.current) return;
    active.current = false;
    pointerId.current = null;
    dragState.grabbing = Math.max(0, dragState.grabbing - 1);

    if (joint.current) {
      try {
        world.removeImpulseJoint(joint.current, true);
      } catch {
        /* world already gone */
      }
      joint.current = null;
    }

    const body = bodyRef?.current;
    if (body) {
      if (prevDamp.current) {
        body.setLinearDamping(prevDamp.current.lin);
        body.setAngularDamping(prevDamp.current.ang);
        prevDamp.current = null;
      }
      body.wakeUp();
    }
  };

  // Global move / release / wheel listeners. Attached once; each only reacts to
  // *this* hook's active grab, so releasing always fires no matter where the
  // finger is when it lifts.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!active.current || e.pointerId !== pointerId.current) return;
      rayFromClient(e.clientX, e.clientY);
      moveAnchorToRay();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      stopDrag();
    };
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
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tear down joint + cursor body if the object unmounts mid-drag (e.g. the
  // "reset desk" button remounts every prop).
  useEffect(() => {
    return () => {
      stopDrag();
      if (anchor.current) {
        try {
          world.removeRigidBody(anchor.current);
        } catch {
          /* world already torn down */
        }
        anchor.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  // Clamp runaway velocities each frame while held so the dangle stays a dangle.
  useFrame(() => {
    if (!active.current) return;
    const body = bodyRef?.current;
    if (!body) return;

    const lv = body.linvel();
    const l = Math.hypot(lv.x, lv.y, lv.z);
    if (l > MAX_LINVEL) {
      const s = MAX_LINVEL / l;
      body.setLinvel({ x: lv.x * s, y: lv.y * s, z: lv.z * s }, true);
    }

    const av = body.angvel();
    const a = Math.hypot(av.x, av.y, av.z);
    if (a > MAX_ANGVEL) {
      const s = MAX_ANGVEL / a;
      body.setAngvel({ x: av.x * s, y: av.y * s, z: av.z * s }, true);
    }
  });

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const isTouch = e.pointerType === "touch";

    // Tap-only scenery (or a hook with no body): tick on desktop, but stay
    // silent on touch so this press pans the viewport instead of "clicking".
    if (tapOnly || !bodyRef?.current) {
      if (!isTouch) playTap(material, 0.6);
      return;
    }

    // Ignore extra fingers once a grab is under way.
    if (active.current) return;

    playTap(material, 0.6);
    active.current = true;
    pointerId.current = e.pointerId;
    dragState.grabbing++;

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

    // Boost damping while held so it dangles instead of whipping; restored later.
    prevDamp.current = { lin: body.linearDamping(), ang: body.angularDamping() };
    body.setLinearDamping(GRAB_LIN_DAMP);
    body.setAngularDamping(GRAB_ANG_DAMP);

    // Invisible kinematic "cursor" body, placed at the pivot.
    if (!anchor.current) {
      anchor.current = world.createRigidBody(
        rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y, p.z)
      );
    } else {
      anchor.current.setTranslation({ x: p.x, y: p.y, z: p.z }, true);
      anchor.current.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
    }

    // Drop any stale joint, then pin the grabbed point to the cursor. The rest
    // of the body hangs below and swings under gravity — a dangle, not a lift.
    if (joint.current) {
      try {
        world.removeImpulseJoint(joint.current, true);
      } catch {
        /* already gone */
      }
      joint.current = null;
    }
    joint.current = world.createImpulseJoint(
      rapier.JointData.spherical(
        { x: 0, y: 0, z: 0 },
        { x: _local.x, y: _local.y, z: _local.z }
      ),
      anchor.current,
      body,
      true
    );
  };

  // Only the grab start is an R3F handler now; movement + release are global.
  const handlers = {
    onPointerDown,
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
