import { useEffect, useRef } from "react";
import "./portfolio.css";

type Project = {
  id: number;
  title: string;
  description: string;
};

const projects: Project[] = [
  {
    id: 1,
    title: "Firmware Analysis Framework",
    description: "Developed a firmware analysis framework using binary analysis techniques, containerization, REST APIs, and PostgreSQL integration.",
  },
  {
    id: 2,
    title: "ZeroGBA",
    description: "Built a high-performance Game Boy Advance emulator featuring a custom SIMD software renderer, ARM/THUMB interpreter optimizations, and full hardware emulation.",
  },
  {
    id: 3,
    title: "This website!",
    description: "Developed and designed this 3D website to showcase projects, skills, and information in an interactive and appealing manner.",
  },
  {
    id: 4,
    title: "OpenGL Renderer",
    description: "Created a 3D graphics renderer featuring shader-based rendering, texture mapping, and phong lighting for realistic scene rendering.",
  },
];

/**
 * Stub portfolio content rendered as a real HTML page mapped onto the monitor
 * screen. It scrolls via a transform we drive ourselves (mouse wheel on
 * desktop, one-finger drag on touch) instead of a native `overflow` scroller:
 * a native scroll container inside drei's <Html transform> (matrix3d /
 * preserve-3d) is mis-rendered by iOS Safari — the content is displaced
 * downward, leaving a blank band on top and spilling past the bottom bezel.
 * Driving a plain translateY keeps the page glued correctly to the screen.
 */
export function Portfolio() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);

  useEffect(() => {
    const vp = viewportRef.current;
    const inner = innerRef.current;
    if (!vp || !inner) return;

    let maxOffset = 0;
    const apply = () => {
      inner.style.transform = `translateY(${-offset.current}px)`;
    };
    const setOffset = (value: number) => {
      offset.current = Math.min(maxOffset, Math.max(0, value));
      apply();
    };
    const recompute = () => {
      maxOffset = Math.max(0, inner.scrollHeight - vp.clientHeight);
      setOffset(offset.current);
    };

    // Mouse wheel (desktop). preventDefault + stopPropagation so the wheel
    // scrolls the page and never reaches the canvas (which uses wheel to
    // push/pull grabbed props).
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOffset(offset.current + e.deltaY);
    };

    // One-finger drag to scroll (touch). Tracked by identifier so it doesn't
    // fight multi-touch. We only consume the gesture once it clearly moves
    // vertically, and stop propagation so it never bubbles out to the camera.
    let touchId: number | null = null;
    let startY = 0;
    let startOffset = 0;
    const findTouch = (list: TouchList) => {
      for (let i = 0; i < list.length; i++) {
        if (list[i].identifier === touchId) return list[i];
      }
      return null;
    };
    const onTouchStart = (e: TouchEvent) => {
      if (touchId !== null) return;
      const t = e.changedTouches[0];
      if (!t) return;
      touchId = t.identifier;
      startY = t.clientY;
      startOffset = offset.current;
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = findTouch(e.changedTouches);
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      setOffset(startOffset - (t.clientY - startY));
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (findTouch(e.changedTouches)) touchId = null;
    };

    vp.addEventListener("wheel", onWheel, { passive: false });
    vp.addEventListener("touchstart", onTouchStart, { passive: false });
    vp.addEventListener("touchmove", onTouchMove, { passive: false });
    vp.addEventListener("touchend", onTouchEnd);
    vp.addEventListener("touchcancel", onTouchEnd);

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(inner);
    ro.observe(vp);

    return () => {
      vp.removeEventListener("wheel", onWheel);
      vp.removeEventListener("touchstart", onTouchStart);
      vp.removeEventListener("touchmove", onTouchMove);
      vp.removeEventListener("touchend", onTouchEnd);
      vp.removeEventListener("touchcancel", onTouchEnd);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="screen">
      <div className="screen__viewport" ref={viewportRef}>
        <div className="screen__inner" ref={innerRef}>
          <PortfolioContent />
        </div>
      </div>
    </div>
  );
}

/**
 * The raw portfolio markup, with no scroll container or wrapper. Shared by the
 * billboard <Html> screen (wrapped in .screen/.screen__viewport above) and the
 * render-to-texture screen (rasterized to a texture — see MonitorScreenTexture).
 */
export function PortfolioContent() {
  return (
    <>
          <header className="hero">
            <h1 className="hero__title">
              Hi, I&apos;m <span>Andrew</span>.<br />I write code.
            </h1>
            <p className="hero__sub">
              Software Engineer experienced in Full-Stack, Reverse Engineering,
              Code Optimization, and Strategic Communication.
            </p>
            <p className="scroll-cue">Scroll inside the screen &darr;</p>
          </header>

          <section className="section">
            <p className="section__label">About</p>
            <h2>An introduction</h2>
            <p>
              6+ years of professional experience and a Bachelor's degree in Computer Science from the University of North Florida. <br/> <br/>
              My background includes offensive security research at Raytheon, full-stack engineering for the live television feed software at US Open 2022 and other tennis events, and co-authoring the IEEE paper <i>Fingerprinting Bots in a Hybrid Honeypot</i>. <br/> <br/>
              Outside of work, I enjoy gaming, exercising, going outdoors, and building personal software projects.
            </p>
          </section>

          <section className="section">
            <p className="section__label">Work</p>
            <h2>My projects</h2>
            <div className="cards">
              {projects.map((project) => (
                <article className="card" key={project.id}>
                  <h3>{project.title}</h3>
                  <p>
                    {project.description}
                  </p>
                </article>
              ))}
            </div>
            <p>
              <br></br>View my work on <a target="_blank" href="https://github.com/ankien">GitHub</a>.
            </p>
          </section>

          <section className="section">
            <p className="section__label">Skills</p>
            <h2>Non-exhaustive list</h2>
            <div className="tags">
              {["C++", "C#", ".NET", "Python", "Java", "JavaScript", "React", "TypeScript", "Three.js", "Node", "HTML", "CSS", "Vite", "OpenGL"].map(
                (t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                )
              )}
            </div>
          </section>

          <section className="section contact">
            <p className="section__label">Contact</p>
            <h2>Let&apos;s talk</h2>
            <p>
              Email me at <a href="mailto:andrewkien01@gmail.com">andrewkien01@gmail.com</a> or
              find me on <a target="_blank" href="https://www.linkedin.com/in/andrew-kien/">LinkedIn</a>.
            </p>
          </section>

          <footer className="footer">
            &copy; {new Date().getFullYear()} Andrew Kien &middot; Built with React,
            Three.js &amp; Rapier.
          </footer>
    </>
  );
}
