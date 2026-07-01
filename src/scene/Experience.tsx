import { useCallback, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { Lighting } from "./Lighting";
import { Room } from "./Room";
import { Desk } from "./Desk";
import { Monitor } from "./Monitor";
import { PCTower } from "./PCTower";
import { Plants } from "./Plants";
import { TeddyBear } from "./TeddyBear";
import { Keyboard } from "./Keyboard";
import { PencilCup } from "./PencilCup";
import { dragState } from "../interaction/dragState";
import { useSceneStore } from "../store";

const BASE_POS = new THREE.Vector3(0, 1.15, 2.6);
const BASE_TARGET = new THREE.Vector3(0, 0.6, -0.6);
// How far the camera may truck/pedestal away from the head-on framing on touch.
const PAN_X = 1.5;
const PAN_Y = 0.45;

/**
 * Head-on camera framing. On desktop it's perfectly static — the camera never
 * drifts or reacts to the pointer. On touch devices, where a portrait screen
 * only shows a narrow vertical slice of the wide desk, a single-finger press on
 * scenery or empty space (anything that isn't a draggable prop) trucks/pedestals
 * the camera so you can move around and see the whole scene. Presses that grab a
 * prop are left to the drag instead.
 */
function CameraRig() {
  const { camera, gl, size } = useThree();
  const pan = useRef({ x: 0, y: 0 });

  const apply = useCallback(() => {
    camera.position.set(
      BASE_POS.x + pan.current.x,
      BASE_POS.y + pan.current.y,
      BASE_POS.z
    );
    camera.lookAt(
      BASE_TARGET.x + pan.current.x,
      BASE_TARGET.y + pan.current.y,
      BASE_TARGET.z
    );
    camera.updateProjectionMatrix();
  }, [camera]);

  // Establish the base framing, and keep it correct across viewport resizes.
  useEffect(() => {
    apply();
  }, [apply, size]);

  // Single-finger pan — touch only. Mouse/trackpad never produce touch pointer
  // events, so desktop interaction is left exactly as it was. We wait for a
  // little movement before deciding: if a prop grab started (dragState), the
  // gesture belongs to the drag; otherwise it pans the camera 1:1 with the
  // finger ("grab the world").
  useEffect(() => {
    const el = gl.domElement;
    let id: number | null = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let decided = false;
    let panning = false;

    const worldPerPx = () => {
      const fov = (camera as THREE.PerspectiveCamera).fov ?? 42;
      const dist = BASE_POS.distanceTo(BASE_TARGET);
      return (2 * Math.tan((fov * Math.PI) / 360) * dist) / size.height;
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || id !== null) return;
      id = e.pointerId;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      decided = false;
      panning = false;
    };

    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      if (!decided) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < 8) return;
        decided = true;
        // Only pan if this gesture isn't dragging a prop.
        panning = dragState.grabbing === 0;
      }
      if (!panning) return;
      const k = worldPerPx();
      pan.current.x = THREE.MathUtils.clamp(
        pan.current.x - (e.clientX - lastX) * k,
        -PAN_X,
        PAN_X
      );
      pan.current.y = THREE.MathUtils.clamp(
        pan.current.y + (e.clientY - lastY) * k,
        -PAN_Y,
        PAN_Y
      );
      lastX = e.clientX;
      lastY = e.clientY;
      apply();
    };

    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      decided = false;
      panning = false;
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl, camera, size, apply]);

  return null;
}

export function Experience() {
  // Bumping this key remounts every movable prop, snapping them back to their
  // starting positions (the "reset desk" button in the UI).
  const resetNonce = useSceneStore((s) => s.resetNonce);

  return (
    <>
      <color attach="background" args={["#0e141b"]} />
      <fog attach="fog" args={["#0e141b", 9, 22]} />

      <CameraRig />
      <Lighting />

      <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
        <Room />
        <Desk />
        <Monitor />
        <group key={resetNonce}>
          <PCTower />
          <Plants />
          <TeddyBear position={[-1.05, 0.31, 0.25]} />
          <Keyboard />
          <PencilCup />
        </group>
      </Physics>
    </>
  );
}
