import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Portfolio } from "../portfolio/Portfolio";

// Physical width of the visible screen, in world units, and the pixel width the
// portfolio page is authored at. distanceFactor sizes the 480px page to exactly
// cover SCREEN_W at any camera depth: SCREEN_W * viewportHeightPx / SCREEN_PX_W.
const SCREEN_W = 1.28;
const SCREEN_PX_W = 480;

/**
 * PRESERVED billboard screen (the original, iOS-safe approach). Renders the
 * real portfolio page via drei <Html> in *non-transform* (billboard) mode: a
 * plain 2D overlay (translate3d + scale) that every browser — including iOS
 * Safari — renders and hit-tests correctly. Tradeoffs vs the render-to-texture
 * screen: the flat overlay can't foreshorten with the monitor at pan extremes,
 * and props dragged in front never occlude it. Kept here so we can swap back
 * instantly (see SCREEN_MODE in Monitor.tsx) without losing this working path.
 */
export function MonitorScreenBillboard({
  position = [0, 0.62, 0.03] as [number, number, number],
}) {
  const viewportHeight = useThree((s) => s.size.height);
  const distanceFactor = (SCREEN_W * viewportHeight) / SCREEN_PX_W;

  return (
    <Html
      position={position}
      center
      distanceFactor={distanceFactor}
      style={{ pointerEvents: "auto" }}
    >
      <Portfolio />
    </Html>
  );
}
