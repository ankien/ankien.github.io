import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Experience } from "./scene/Experience";
import { useSceneStore } from "./store";

export function App() {
  const muted = useSceneStore((s) => s.muted);
  const toggleMuted = useSceneStore((s) => s.toggleMuted);
  const volume = useSceneStore((s) => s.volume);
  const setVolume = useSceneStore((s) => s.setVolume);

  // Touch devices get a different hint (no mouse wheel; two-finger to look around).
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 1.15, 2.6], fov: 42, near: 0.1, far: 100 }}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>

      <div className="hint">
        {isTouch
          ? "Drag the desk objects \u00B7 two-finger drag to look around \u00B7 tap the keys"
          : "Scroll the monitor \u00B7 drag the desk objects \u00B7 wheel to push/pull \u00B7 tap the keys"}
      </div>

      <div
        style={{
          position: "fixed",
          top: 14,
          right: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(12,18,25,0.6)",
          backdropFilter: "blur(6px)",
          // Sit above drei's full-viewport <Html> container (z-index ~16M).
          zIndex: 2147483647,
        }}
      >
        <button
          onClick={toggleMuted}
          aria-label={muted ? "Unmute" : "Mute"}
          style={{
            width: 28,
            height: 28,
            border: "none",
            background: "transparent",
            color: "#b8c7d6",
            fontSize: 16,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {muted || volume === 0 ? "\u{1F507}" : "\u{1F50A}"}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVolume(v);
            if (muted && v > 0) toggleMuted();
          }}
          aria-label="Sound effects volume"
          style={{ width: 90, accentColor: "#5ad1ff", cursor: "pointer" }}
        />
      </div>
    </>
  );
}
