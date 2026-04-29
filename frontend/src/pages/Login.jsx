import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const [email, setEmail]                         = useState("");
  const [mobile, setMobile]                       = useState("");
  const [password, setPassword]                   = useState("");
  const [confirmPassword, setConfirmPassword]     = useState("");
  const [message, setMessage]                     = useState("");
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab]                 = useState("login");
  const [isLoading, setIsLoading]                 = useState(false);

  const [step, setStep] = useState("signup");
  const [otp, setOtp] = useState("");

  const [mode, setMode] = useState("normal"); // normal | forgot
  const [forgotStep, setForgotStep] = useState("email"); // email | otp

  /* ── LOGIN ── */
  async function handleLogin(e) {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {

      // Try admin login first
      const adminRes = await fetch(`${API}/admin/login`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ email, password })
      });

      if (adminRes.ok) {
        const data = await adminRes.json();

        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("admin", "true");

        navigate("/admin",{ replace:true });
        return;
      }

      // Otherwise try normal user login
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail || "Authentication failed");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role","user");

      sessionStorage.setItem("showInit", "true");

      navigate("/initializing", { replace: true });

    } catch {
      setMessage("Network connection lost");
    }

    setIsLoading(false);
  }



  async function handleVerifyOtp(e) {
    e.preventDefault();

    const res = await fetch(`${API}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.detail);
      return;
    }

    setActiveTab("login");
    setStep("signup");
    setMessage("Account created successfully");
  }




  /* ── SIGNUP ── */
  async function handleSignup(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    setIsLoading(true);        // ✅ ADD THIS
    setMessage("Sending OTP...");  // ✅ ADD THIS

    try {
      const res = await fetch(`${API}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mobile, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail);
        setIsLoading(false);   // ✅ IMPORTANT
        return;
      }

      setStep("otp");
      setMessage("OTP Sent to Your Email");

    } catch {
      setMessage("Network error");
    }

    setIsLoading(false);       // ✅ ADD THIS
  }




  async function handleForgotSendOtp(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setMessage("Sending OTP...");

    try {
      const res = await fetch(`${API}/forgot-password/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail);
        setIsLoading(false);
        return;
      }

      setForgotStep("otp");
      setMessage("OTP Sent to Your Email");

    } catch {
      setMessage("Network error");
    }

    setIsLoading(false);
  }



  async function handleResetPassword(e) {
    e.preventDefault();

    setIsLoading(true);
    setMessage("Resetting password...");

    try {
      const res = await fetch(`${API}/forgot-password/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          otp,
          new_password: password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail);
        setIsLoading(false);
        return;
      }

      setMode("normal");
      setForgotStep("email");
      setMessage("Password reset successful. Please login.");

    } catch {
      setMessage("Network error");
    }

    setIsLoading(false);
  }











  const switchTab = (tab) => {
    setActiveTab(tab);

    // ✅ RESET ALL STATES
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setStep("signup");

    // 🔥 IMPORTANT FIX
    setMode("normal");
    setForgotStep("email");
    setOtp("");
  };

  return (
    <div className="lp-page">
      <div className="lp-card-wrapper">

        {/* LEFT BOX — image */}
        <div className="lp-img-box">
          <img src="/login_background.jpeg" alt="AI" className="lp-img" />
        </div>

        {/* RIGHT BOX — form */}
        <div className="lp-form-box">

          {/* Logo + Tagline */}
          <div className="lp-logo-row">
            <img src="/colour_elevantia_pace.png" alt="ElevantiaPace" className="lp-logo" />
            <p className="lp-tagline">AI-Driven Marketing for Business Growth</p>
          </div>

          {/* Tab toggle */}
          <div className="lp-tabs">
            <button
              type="button"
              className={`lp-tab ${activeTab === "login" ? "lp-tab--active" : ""}`}
              onClick={() => switchTab("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`lp-tab ${activeTab === "signup" ? "lp-tab--active" : ""}`}
              onClick={() => switchTab("signup")}
            >
              Sign Up
            </button>
          </div>

          {/* Animated section — key forces remount on tab switch */}
          <div key={activeTab} className="lp-animated">

            {mode === "forgot" && (
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: "#6b7280",
                  fontSize: "13px",
                  marginBottom: "10px",
                  cursor: "pointer"
                }}
                onClick={() => {
                  setMode("normal");
                  setForgotStep("email");
                  setMessage("");
                }}
              >
                ← Back to Login
              </button>
            )}




            <form className="lp-form" onSubmit={
              mode === "forgot"
                ? forgotStep === "email"
                  ? handleForgotSendOtp
                  : handleResetPassword
                : activeTab === "login"
                ? handleLogin
                : step === "signup"
                ? handleSignup
                : handleVerifyOtp
            }>

              {/* Email */}
              <div className="lp-field">
                <span className="lp-field-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  className="lp-input"
                  type="text"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>


              {activeTab === "login" && mode === "forgot" && forgotStep === "email" && (
                <>
                  {/* New Password */}
                  <div className="lp-field">
                    <span className="lp-field-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>

                    <input
                      className="lp-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="New Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />

                    <button type="button" className="lp-eye" onClick={() => setShowPassword(p => !p)}>
                      {showPassword
                        ? <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 1l22 22"/>
                            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.73 21.73 0 0 1 5.06-6.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.82 21.82 0 0 1-4.36 5.94"/>
                          </svg>
                        : <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                      }
                    </button>
                  </div>

                  {/* Confirm Password */}
                  <div className="lp-field">
                    <span className="lp-field-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>

                    <input
                      className="lp-input"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />

                    <button type="button" className="lp-eye" onClick={() => setShowConfirmPassword(p => !p)}>
                      {showConfirmPassword
                        ? <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 1l22 22"/>
                            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.73 21.73 0 0 1 5.06-6.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.82 21.82 0 0 1-4.36 5.94"/>
                          </svg>
                        : <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                      }
                    </button>
                  </div>
                </>
              )}







              {/* Mobile — signup*/}
              {activeTab === "signup" && step === "signup" && (
                <div className="lp-field">
                  <span className="lp-field-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>
                  </span>
                  <input
                    className="lp-input"
                    type="text"
                    placeholder="Mobile Number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Password */}
              {mode !== "forgot" && (
                <div className="lp-field">
                  <span className="lp-field-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    className="lp-input"
                    type={showPassword ? "text" : "password"}
                    placeholder={activeTab === "login" ? "Password" : "Create Password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="lp-eye" onClick={() => setShowPassword(p => !p)}>
                    {showPassword
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l22 22"/><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.73 21.73 0 0 1 5.06-6.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.82 21.82 0 0 1-4.36 5.94"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                )}

              {activeTab === "login" && mode === "normal" && (
                <div className="lp-forgot-row">
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#1e4a7a",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      setMode("forgot");
                      setForgotStep("email");
                      setMessage("");
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}




              {activeTab === "login" && mode === "forgot" && forgotStep === "otp" && (
                <div className="lp-field">
                  <input
                    className="lp-input"
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
              )}





              
              {/* Confirm Password — signup only */}

              {activeTab === "signup" && step === "otp" && (
                <div className="lp-field">
                  <input
                    className="lp-input"
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
              )}




              {activeTab === "signup" && step === "signup" && (
                <div className="lp-field">
                  <span className="lp-field-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    className="lp-input"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="lp-eye" onClick={() => setShowConfirmPassword(p => !p)}>
                    {showConfirmPassword
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l22 22"/><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.73 21.73 0 0 1 5.06-6.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.82 21.82 0 0 1-4.36 5.94"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              )}

              {message && (
                <p className={`lp-msg ${message.includes("successfully") ? "lp-msg--ok" : "lp-msg--err"}`}>
                  {message}
                </p>
              )}

              <button type="submit" className="lp-submit" disabled={isLoading}>
                {isLoading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    
                    <span className="lp-spinner"></span>

                    {activeTab === "login"
                      ? "Logging in..."
                      : activeTab === "signup" && step === "signup"
                      ? "Sending OTP..."
                      : activeTab === "signup" && step === "otp"
                      ? "Verifying OTP..."
                      : "Processing..."}
                  </span>
                ) : (
                  mode === "forgot"
                    ? forgotStep === "email"
                      ? "SEND OTP to Email"
                      : "RESET PASSWORD"
                    : activeTab === "login"
                    ? "LOGIN"
                    : step === "signup"
                    ? "Create Account"
                    : "VERIFY OTP"
                )}

              </button>

            </form>
          </div>

        </div>
        {/* end lp-form-box */}

      </div>
    </div>
  );
}