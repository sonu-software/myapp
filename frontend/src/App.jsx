import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Business from "./pages/Business";
import AboutUs from "./pages/AboutUs";
import Persona from "./pages/Persona";
import BusinessSetup from "./pages/BusinessSetup";
import Product from "./pages/Product";
import PlannerPage from "./pages/PlannerPage";
import Initializing from "./pages/Initializing";
import Docket from "./pages/Docket";
import Design from "./pages/Design";
import DocketMedia from "./pages/DocketMedia";
import AdminPanel from "./pages/AdminPanel";
import DocketMediaAdmin from "./pages/DocketMediaAdmin";
import AppFrame from "./layouts/AppFrame";

const API = import.meta.env.VITE_BACKEND_URL;

/* ---------------- PROTECTED + ONBOARDING GUARD ---------------- */
function OnboardingGuard({ children }) {
  const token = localStorage.getItem("token");

  if (!token) return <Navigate to="/" replace />;

  return children;
}

/* ---------------- APP ROUTES ---------------- */
export default function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* ADMIN */}
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/admin/docket/:docketId" element={<DocketMediaAdmin />} />

      {/* PROTECTED + ONBOARDING CONTROLLED */}
      <Route
        element={
          <OnboardingGuard>
            <AppFrame />
          </OnboardingGuard>
        }
      >
        <Route path="/home" element={<Home />} />
        <Route path="/persona" element={<Persona />} />
        <Route path="/product" element={<Product />} />
        <Route path="/business" element={<Business />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/setup-business" element={<BusinessSetup />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/initializing" element={<Initializing />} />
        <Route path="/docket" element={<Docket />} />
        <Route path="/design" element={<Design />} />
        <Route path="/docket/:docketId" element={<Docket />} />
        <Route path="/docket-media/:docketId" element={<DocketMedia />} />
      </Route>
    </Routes>
  );
}