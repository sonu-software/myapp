import { useNavigate } from "react-router-dom";
import "../styles/home.css";

const cards = [
  {
    title: "About Us",
    desc: "Learn who we are, what we build, and how our AI solutions help businesses grow smarter and faster.",
    route: "/about",
    icon: "🏢",
  },
  {
    title: "Video Generator",
    desc: "Create high-quality, AI-generated videos tailored for marketing, presentations, and storytelling.",
    route: "/videos",
    icon: "🎬",
  },
  {
    title: "Planner",
    desc: "Design professional-grade visuals and graphics instantly using advanced AI image generation.",
    route: "/planner",
    icon: "🖼️",
  },
  {
    title: "AI Prompt Generator",
    desc: "Generate optimized AI prompts to improve accuracy, creativity, and overall output quality.",
    route: "/business",
    icon: "🧠",
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-wrapper">
      {/* Background effects */}
      <div className="ai-grid" />
      <div className="glow-orb orb-1" />
      <div className="glow-orb orb-2" />

      {/* Header */}
      <header className="home-header">
        <h1>AI Control Center</h1>
        <p>Command your intelligent tools</p>
      </header>

      {/* Card Hand */}
      <div className="card-carousel">
        <div className="card-hand">
          {cards.map((card, index) => (
            <div
              key={index}
              className="ai-card"
              onClick={() => navigate(card.route)}
            >
              <div className="card-icon">{card.icon}</div>
              <h2>{card.title}</h2>
              <p>{card.desc}</p>
              <span className="enter-text">Get Started →</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
