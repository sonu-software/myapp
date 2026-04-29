import { useState, useEffect, useCallback } from "react";
import "../styles/Adminpanel.css";
import { useNavigate } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028];
const API = import.meta.env.VITE_BACKEND_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateCalendar(year, month) {
  const firstDay    = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function getToken() {
  return localStorage.getItem("access_token");
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function SortIcon({ asc }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ marginLeft: 5, verticalAlign: "middle" }}>
      {asc
        ? <polyline points="18 15 12 9 6 15" />
        : <polyline points="6 9 12 15 18 9" />
      }
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

// ─── Selector Popup ───────────────────────────────────────────────────────────
function SelectorPopup({ onSelect, onClose }) {
  return (
    <div className="ap-overlay" onClick={onClose}>
      <div className="ap-popup ap-selector-popup" onClick={e => e.stopPropagation()}>
        <p className="ap-popup-label">Filter by</p>
        {["Date", "Month", "Year"].map(opt => (
          <button key={opt} className="ap-selector-btn" onClick={() => onSelect(opt)}>
            <span>{opt}</span>
            <ChevronRight />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Calendar Popup ───────────────────────────────────────────────────────────
function CalendarPopup({ onClose, onPick }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const cells = generateCalendar(year, month);
  const days  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  const prev = () => month === 0  ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1);
  const next = () => month === 11 ? (setMonth(0),  setYear(y => y + 1)) : setMonth(m => m + 1);

  return (
    <div className="ap-overlay" onClick={onClose}>
      <div className="ap-popup ap-cal-popup" onClick={e => e.stopPropagation()}>
        <div className="ap-cal-header">
          <button className="ap-nav-btn" onClick={prev}><ChevronLeft /></button>
          <span className="ap-cal-title">{MONTHS[month]} {year}</span>
          <button className="ap-nav-btn" onClick={next}><ChevronRight /></button>
        </div>
        <div className="ap-cal-grid">
          {days.map(d => <div key={d} className="ap-day-header">{d}</div>)}
          {cells.map((cell, i) => (
            <div
              key={i}
              className={`ap-cal-cell ${cell ? "ap-cal-cell--active" : ""}`}
              onClick={() => cell && onPick(`${String(cell).padStart(2,"0")}-${String(month+1).padStart(2,"0")}-${year}`)}>
              {cell || ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Months Popup ─────────────────────────────────────────────────────────────
function MonthsPopup({ onClose, onPick }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const rows = [MONTHS.slice(0,4), MONTHS.slice(4,8), MONTHS.slice(8,12)];

  return (
    <div className="ap-overlay" onClick={onClose}>
      <div className="ap-popup ap-cal-popup" onClick={e => e.stopPropagation()}>
        <div className="ap-cal-header">
          <button className="ap-nav-btn ap-nav-btn--dark" onClick={() => setYear(y => y - 1)}>
            <ChevronLeft />
          </button>
          <span className="ap-cal-title">{year}</span>
          <button className="ap-nav-btn ap-nav-btn--dark" onClick={() => setYear(y => y + 1)}>
            <ChevronRight />
          </button>
        </div>
        <div className="ap-months-grid">
          {rows.map((row, ri) => (
            <div key={ri} className="ap-months-row">
              {row.map(m => (
                <div key={m} className="ap-month-cell" onClick={() => onPick(`${m} ${year}`)}>
                  {m}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Year Popup ───────────────────────────────────────────────────────────────
function YearPopup({ onClose, onPick }) {
  const currentYear = new Date().getFullYear();
  return (
    <div className="ap-overlay" onClick={onClose}>
      <div className="ap-popup ap-year-popup" onClick={e => e.stopPropagation()}>
        <p className="ap-popup-label">Select Year</p>
        <div className="ap-year-scroll">
          {YEARS.map(y => (
            <div
              key={y}
              className={`ap-year-item ${y === currentYear ? "ap-year-item--current" : ""}`}
              onClick={() => onPick(String(y))}
            >
              {y === currentYear && <span className="ap-year-dot" />}
              <span>{y}</span>
              {y === currentYear && <span className="ap-year-badge">Current</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cls =
    status === "Sent"     ? "ap-badge--sent"    :
    status === "Not Sent" ? "ap-badge--notsent" :
    status === "Pending"  ? "ap-badge--pending" : "ap-badge--default";
  return <span className={`ap-badge ${cls}`}>{status}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [sortAsc, setSortAsc]   = useState(false);
  const [filter, setFilter]     = useState(null);
  const [popup, setPopup]       = useState(null);

  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 10;

  const navigate = useNavigate();

  useEffect(() => {
    const isAdmin = localStorage.getItem("admin");

    if (!isAdmin) {
      navigate("/", { replace: true });
    }
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/admin/requests`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setRequests(data.data ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ── Filter ───────────────────────────────────────────────────────────────────
  const filtered = requests.filter(row => {
    if (!filter) return true;
    const dateStr = (row.request_date ?? row.date ?? "").toLowerCase();
    const val     = filter.value.toLowerCase();
    if (filter.type === "Date")  return dateStr.includes(val);
    if (filter.type === "Month") return dateStr.includes(val.split(" ")[0].toLowerCase());
    if (filter.type === "Year")  return dateStr.includes(val);
    return true;
  });

  // ── Sort ─────────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    const da = a.request_date ?? a.date ?? "";
    const db = b.request_date ?? b.date ?? "";
    return sortAsc ? da.localeCompare(db) : db.localeCompare(da);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSelectorChoice = (choice) => {
    if      (choice === "Date")  setPopup("date");
    else if (choice === "Month") setPopup("month");
    else                         setPopup("year");
  };

  const handlePick = (type, val) => {
    setFilter({ type, value: val });
    setPage(1);
    setPopup(null);
  };

  const clearFilter = () => { setFilter(null); setPage(1); };

  return (
    <div className="ap-page">

      {/* Page Header */}
      <div className="ap-page-header">


        


        <div className="ap-page-header-left">
          <h1 className="ap-page-title">Admin Panel</h1>
          <p className="ap-page-sub">Review and manage all submitted requests</p>
        </div>
        <button className="ap-refresh-btn" onClick={fetchRequests} title="Refresh">
          <RefreshIcon />
          <span>Refresh</span>
        </button>

        <button
          className="ap-refresh-btn"
          onClick={() => {
            localStorage.removeItem("admin");
            window.location.href = "/";
          }}
        >
          Logout
        </button>

      </div>
      

      {/* Card */}
      <div className="ap-card">

        {/* Toolbar */}
        <div className="ap-toolbar">
          {filter ? (
            <div className="ap-filter-chip">
              <FilterIcon />
              <span>{filter.type}: <strong>{filter.value}</strong></span>
              <button className="ap-chip-clear" onClick={clearFilter}>✕</button>
            </div>
          ) : (
            <span className="ap-row-count">
              {loading ? "Loading…" : `${sorted.length} record${sorted.length !== 1 ? "s" : ""}`}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th className="ap-th ap-th--idx">#</th>
                <th className="ap-th">Username</th>
                <th className="ap-th">User ID</th>
                <th className="ap-th">Submitted Request</th>
                <th
                  className="ap-th ap-th--sortable"
                  onClick={() => {
                    setSortAsc(a => !a);
                    setPopup("selector");
                  }}
                  title="Click to sort or filter by date"
                >
                  Request Date &amp; Time
                  <SortIcon asc={sortAsc} />
                </th>
                <th className="ap-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="ap-td ap-td--center">
                    <div className="ap-spinner" />
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="ap-td ap-td--center ap-td--error">
                    ⚠ Could not load data — {error}
                  </td>
                </tr>
              )}
              {!loading && !error && paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="ap-td ap-td--center ap-td--empty">
                    No records found
                  </td>
                </tr>
              )}
              {!loading && !error && paginated.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className="ap-tr"
                  onClick={() => navigate(`/admin/docket/${row.docket_id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="ap-td ap-td--idx">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="ap-td">{row.username ?? row.user_name ?? "—"}</td>
                  <td className="ap-td ap-td--muted">{row.user_id ?? row.userId ?? "—"}</td>
                  <td className="ap-td">{row.submitted_request ?? row.request ?? "—"}</td>
                  <td className="ap-td ap-td--date">{row.request_date ?? row.date ?? "—"}</td>
                  <td className="ap-td">
                    <StatusBadge status={row.status ?? "—"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="ap-footer">
          <div className="ap-pagination">
            <button
              className="ap-page-btn"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}>
              <ChevronLeft />
            </button>
            <span className="ap-page-info">Page {page} / {totalPages}</span>
            <button
              className="ap-page-btn"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}>
              <ChevronRight />
            </button>
          </div>

          <button
            className="ap-see-all-btn"
            onClick={() => { clearFilter(); fetchRequests(); }}>
            See All
          </button>
        </div>
      </div>

      {/* Popups */}
      {popup === "selector" && (
        <SelectorPopup onSelect={handleSelectorChoice} onClose={() => setPopup(null)} />
      )}
      {popup === "date" && (
        <CalendarPopup onClose={() => setPopup(null)} onPick={v => handlePick("Date", v)} />
      )}
      {popup === "month" && (
        <MonthsPopup onClose={() => setPopup(null)} onPick={v => handlePick("Month", v)} />
      )}
      {popup === "year" && (
        <YearPopup onClose={() => setPopup(null)} onPick={v => handlePick("Year", v)} />
      )}
    </div>
  );
}