import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/appFrame.css";


const API = import.meta.env.VITE_BACKEND_URL;

export default function AppFrame() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("My Business");
  const [email, setEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  

  useEffect(() => {
    async function loadAccount() {
      try {
        const res = await fetch(`${API}/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (res.status === 401) {
          logout();
          return;
        }

        const data = await res.json();
        setBusinessName(data.business_name);
        setEmail(data.email);

      } catch (err) {
        console.error("Failed to load account", err);
      }
    }

    loadAccount();


    // 🔥 If business was updated, reload and clear flag
    const shouldRefresh = sessionStorage.getItem("refreshAccount");

    if (shouldRefresh) {
      loadAccount();
      sessionStorage.removeItem("refreshAccount");
    }

  }, [location.pathname]);



  function logout() {
    localStorage.clear();
    navigate("/");
  }

  return (
    <div className="app-shell">
      
    <div className="app-body ai-border-runner">

      
      
      {/* HEADER */}
      <header className="app-header">
        <div className="header-left">
          <div className="ai-logo md">
            <img
              src="/white_elevantia_pace.png"
              alt="Elevantia Pace Logo"
              className="ai-logo-img logo-clickable"
              onClick={() => navigate("/home")}
              style={{ cursor: "pointer" }}
            />
          </div>



        </div>

        <div className="header-right">
          <div
            className="business-chip"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {businessName.toUpperCase()} 👤
            <span className="caret">▾</span>
          </div>

          {menuOpen && (
  <div
    className="dropdown-overlay"
    onClick={() => setMenuOpen(false)}
  >
    <div
      className="dropdown-menu"
      onClick={(e) => e.stopPropagation()}
    >

              {/* Account Info Section */}
              <div className="dropdown-account">
                <div className="dropdown-business">
                  {businessName.toUpperCase()}
                </div>
                <div className="dropdown-email">
                  {email}
                </div>
              </div>

      

              <div className="dropdown-divider" />

              <button onClick={() => navigate("/home")}>🏠︎ Home </button>
              <button onClick={() => navigate("/setup-business")}>
                💼 Update Business Profile 
              </button>

              <button onClick={() => navigate("/planner")}>
                📅 Planner
              </button>

              <button onClick={() => navigate("/persona")}>
                👨‍👩‍👧‍👦 Create Personas
              </button>
              <button onClick={() => navigate("/product")}>📦 Create Products</button>
              
              <button className="danger" onClick={logout}>
                ➜] Logout
              </button>

            </div>
            </div>
          )}

        </div>
      </header>

      {/* BODY */}
      
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
