import "./portfolio.css";

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
          <p className="hero__eyebrow">Portfolio</p>
          <h1 className="hero__title">
            Hi, I&apos;m <span>Andrew</span>.<br />I write code.
          </h1>
          <p className="hero__sub">
            Frontend developer crafting interactive, performant experiences.
            This screen is a real scrollable page living inside a 3D scene.
          </p>
          <p className="scroll-cue">Scroll inside the screen &darr;</p>
        </header>

        <section className="section">
          <p className="section__label">About</p>
          <h2>A short introduction</h2>
          <p>
            Replace this paragraph with your story — what you do, what you care
            about, and the kind of problems you like to solve. Keep it human and
            specific.
          </p>
          <p>
            This content area scrolls independently of the 3D scene, on both
            desktop (mouse wheel) and mobile (touch drag).
          </p>
        </section>

        <section className="section">
          <p className="section__label">Work</p>
          <h2>Selected projects</h2>
          <div className="cards">
            {[1, 2, 3, 4].map((n) => (
              <article className="card" key={n}>
                <h3>Project {n}</h3>
                <p>
                  A one-line description of the project, the stack used, and the
                  outcome or impact it had.
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <p className="section__label">Skills</p>
          <h2>What I work with</h2>
          <div className="tags">
            {["C++", "C#", ".NET", "Python", "Java", "JavaScript", "React", "TypeScript", "Three.js", "Node", "HTML", "CSS", "Vite", "WebGL"].map(
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
            find me on <a href="https://github.com/ankien">GitHub</a> and <a href="https://www.linkedin.com/in/andrew-kien/">LinkedIn</a>.
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
