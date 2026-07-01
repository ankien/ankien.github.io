import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import html2canvas from "html2canvas";
import { PortfolioContent } from "../portfolio/Portfolio";
import { dragState } from "../interaction/dragState";

// The screen mesh's world size (matches the bezel opening) and the CSS pixel
// geometry the portfolio page is authored at. WINDOW_H is the slice of the tall
// page that's visible on the 4:3 screen at once.
const SCREEN_W = 1.28;
const SCREEN_H = 0.96;
const PAGE_W = 480;
const WINDOW_H = 360;
// Supersample the rasterization so text stays crisp when the plane is close.
const CAPTURE_SCALE = 2;
// Finger/wheel pixels -> page scroll pixels.
const SCROLL_SPEED = 1.4;
const WHEEL_SPEED = 1;
// A release that moved less than this counts as a tap (for link hit-testing).
const TAP_MOVE_PX = 8;

type LinkHit = {
  href: string;
  target: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Render-to-texture portfolio screen. The real portfolio HTML is rendered into
 * an off-screen DOM node, rasterized to a canvas with html2canvas, and mapped
 * onto a genuine 3D plane. Because it's real geometry (not a DOM overlay) it
 * gets correct perspective + depth occlusion for free, and there is NO CSS
 * matrix3d element for iOS Safari to mis-render or mis-hit-test.
 *
 * Interaction is reconstructed manually: scrolling shifts the texture's UV
 * offset (wheel + one-finger drag), and taps raycast the plane, convert the hit
 * UV to a page coordinate, and open whichever link was under the finger.
 */
export function MonitorScreenTexture({
  position = [0, 0.62, 0.03] as [number, number, number],
}) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  const texRef = useRef<THREE.CanvasTexture | null>(null);
  const pageHeight = useRef(WINDOW_H);
  const maxScroll = useRef(0);
  const scroll = useRef(0);
  const links = useRef<LinkHit[]>([]);

  // Active pointer gesture (scroll drag).
  const dragging = useRef(false);
  const grabbed = useRef(false);
  const activePointer = useRef<number | null>(null);
  const startClientY = useRef(0);
  const startClientX = useRef(0);
  const startScroll = useRef(0);
  const moved = useRef(0);

  const applyScroll = (value: number) => {
    const tex = texRef.current;
    scroll.current = THREE.MathUtils.clamp(value, 0, maxScroll.current);
    if (!tex) return;
    const fullH = pageHeight.current;
    tex.offset.set(0, (fullH - WINDOW_H - scroll.current) / fullH);
  };

  // Render the portfolio off-screen (via its own react-dom root so it lives in
  // the DOM reconciler, not R3F's), rasterize it once, and build the texture.
  useEffect(() => {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    container.style.width = `${PAGE_W}px`;
    container.style.pointerEvents = "none";
    container.setAttribute("aria-hidden", "true");
    document.body.appendChild(container);

    const root: Root = createRoot(container);
    root.render(
      <div className="screen screen--capture">
        <div className="screen__inner">
          <PortfolioContent />
        </div>
      </div>
    );

    let cancelled = false;
    let tex: THREE.CanvasTexture | null = null;

    (async () => {
      try {
        // Wait for fonts + a couple of paints so layout is final before capture.
        await (document as unknown as { fonts?: { ready?: Promise<unknown> } })
          .fonts?.ready;
      } catch {
        /* fonts API unavailable — ignore */
      }
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      );
      if (cancelled) return;

      const capture = container.firstElementChild as HTMLElement | null;
      if (!capture) return;

      const fullH = capture.scrollHeight;
      pageHeight.current = fullH;
      maxScroll.current = Math.max(0, fullH - WINDOW_H);

      // Record every link's rect in page pixels (relative to the page top-left)
      // so taps can be mapped back to the right href.
      const base = capture.getBoundingClientRect();
      links.current = Array.from(capture.querySelectorAll("a")).map((a) => {
        const r = a.getBoundingClientRect();
        return {
          href: a.href,
          target: a.target,
          x: r.left - base.left,
          y: r.top - base.top,
          w: r.width,
          h: r.height,
        };
      });

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(capture, {
          backgroundColor: null,
          scale: CAPTURE_SCALE,
          width: PAGE_W,
          height: fullH,
          windowWidth: PAGE_W,
          logging: false,
        });
      } catch (err) {
        console.error("[MonitorScreenTexture] rasterization failed", err);
        return;
      }
      if (cancelled) return;

      tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(1, WINDOW_H / fullH);
      texRef.current = tex;
      applyScroll(scroll.current);
      setTexture(tex);
    })();

    return () => {
      cancelled = true;
      root.unmount();
      container.remove();
      tex?.dispose();
      texRef.current = null;
    };
  }, []);

  // Continue / end a scroll drag on window listeners so it keeps tracking even
  // when the finger leaves the plane, and always releases the pan lock.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || e.pointerId !== activePointer.current) return;
      const dx = e.clientX - startClientX.current;
      const dy = e.clientY - startClientY.current;
      moved.current = Math.max(moved.current, Math.hypot(dx, dy));
      applyScroll(startScroll.current - dy * SCROLL_SPEED);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== activePointer.current) return;
      dragging.current = false;
      activePointer.current = null;
      if (grabbed.current) {
        dragState.grabbing = Math.max(0, dragState.grabbing - 1);
        grabbed.current = false;
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (grabbed.current) {
        dragState.grabbing = Math.max(0, dragState.grabbing - 1);
        grabbed.current = false;
      }
    };
  }, []);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    dragging.current = true;
    activePointer.current = e.pointerId;
    startClientX.current = e.nativeEvent.clientX;
    startClientY.current = e.nativeEvent.clientY;
    startScroll.current = scroll.current;
    moved.current = 0;
    // Block the camera pan (Experience gates on dragState.grabbing === 0) while
    // the finger is interacting with the screen.
    dragState.grabbing += 1;
    grabbed.current = true;
  };

  const onWheel = (e: ThreeEvent<WheelEvent>) => {
    e.stopPropagation();
    applyScroll(scroll.current + e.nativeEvent.deltaY * WHEEL_SPEED);
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (moved.current > TAP_MOVE_PX || !e.uv) return; // a scroll, not a tap
    const pageX = e.uv.x * PAGE_W;
    const pageY = scroll.current + (1 - e.uv.y) * WINDOW_H;
    for (const l of links.current) {
      if (
        pageX >= l.x &&
        pageX <= l.x + l.w &&
        pageY >= l.y &&
        pageY <= l.y + l.h
      ) {
        window.open(l.href, l.target || "_self");
        break;
      }
    }
  };

  if (!texture) return null;

  return (
    <mesh
      position={position}
      onPointerDown={onPointerDown}
      onWheel={onWheel}
      onClick={onClick}
    >
      <planeGeometry args={[SCREEN_W, SCREEN_H]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
