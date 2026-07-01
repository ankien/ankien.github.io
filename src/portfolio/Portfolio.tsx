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
 * Stub portfolio content rendered as a real, scrollable HTML page that is
 * mapped onto the monitor screen. Replace the copy/sections with your own
 * details later — the layout and scroll behaviour will carry over.
 */
export function Portfolio() {
  return (
    <div className="screen" onWheelCapture={(e) => e.stopPropagation()}>
      <div className="screen__inner">
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
      </div>
    </div>
  );
}
