import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";

export default function Signup() {
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("signup");

  async function handleSignup(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      const res = await fetch(`${API}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mobile, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail || "Signup failed");
        return;
      }

      navigate("/");

    } catch (err) {
      console.error(err);
      setMessage("Server not reachable");
    }
  }

  return (
    <div className="login-container">

      <div className="left-panel">
        <div className="image-wrapper">
          <img
            src="/login_background.jpeg"
            alt="AI Technology"
            className="ai-image"
          />
        </div>
      </div>

      <div className="right-panel">
        <div className="login-card">

          <div className="logo-section">
            <img src="/colour_elevantia_pace.png" alt="Visual Grab Logo" className="logo" />
          </div>

          <h1 className="welcome-title">Create Your Account</h1>

          {/* TOGGLE */}
          <div className="auth-toggle">
            <button
              type="button"
              className={activeTab === "login" ? "active" : ""}
              onClick={() => {
                setActiveTab("login");
                navigate("/");
              }}
            >
              Sign In
            </button>

            <button
              type="button"
              className={activeTab === "signup" ? "active" : ""}
              onClick={() => {
                setActiveTab("signup");
                navigate("/signup");
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSignup} className="login-form">

            {/* Email */}
            <div className="input-wrapper">
              <div className="input-icon">📧</div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
              />
            </div>

            {/* Mobile */}
            <div className="input-wrapper">
              <div className="input-icon">📱</div>
              <input
                type="text"
                placeholder="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                className="form-input"
              />
            </div>

            {/* Password */}
            <div className="input-wrapper">
              <div className="input-icon">🔒</div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input password-input"
              />
            </div>

            {/* Confirm Password */}
            <div className="input-wrapper">
              <div className="input-icon">🔒</div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="form-input password-input"
              />
            </div>

            {message && <p className="error-message">{message}</p>}

            <button type="submit" className="login-button">
              CREATE ACCOUNT
            </button>

          </form>

        </div>
      </div>
    </div>
  );
}
