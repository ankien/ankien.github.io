import { useEffect, useRef } from "react";
import {
  RigidBody,
  BallCollider,
  CapsuleCollider,
  useSphericalJoint,
  type RapierRigidBody,
} from "@react-three/rapier";
import { palette } from "./palette";
import { useDraggable } from "../interaction/useDraggable";

/**
 * A spherical (ball) joint between two bodies. Anchors are positioned to
 * coincide at the rest pose, so the joints start with zero stress.
 *
 * Crucially, we disable contacts between the two *jointed* bodies (the
 * standard video-game ragdoll technique): a limb never collides with the part
 * it hangs from, which removes the constraint-vs-contact fight that made the
 * bear jitter and "spaz". The limb still collides with the world and with
 * non-adjacent parts, so it can't pass through the floor or other props.
 */
function Joint({
  a,
  b,
  anchorA,
  anchorB,
}: {
  a: React.RefObject<RapierRigidBody>;
  b: React.RefObject<RapierRigidBody>;
  anchorA: [number, number, number];
  anchorB: [number, number, number];
}) {
  const joint = useSphericalJoint(a, b, [anchorA, anchorB]);

  useEffect(() => {
    let raf = 0;
    const disableContacts = () => {
      const j = joint.current;
      if (j) {
        j.setContactsEnabled(false);
        return;
      }
      raf = requestAnimationFrame(disableContacts);
    };
    disableContacts();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [joint]);

  return null;
}

/**
 * A cuddly stuffed teddy bear. The torso, head, arms and legs are separate
 * dynamic bodies tied together with ball joints so the limbs dangle under
 * gravity. Each part is individually grab-and-draggable.
 *
 * Stability notes:
 * - Limbs collide with the world and with non-adjacent parts, but NOT with the
 *   part they're jointed to (see Joint) — that's what gives smooth, video-game
 *   ragdoll motion instead of self-collision jitter.
 * - The joints are pre-aligned to the rest pose, so nothing is interpenetrating
 *   or stressed at spawn.
 * - None of the parts carry the collision-sound handler (no `bodyProps`), so
 *   the bear is silent when it bumps into itself; tapping/grabbing still gives
 *   the soft plush sound.
 */
export function TeddyBear({
  position = [-0.85, 0.31, 0.45] as [number, number, number],
}) {
  const torso = useRef<RapierRigidBody>(null);
  const head = useRef<RapierRigidBody>(null);
  const armL = useRef<RapierRigidBody>(null);
  const armR = useRef<RapierRigidBody>(null);
  const legL = useRef<RapierRigidBody>(null);
  const legR = useRef<RapierRigidBody>(null);

  // Each part is draggable on its own. We spread only the pointer `handlers`
  // (drag + grab sound) and deliberately omit `bodyProps` so collisions are
  // silent.
  const torsoDrag = useDraggable({ bodyRef: torso, material: "plush" });
  const headDrag = useDraggable({ bodyRef: head, material: "plush" });
  const armLDrag = useDraggable({ bodyRef: armL, material: "plush" });
  const armRDrag = useDraggable({ bodyRef: armR, material: "plush" });
  const legLDrag = useDraggable({ bodyRef: legL, material: "plush" });
  const legRDrag = useDraggable({ bodyRef: legR, material: "plush" });

  const [bx, , bz] = position;

  // Spawn the bear LYING ON ITS SIDE on the desk. The body was authored
  // standing (spine = +y), so we apply a single rigid rotation of -90° about Z
  // to tip the whole assembly onto its side (spine now runs along +x, broadside
  // to the camera). Because it's a rigid transform, all the ball joints stay
  // satisfied at spawn (no stress). Gravity then lets the upper limbs flop down
  // naturally into a relaxed heap.
  const REST_Y = 0.17; // torso-center height so the down side rests on the desk
  const SIDE_ROT: [number, number, number] = [0, 0, -Math.PI / 2];
  // The head additionally tilts back (chin down, face up) so it reads as a
  // relaxed head-back pose and never folds/tucks into the torso at spawn.
  const HEAD_ROT: [number, number, number] = [0, 0, -Math.PI / 2 + 0.45];
  // Rotate a standing-pose local offset (x,y,z) about Z by -90° -> (y,-x,z),
  // then place it around the spawn point at the resting height.
  const pose = (x: number, y: number, z: number): [number, number, number] => [
    bx + y,
    REST_Y - x,
    bz + z,
  ];

  // Shared body tuning: full collision, no bounce, heavy damping for calm
  // settling, and CCD so fast drags don't tunnel through the desk.
  const part = {
    colliders: false as const,
    ccd: true,
    rotation: SIDE_ROT,
    friction: 0.9,
    restitution: 0,
    linearDamping: 1.6,
    angularDamping: 3.5,
  };

  return (
    <group>
      {/* ---- Torso ---- */}
      <RigidBody ref={torso} position={pose(0, 0, 0)} {...part}>
        <BallCollider args={[0.15]} mass={2} />
        {/* belly */}
        <mesh {...torsoDrag.handlers} castShadow scale={[0.15, 0.16, 0.12]}>
          <sphereGeometry args={[1, 16, 14]} />
          <meshStandardMaterial color={palette.bearFur} flatShading />
        </mesh>
        {/* lighter tummy patch */}
        <mesh position={[0, -0.01, 0.07]} scale={[0.085, 0.1, 0.06]}>
          <sphereGeometry args={[1, 14, 12]} />
          <meshStandardMaterial color={palette.bearSnout} flatShading />
        </mesh>
      </RigidBody>

      {/* ---- Head ---- */}
      <RigidBody ref={head} position={pose(0, 0.32, 0)} {...part} rotation={HEAD_ROT}>
        <BallCollider args={[0.11]} mass={0.5} />
        <mesh {...headDrag.handlers} castShadow scale={[0.12, 0.11, 0.11]}>
          <sphereGeometry args={[1, 18, 16]} />
          <meshStandardMaterial color={palette.bearFur} flatShading />
        </mesh>
        {/* ears */}
        {[-0.08, 0.08].map((x, i) => (
          <mesh key={i} position={[x, 0.09, -0.01]} castShadow scale={0.045}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color={palette.bearFurDark} flatShading />
          </mesh>
        ))}
        {/* snout */}
        <mesh position={[0, -0.02, 0.085]} scale={[0.055, 0.045, 0.05]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color={palette.bearSnout} flatShading />
        </mesh>
        {/* nose */}
        <mesh position={[0, 0.0, 0.13]} scale={0.018}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color={palette.bearNose} flatShading />
        </mesh>
        {/* eyes */}
        {[-0.045, 0.045].map((x, i) => (
          <mesh key={i} position={[x, 0.03, 0.095]} scale={0.014}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color={palette.bearEye} flatShading />
          </mesh>
        ))}
      </RigidBody>

      {/* ---- Left arm ---- */}
      <RigidBody ref={armL} position={pose(-0.2, 0.02, 0)} {...part}>
        <CapsuleCollider args={[0.05, 0.05]} mass={0.3} />
        <mesh {...armLDrag.handlers} castShadow scale={[0.05, 0.085, 0.05]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color={palette.bearFurDark} flatShading />
        </mesh>
        <mesh position={[0, -0.07, 0]} scale={0.035}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={palette.bearSnout} flatShading />
        </mesh>
      </RigidBody>

      {/* ---- Right arm ---- */}
      <RigidBody ref={armR} position={pose(0.2, 0.02, 0)} {...part}>
        <CapsuleCollider args={[0.05, 0.05]} mass={0.3} />
        <mesh {...armRDrag.handlers} castShadow scale={[0.05, 0.085, 0.05]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color={palette.bearFurDark} flatShading />
        </mesh>
        <mesh position={[0, -0.07, 0]} scale={0.035}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={palette.bearSnout} flatShading />
        </mesh>
      </RigidBody>

      {/* ---- Left leg ---- */}
      <RigidBody ref={legL} position={pose(-0.08, -0.2, 0)} {...part}>
        <CapsuleCollider args={[0.04, 0.06]} mass={0.4} />
        <mesh {...legLDrag.handlers} castShadow scale={[0.06, 0.09, 0.06]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color={palette.bearFur} flatShading />
        </mesh>
        <mesh position={[0, -0.075, 0.02]} scale={0.04}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={palette.bearSnout} flatShading />
        </mesh>
      </RigidBody>

      {/* ---- Right leg ---- */}
      <RigidBody ref={legR} position={pose(0.08, -0.2, 0)} {...part}>
        <CapsuleCollider args={[0.04, 0.06]} mass={0.4} />
        <mesh {...legRDrag.handlers} castShadow scale={[0.06, 0.09, 0.06]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color={palette.bearFur} flatShading />
        </mesh>
        <mesh position={[0, -0.075, 0.02]} scale={0.04}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={palette.bearSnout} flatShading />
        </mesh>
      </RigidBody>

      {/* ---- Ball joints (anchors pre-aligned to the rest pose) ---- */}
      <Joint a={torso} b={head} anchorA={[0, 0.18, 0]} anchorB={[0, -0.14, 0]} />
      <Joint a={torso} b={armL} anchorA={[-0.14, 0.07, 0]} anchorB={[0.06, 0.05, 0]} />
      <Joint a={torso} b={armR} anchorA={[0.14, 0.07, 0]} anchorB={[-0.06, 0.05, 0]} />
      <Joint a={torso} b={legL} anchorA={[-0.08, -0.12, 0]} anchorB={[0, 0.08, 0]} />
      <Joint a={torso} b={legR} anchorA={[0.08, -0.12, 0]} anchorB={[0, 0.08, 0]} />
    </group>
  );
}
