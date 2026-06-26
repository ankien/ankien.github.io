import { palette } from "./palette";

/**
 * Soft, warm-key lighting. We keep a single shadow-casting light to stay cheap
 * on mobile and rely on ambient + hemisphere fill for the flat cartoon look.
 */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.65} />
      <hemisphereLight args={[palette.sky, palette.floor, 0.6]} />
      <directionalLight
        position={[3.5, 5, 3]}
        intensity={1.4}
        color="#fff3df"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />
      {/* Cool fill from the window side to balance the warm key. */}
      <directionalLight position={[-3, 2.5, 2]} intensity={0.35} color="#cfe8ff" />
    </>
  );
}
