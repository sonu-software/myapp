import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/initializing.css";

export default function Initializing() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const [businessName] = useState("ELEVANTIA AI");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const shouldShow = sessionStorage.getItem("showInit");

    if (!shouldShow) {
      navigate("/home", { replace: true });
      return;
    }

    sessionStorage.removeItem("showInit");

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let particles = [];
    let animationFrame;
    let centerX, centerY;
    let phase = 0;
    let startTime = Date.now();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      centerX = canvas.width / 2;
      centerY = canvas.height / 2;
      initParticles();
    };

    const initParticles = () => {
      particles = [];

      for (let i = 0; i < 900; i++) {
        const edge = Math.floor(Math.random() * 4);

        let x, y;

        if (edge === 0) { x = 0; y = Math.random() * canvas.height; }
        if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
        if (edge === 2) { x = Math.random() * canvas.width; y = 0; }
        if (edge === 3) { x = Math.random() * canvas.width; y = canvas.height; }

        const angle = Math.atan2(centerY - y, centerX - x);
        const speed = Math.random() * 6 + 2;

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 2 + 0.5
        });
      }
    };

    const animate = () => {
      ctx.fillStyle = "rgba(0,0,15,0.25)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const elapsed = Date.now() - startTime;

      if (elapsed > 1000) phase = 1;
      if (elapsed > 2000) phase = 2;
      if (elapsed > 3000) phase = 3;

      particles.forEach((p, i) => {
        const depth = (i % 5) / 5;
        const glowSize = p.size * (1 + depth * 2);

        // Phase 0 – Stream In
        if (phase === 0) {
          p.x += p.vx;
          p.y += p.vy;
        }

        // Phase 1 – Converge
        if (phase === 1) {
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          p.x += dx * 0.05;
          p.y += dy * 0.05;
        }

        // Phase 2 – Robot Formation
        if (phase === 2) {
          const robotScale = 120;
          const headX = centerX;
          const headY = centerY - 100;
          const bodyX = centerX;
          const bodyY = centerY + 20;

          if (i % 3 === 0) {
            p.x += (headX + Math.cos(i) * 60 - p.x) * 0.05;
            p.y += (headY + Math.sin(i) * 60 - p.y) * 0.05;
          } else {
            p.x += (bodyX + Math.cos(i) * robotScale - p.x) * 0.03;
            p.y += (bodyY + Math.sin(i) * robotScale - p.y) * 0.03;
          }
        }

        // Phase 3 – Lift
        if (phase === 3) {
          p.y -= 1.5;
        }

        // Outer glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowSize * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,179,237,${0.05 + depth * 0.1})`;
        ctx.fill();

        // Core particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,220,255,${0.8 - depth * 0.3})`;
        ctx.fill();
      });

      // Neural Links (AI Network Effect)
      if (phase >= 1) {
        for (let i = 0; i < particles.length; i += 15) {
          for (let j = i + 1; j < particles.length; j += 25) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 80) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = "rgba(99,179,237,0.05)";
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      }

      // Growth Beam
      if (phase === 3) {
        const beamHeight = (elapsed - 7000) * 0.6;

        const gradient = ctx.createLinearGradient(
          centerX,
          canvas.height,
          centerX,
          centerY - beamHeight
        );

        gradient.addColorStop(0, "rgba(99,179,237,0)");
        gradient.addColorStop(0.5, "rgba(99,179,237,0.4)");
        gradient.addColorStop(1, "rgba(180,220,255,0.8)");

        ctx.beginPath();
        ctx.moveTo(centerX - 50, canvas.height);
        ctx.lineTo(centerX - 20, centerY - beamHeight);
        ctx.lineTo(centerX + 20, centerY - beamHeight);
        ctx.lineTo(centerX + 50, canvas.height);
        ctx.closePath();

        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationFrame = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    const total = 4500;
    const interval = 16;
    const step = 100 / (total / interval);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);

          document.body.style.transition = "0.4s";
          document.body.style.filter = "brightness(1.6)";

          setTimeout(() => {
            document.body.style.filter = "none";
            document.body.style.transition = "none";
            navigate("/planner", { replace: true });
          }, 500);

          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(progressInterval);
      window.removeEventListener("resize", resize);
    };
  }, [navigate]);

  return (
    <div className="init-wrapper">
      <canvas ref={canvasRef} className="init-canvas" />

      <div className="init-overlay">
        <div className="ai-logo lg thinking">
          <img
            src="/white_elevantia_pace.png"
            alt="AI Core"
            className="ai-logo-img"
          />
        </div>

        <h1 className="init-title">{businessName}</h1>

        <p className="init-sub">
          Activating Autonomous Business Growth Intelligence...
        </p>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="progress-text">
          {Math.floor(progress)}% SYSTEM INITIALIZATION
        </div>
      </div>
    </div>
  );
}
