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

const BASE_POS = new THREE.Vector3(0, 1.15, 2.6);
const BASE_TARGET = new THREE.Vector3(0, 0.6, -0.6);
// How far the camera may truck/pedestal away from the head-on framing on touch.
const PAN_X = 1.5;
const PAN_Y = 0.45;

/**
 * Head-on camera framing. On desktop it's perfectly static — the camera never
 * drifts or reacts to the pointer. On touch devices, where a portrait screen
 * only shows a narrow vertical slice of the wide desk, a *two-finger* drag
 * trucks/pedestals the camera so you can move around and see the whole scene.
 * Single-finger gestures are left untouched for tapping and dragging the props.
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

  // Two-finger pan — touch only. Mouse/trackpad never produce TouchEvents, so
  // this leaves desktop interaction exactly as it was.
  useEffect(() => {
    const el = gl.domElement;
    let panning = false;
    let lastX = 0;
    let lastY = 0;

    const mid = (t: TouchList) => ({
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2,
    });

    const start = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        panning = true;
        const m = mid(e.touches);
        lastX = m.x;
        lastY = m.y;
      }
    };

    const move = (e: TouchEvent) => {
      if (!panning || e.touches.length < 2) return;
      e.preventDefault();
      const m = mid(e.touches);
      const dx = m.x - lastX;
      const dy = m.y - lastY;
      lastX = m.x;
      lastY = m.y;

      // World units covered by one screen pixel at the look-at plane, so the
      // scene tracks the fingers 1:1 ("grab the world"): drag right reveals the
      // left of the desk, drag down reveals what's above.
      const fov = (camera as THREE.PerspectiveCamera).fov ?? 42;
      const dist = BASE_POS.distanceTo(BASE_TARGET);
      const worldPerPx =
        (2 * Math.tan((fov * Math.PI) / 360) * dist) / size.height;

      pan.current.x = THREE.MathUtils.clamp(
        pan.current.x - dx * worldPerPx,
        -PAN_X,
        PAN_X
      );
      pan.current.y = THREE.MathUtils.clamp(
        pan.current.y + dy * worldPerPx,
        -PAN_Y,
        PAN_Y
      );
      apply();
    };

    const end = (e: TouchEvent) => {
      if (e.touches.length < 2) panning = false;
    };

    el.addEventListener("touchstart", start, { passive: false });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, [gl, camera, size, apply]);

  return null;
}

export function Experience() {
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
        <PCTower />
        <Plants />
        <TeddyBear position={[-1.05, 0.31, 0.25]} />
        <Keyboard />
        <PencilCup />
      </Physics>
    </>
  );
}
