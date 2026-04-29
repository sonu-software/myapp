import { useNavigate } from "react-router-dom";
import "../styles/about.css";

export default function AboutUs() {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      {/* Background layer */}
      <div className="ai-canvas"></div>

      {/* HEADER */}
      <header className="about-header">
        <h1>About Visual Grab</h1>
        <p>
          Building intelligent systems that transform ideas into impact
        </p>
      </header>

      {/* VISION */}
      <section className="vision-section">
        <div className="vision-image"></div>

        <div className="vision-content">
          <h2>Our Vision</h2>
          <p>
            Visual Grab is an AI-first company focused on creating intelligent
            software that empowers businesses, creators, and innovators.
            We believe AI should be practical, ethical, and deeply human-centric.
          </p>
        </div>
      </section>

      {/* BELIEFS */}
      <section className="belief-section">
        <h2>What Drives Us</h2>

        <div className="belief-cards">
          <div className="card">
            <h3>Human-Centered AI</h3>
            <p>
              Technology should amplify human intelligence, not replace it.
            </p>
          </div>

          <div className="card">
            <h3>Innovation With Purpose</h3>
            <p>
              Every system we build must create measurable real-world value.
            </p>
          </div>

          <div className="card">
            <h3>Ethics & Responsibility</h3>
            <p>
              Responsible AI design is non-negotiable for long-term impact.
            </p>
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="leadership-section">
        <h2>Leadership & Expertise</h2>

        <div className="leader">
          <div className="leader-photo"></div>

          <div className="leader-info">
            <h3>Leadership Team</h3>
            <p>
              Visual Grab is led by professionals with deep expertise in
              artificial intelligence, product engineering, and business
              transformation. Our leadership focuses on bridging advanced AI
              research with practical, scalable solutions.
            </p>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="pillars-section">
        <h2>Our Core Pillars</h2>

        <div className="pillars-grid">
          <div className="pillar">AI-First Thinking</div>
          <div className="pillar">Business Growth Systems</div>
          <div className="pillar">Visual Intelligence</div>
          <div className="pillar">Prompt Engineering</div>
          <div className="pillar">Ethical AI Design</div>
          <div className="pillar">Scalable Architecture</div>
          <div className="pillar">User-Focused Products</div>
          <div className="pillar">Future-Ready Innovation</div>
        </div>
      </section>

      {/* CTA */}
      <footer className="about-cta">
        <h3>Experience AI Built for the Future</h3>

        <button onClick={() => navigate("/home")}>
          Return to AI Control Center
        </button>
      </footer>
    </div>
  );
}
