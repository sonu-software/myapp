import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import {
Target,
Lightbulb,
Users,
CalendarDays,
Sparkles,
LayoutDashboard,
UserCircle2
} from "lucide-react";

import "../styles/appFrame.css";

const API = import.meta.env.VITE_BACKEND_URL;

export default function AppFrame() {

const navigate = useNavigate();
const location = useLocation();

const [businessName, setBusinessName] = useState("My Business");
const [email, setEmail] = useState("");
const [menuOpen, setMenuOpen] = useState(false);

useEffect(() => {
loadAccount();


const shouldRefresh =
  sessionStorage.getItem("refreshAccount");

if (shouldRefresh) {
  loadAccount();
  sessionStorage.removeItem("refreshAccount");
}


}, [location.pathname]);

useEffect(() => {


function handleOutsideClick() {
  setMenuOpen(false);
}

if (menuOpen) {
  document.addEventListener(
    "click",
    handleOutsideClick
  );
}

return () => {
  document.removeEventListener(
    "click",
    handleOutsideClick
  );
};

}, [menuOpen]);

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

  setBusinessName(
    data.business_name || "My Business"
  );

  setEmail(
    data.email || ""
  );

} catch (err) {

  console.error(
    "Failed to load account",
    err
  );
}

}

function logout() {

localStorage.clear();
navigate("/");

}

const navItems = [
{
label: "Purpose",
route: "/setup-business",
icon: <Target size={14} />
},
{
label: "Solution",
route: "/product",
icon: <Lightbulb size={14} />
},
{
label: "Audience",
route: "/persona",
icon: <Users size={14} />
},
{
label: "Planner",
route: "/planner",
icon: <CalendarDays size={14} />
},
{
label: "Execute",
route: "/Planner",
icon: <Sparkles size={14} />
}
];

return ( <div className="app-shell">


  {menuOpen && (
    <div
      className="profile-backdrop"
      onClick={() => setMenuOpen(false)}
    />
  )}

  <aside className="sidebar">

    <div
      className="sidebar-logo"
      onClick={() => navigate("/home")}
    >
      <img
        src="/white_visualgrab_logo.png"
        alt="VisualGrab"
      />
    </div>

    <div className="sidebar-menu">

      {navItems.map((item) => {

        const active =
          location.pathname === item.route;

        return (
          <button
            key={item.label}
            className={`sidebar-item ${
              active ? "active" : ""
            }`}
            onClick={() =>
              navigate(item.route)
            }
          >
            <div className="sidebar-icon">
              {item.icon}
            </div>

            <span>
              {item.label}
            </span>
          </button>
        );
      })}

    </div>

    <div className="sidebar-footer">

     

      <div className="account-section">

        <button
          className="account-button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
        >
          <UserCircle2 size={18} />
          <span>Profile</span>
        </button>

        {menuOpen && (

          <div
            className="profile-menu"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="profile-header">

              <img
                src="/white_visualgrab_logo.png"
                alt="VisualGrab"
                className="profile-logo"
              />

              <div className="profile-business">
                {businessName}
              </div>

              <div className="profile-email">
                {email}
              </div>

            </div>

            <div className="profile-divider" />

            <button
              className="logout-menu-btn"
              onClick={logout}
            >
              Logout
            </button>

          </div>
        )}

      </div>

    </div>

  </aside>

  <main className="main-container">

    <div className="app-content">
      <Outlet />
    </div>

  </main>

</div>


);
}