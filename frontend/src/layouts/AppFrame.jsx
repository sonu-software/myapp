import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  Target,
  Lightbulb,
  Users,
  CalendarDays,
  Sparkles,
  LayoutDashboard,
  Search,
  PenLine,
  ClipboardCheck,
  SquareCheckBig,
  RadioTower,
  Lock,
  XCircle,
  RotateCcw,
  Filter,
  Plus,
  X,
  Loader2
} from "lucide-react";

import "../styles/appFrame.css";

// ─── Constants ──────────────────────────────────────────────────────────────
const API   = import.meta.env.VITE_BACKEND_URL;
const TOKEN = () => localStorage.getItem("token");
const AUTH  = () => ({ Authorization: `Bearer ${TOKEN()}` });

const FILTER_STAGES = [
  "discovery",
  "draft",
  "generate",
  "review",
  "approval",
  "publish",
  "closed",
  "rejected",
];

// ─── Utility ────────────────────────────────────────────────────────────────
function formatDate(date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day   = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AppFrame() {

  const navigate = useNavigate();
  const location = useLocation();

  // ── Account ────────────────────────────────────────────────────────────
  const [businessName, setBusinessName] = useState("My Business");
  const [email, setEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Reference lists (used by the filter dropdown) ────────────────────────
  const [productList, setProductList] = useState([]);
  const [personaList, setPersonaList] = useState([]);
  const [occasionList, setOccasionList] = useState([]);

  // ── Filter state ──────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedFilterStage, setSelectedFilterStage] = useState("");
  const [selectedFilterProduct, setSelectedFilterProduct] = useState("");
  const [selectedFilterPersona, setSelectedFilterPersona] = useState("");
  const [selectedFilterOccasion, setSelectedFilterOccasion] = useState("");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("");

  const [panelPosition, setPanelPosition] = useState("right");

  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterDropdownPos, setFilterDropdownPos] = useState({ top: 0, left: 0 });

  const filterBtnRef = useRef(null);

  // ── Create Execute modal state ────────────────────────────────────────
  const [showCreateExecuteModal, setShowCreateExecuteModal] = useState(false);
  const [newDocketTitle, setNewDocketTitle] = useState("");
  const [newMode, setNewMode] = useState("");
  const [newMediaType, setNewMediaType] = useState("");
  const [newSubType, setNewSubType] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [newPersonaId, setNewPersonaId] = useState("");
  const [newOccasionId, setNewOccasionId] = useState("");
  const [newExecuteDescription, setNewExecuteDescription] = useState("");
  const [newVisualElements, setNewVisualElements] = useState("");
  const [newUploadedDateTime, setNewUploadedDateTime] = useState(new Date());
  const [createMediaTypes, setCreateMediaTypes] = useState([]);
  const [createSubTypes, setCreateSubTypes] = useState([]);
  const [isCreatingExecute, setIsCreatingExecute] = useState(false);

  // ── Stage counts (footer bar) ────────────────────────────────────────────
  const [stageCounts, setStageCounts] = useState({
    discovery: 0, draft: 0, generate: 0, review: 0,
    approve: 0, publish: 0, closed: 0, rejected: 0,
  });

  // ── Execute-card list (right/top panel) ──────────────────────────────────
  // Same data source as DocketMedia's carousel — reuses the same
  // /planner/carousel-dockets endpoint and the same filters this file
  // already builds for the footer stage counts. Display-only: no
  // pagination, no click-through.
  const [carouselDockets, setCarouselDockets] = useState([]);

  // Lets the currently open execute (if any) highlight itself in the panel.
  const activeDocketId = useMemo(() => {
    const match = location.pathname.match(/^\/docket-media\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  // ── Account load ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadAccount();

    const shouldRefresh = sessionStorage.getItem("refreshAccount");

    if (shouldRefresh) {
      loadAccount();
      sessionStorage.removeItem("refreshAccount");
    }

  }, [location.pathname]);

  // ── Profile menu outside-click ───────────────────────────────────────────
  useEffect(() => {

    function handleOutsideClick() {
      setMenuOpen(false);
    }

    if (menuOpen) {
      document.addEventListener("click", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };

  }, [menuOpen]);

  // ── Filter dropdown: keep it aligned to its trigger button ───────────────
  // The dropdown is portaled to <body> (see render below) so it can't be
  // clipped by any ancestor's `overflow:hidden` — it is positioned with
  // fixed coordinates computed from the button's bounding box, and kept in
  // sync on resize/scroll while open.
  useEffect(() => {

    if (!showFilterDropdown) return;

    function reposition() {
      if (!filterBtnRef.current) return;
      const rect = filterBtnRef.current.getBoundingClientRect();
      setFilterDropdownPos({
        top: rect.bottom + 8,
        left: rect.left
      });
    }

    reposition();

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };

  }, [showFilterDropdown]);

  function toggleFilterDropdown() {

    if (!showFilterDropdown && filterBtnRef.current) {
      const rect = filterBtnRef.current.getBoundingClientRect();
      setFilterDropdownPos({
        top: rect.bottom + 8,
        left: rect.left
      });
    }

    setShowFilterDropdown(v => !v);
  }

  // ── Reference lists (Products / Personas / Occasions) ────────────────────
  useEffect(() => {

    fetch(`${API}/personas`, { headers: AUTH() })
      .then(res => {
        if (res.status === 401) { logout(); return null; }
        return res.json();
      })
      .then(data => { if (data?.success) setPersonaList(data.data); })
      .catch(err => console.error("Failed to load personas", err));

    fetch(`${API}/products`, { headers: AUTH() })
      .then(res => {
        if (res.status === 401) { logout(); return null; }
        return res.json();
      })
      .then(data => { if (data?.success) setProductList(data.data); })
      .catch(err => console.error("Failed to load products", err));

    fetch(`${API}/planner/all-occasions`, { headers: AUTH() })
      .then(res => {
        if (res.status === 401) { logout(); return null; }
        return res.json();
      })
      .then(data => { if (data?.success) setOccasionList(data.data || []); })
      .catch(err => console.error("Failed to load occasions", err));

  }, []);

  // ── Stage counts: refetch whenever a filter changes ──────────────────────
  useEffect(() => {

    fetchStageCounts();

  }, [
    startDate,
    endDate,
    selectedFilterStage,
    selectedFilterProduct,
    selectedFilterPersona,
    selectedFilterOccasion,
    searchText,
  ]);

  function buildFilterParams() {

    const params = new URLSearchParams();

    if (startDate) {
      params.append("start_date", formatDate(startDate));
    }

    if (endDate) {
      params.append("end_date", formatDate(endDate));
    }

    if (selectedFilterStage) {
      params.append("stage", selectedFilterStage);
    }

    if (selectedFilterProduct) {
      params.append("product_id", selectedFilterProduct);
    }

    if (selectedFilterPersona) {
      params.append("persona_id", selectedFilterPersona);
    }

    if (selectedFilterOccasion) {
      params.append("occasion_id", selectedFilterOccasion);
    }

    if (searchText.trim()) {
      params.append("search", searchText.trim());
    }

    return params;
  }

  async function fetchStageCounts() {

    try {

      const params = buildFilterParams();

      const res = await fetch(
        `${API}/planner/stage-counts?${params.toString()}`,
        { headers: AUTH() }
      );

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();

      if (data.success) {
        setStageCounts(data.data);
      }

    } catch (err) {
      console.error("Failed to load stage counts", err);
    }
  }

  // ── Execute-card list fetch — same endpoint/params as DocketMedia's
  // carousel, driven by this file's own filter state. Additive only: does
  // not touch fetchStageCounts or its effect above.
  async function fetchCarouselDockets() {

    try {

      const params = buildFilterParams();

      const res = await fetch(
        `${API}/planner/carousel-dockets?${params.toString()}`,
        { headers: AUTH() }
      );

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();

      if (data.success) {
        setCarouselDockets(data.data || []);
      }

    } catch (err) {
      console.error("Failed to load carousel dockets", err);
    }
  }

  useEffect(() => {

    fetchCarouselDockets();

  }, [
    startDate,
    endDate,
    selectedFilterStage,
    selectedFilterProduct,
    selectedFilterPersona,
    selectedFilterOccasion,
    searchText,
  ]);

  // ── Create Execute modal: cascading Media Type / Sub Type lookups ────────
  useEffect(() => {

    if (!newMode) {
      setCreateMediaTypes([]);
      return;
    }

    fetch(`${API}/media-types?mode=${newMode}`, { headers: AUTH() })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCreateMediaTypes(data.data);
        }
      })
      .catch(err => console.error("Failed to load media types", err));

  }, [newMode]);

  useEffect(() => {

    if (!newMediaType) {
      setCreateSubTypes([]);
      return;
    }

    fetch(
      `${API}/media-subtypes?mode=${newMode}&mediaType=${newMediaType}`,
      { headers: AUTH() }
    )
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCreateSubTypes(data.data);
        }
      })
      .catch(err => console.error("Failed to load media sub types", err));

  }, [newMediaType]);

  function resetCreateExecuteForm() {
    setNewDocketTitle("");
    setNewMode("");
    setNewMediaType("");
    setNewSubType("");
    setNewProductId("");
    setNewPersonaId("");
    setNewOccasionId("");
    setNewExecuteDescription("");
    setNewVisualElements("");
    setNewUploadedDateTime(new Date());
  }

  async function handleCreateExecute() {

    if (isCreatingExecute) return;

    if (!newDocketTitle || !newMode || !newMediaType || !newSubType) {
      alert("Please fill all required fields");
      return;
    }

    setIsCreatingExecute(true);

    try {

      const res = await fetch(`${API}/planner/docket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...AUTH()
        },
        body: JSON.stringify({
          title: newDocketTitle,
          tab: "media",
          product_id: newProductId || null,
          persona_id: newPersonaId || null,
          occasion_id: newOccasionId || null,
          mode: newMode,
          mediaType: newMediaType,
          subType: newSubType,
          planner_date_time: new Date().toISOString(),
          uploaded_date_time: newUploadedDateTime,
          execute_description: newExecuteDescription,
          visual_elements: newVisualElements,
          summary: ""
        })
      });

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();

      if (data.success) {

        resetCreateExecuteForm();
        setShowCreateExecuteModal(false);

        await fetchStageCounts();

        navigate(`/docket-media/${data.docket_id}`);

      } else {
        alert(data.message || "Failed to create execute");
      }

    } catch (err) {
      console.error("Failed to create execute", err);
    } finally {
      setIsCreatingExecute(false);
    }
  }

  async function loadAccount() {

    try {

      const res = await fetch(`${API}/me`, {
        headers: AUTH()
      });

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();

      setBusinessName(data.business_name || "My Business");
      setEmail(data.email || "");

    } catch (err) {
      console.error("Failed to load account", err);
    }
  }

  function logout() {
    localStorage.clear();
    navigate("/");
  }

  function getAvatarInitial(name) {
    const trimmed = (name || "").trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : "U";
  }

  function clearAllFilters() {
    setStartDate(null);
    setEndDate(null);
    setSelectedFilterStage("");
    setSelectedFilterProduct("");
    setSelectedFilterPersona("");
    setSelectedFilterOccasion("");
    setSearchText("");
    setShowFilterDropdown(false);
  }

  // ── Active filter pills ──────────────────────────────────────────────────
  const activeFilters = useMemo(() => {

    const pills = [];

    if (selectedFilterStage) {
      pills.push({
        key: "stage",
        label: selectedFilterStage,
        clear: () => setSelectedFilterStage("")
      });
    }

    if (selectedFilterProduct) {
      const p = productList.find(x => String(x.product_id) === String(selectedFilterProduct));
      pills.push({
        key: "product",
        label: p?.product_name || "Product",
        clear: () => setSelectedFilterProduct("")
      });
    }

    if (selectedFilterPersona) {
      const p = personaList.find(x => String(x.persona_id) === String(selectedFilterPersona));
      pills.push({
        key: "persona",
        label: p?.persona_name || "Persona",
        clear: () => setSelectedFilterPersona("")
      });
    }

    if (selectedFilterOccasion) {
      const o = occasionList.find(x => String(x.occasion_id) === String(selectedFilterOccasion));
      pills.push({
        key: "occasion",
        label: o?.title || "Topic",
        clear: () => setSelectedFilterOccasion("")
      });
    }

    if (startDate) {
      pills.push({
        key: "startDate",
        label: `From ${formatDate(startDate)}`,
        clear: () => setStartDate(null)
      });
    }

    if (endDate) {
      pills.push({
        key: "endDate",
        label: `To ${formatDate(endDate)}`,
        clear: () => setEndDate(null)
      });
    }

    if (searchText.trim()) {
      pills.push({
        key: "search",
        label: `"${searchText}"`,
        clear: () => setSearchText("")
      });
    }

    return pills;

  }, [
    selectedFilterStage,
    selectedFilterProduct,
    selectedFilterPersona,
    selectedFilterOccasion,
    startDate,
    endDate,
    searchText,
    productList,
    personaList,
    occasionList
  ]);


  const headerDropdownConfig = useMemo(() => {

    if (location.pathname === "/planner") {

      return {
        defaultValue: "Month",
        options: [
          "Month",
          "Week",
          "Day"
        ]
      };

    }

    if (
      location.pathname.startsWith("/design") ||
      location.pathname === "/design"
    ) {

      return {
        defaultValue: "Vertical",
        options: [
          "Vertical",
          "Horizontal"
        ]
      };

    }

    return {
      defaultValue: "",
      options: []
    };

  }, [location.pathname]);



  const selectedViewMode = useMemo(() => {

    if (
      headerDropdownConfig.options.includes(viewMode)
    ) {
      return viewMode;
    }

    return headerDropdownConfig.defaultValue;

  }, [
    viewMode,
    headerDropdownConfig
  ]);








  const navItems = [
    { label: "Purpose",  route: "/setup-business", icon: <Target size={14.7} /> },
    { label: "Solution", route: "/product",         icon: <Lightbulb size={14.7} /> },
    { label: "Audience", route: "/persona",         icon: <Users size={14.7} /> },
    { label: "Planner2",  route: "/plannerpage",         icon: <CalendarDays size={14.7} /> },
    { label: "Execute",  route: "execute",          icon: <Sparkles size={14.7} /> },
    { label: "Planner",  route: "/planner",         icon: <CalendarDays size={14.7} /> },
    { label: "Design",  route: "/design",          icon: <Sparkles size={14.7} /> }
  ];

  const footerItems = [
    { key: "discovery", label: "Discovery", color: "#F59E0B", icon: <Search size={12.6} /> },
    { key: "draft",     label: "Draft",     color: "#334155", icon: <PenLine size={12.6} /> },
    { key: "generate",  label: "Generate",  color: "#3B82F6", icon: <Sparkles size={12.6} /> },
    { key: "review",    label: "Review",    color: "#8B5CF6", icon: <ClipboardCheck size={12.6} /> },
    { key: "approve",   label: "Approve",   color: "#16A34A", icon: <SquareCheckBig size={12.6} /> },
    { key: "publish",   label: "Publish",   color: "#F97316", icon: <RadioTower size={12.6} /> },
    { key: "closed",    label: "Closed",    color: "#166534", icon: <Lock size={12.6} /> },
    { key: "rejected",  label: "Rejected",  color: "#EF4444", icon: <XCircle size={12.6} /> }
  ];

  // ── Execute cards — display-only list, no click-through navigation ───────
  // Right position stacks the cards vertically (rows) instead of scrolling
  // them horizontally, via the `--vertical` modifier classes defined in
  // appFrame.css. Top position keeps the original horizontal layout as-is.
  const isVerticalPanel = panelPosition === "right";

  const executeCards = (
    <div className={` ${isVerticalPanel ? ' dm-carousel-new--vertical' : ''}`}>
      <div className={`dm-carousel-track-new${isVerticalPanel ? ' dm-carousel-track-new--vertical' : ''}`}>
        {carouselDockets.map((item) => {
          const image =
            item.visual_url ||
            item.uploaded_url ||
            item.generated_image ||
            item.image_url ||
            item.media_url ||
            item.admin_image_url ||
            item.visual_image ||
            item.thumbnail ||
            null;

          const isActive = String(item.docket_id) === String(activeDocketId);

          return (
            <div
              key={item.docket_id}
              className={`dm-carousel-item${isActive ? ' dm-carousel-item--active' : ''}`}
            >
              <div className="dm-carousel-item-thumb">
                {image ? <img src={image} alt=""/> : <div className="dm-carousel-item-thumb-empty"/>}
              </div>
              <div className="dm-carousel-item-info">
                <div className="dm-carousel-item-topic">{item.title || "Untitled Execute"}</div>
                <div className="dm-carousel-item-date">
                  {item.uploaded_date_time
                    ? new Date(item.uploaded_date_time).toLocaleString()
                    : "No Date"}
                </div>
                <div className="dm-carousel-item-stage">{item.current_stage || item.stage || "discovery"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );


  return (
    <div className="app-shell">

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

            const active = location.pathname === item.route;

            return (
              <button
                key={item.label}
                className={`sidebar-item ${active ? "active" : ""}`}
                onClick={async () => {

                  if (item.route !== "execute") {
                    navigate(item.route);
                    return;
                  }

                  try {

                    const res = await fetch(
                      `${API}/execute/default`,
                      { headers: AUTH() }
                    );

                    const data = await res.json();

                    if (data.success && data.docket_id) {
                      navigate(`/docket-media/${data.docket_id}`);
                    } else {
                      alert(data.message || "No execute found");
                    }

                  } catch (err) {
                    console.error(err);
                    navigate("/planner");
                  }

                }}
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
              <div className="account-avatar">
                {getAvatarInitial(businessName)}
              </div>

              <span>Profile</span>
            </button>

            {menuOpen &&
              createPortal(

                <div
                  className="profile-menu"
                  onClick={(e) => e.stopPropagation()}
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

                </div>,

                document.body

              )
            }

          </div>

        </div>

      </aside>

      <main className="main-container">

        <header className="app-header-bar">

          <div className="header-left">


            <div className="header-search-wrap">

              <input
                type="text"
                className="header-search-input"
                placeholder="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

              <Search
                size={14}
                color="#8a8f98"
                strokeWidth={2}
                className="header-search-icon"
              />

            </div>





            <div className="header-filter-wrap">

              <button
                ref={filterBtnRef}
                className={`header-filter-btn ${showFilterDropdown ? "active" : ""}`}
                title="Filter"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFilterDropdown();
                }}
              >
                <Filter size={15} strokeWidth={3} />
              </button>

              {showFilterDropdown &&
                createPortal(

                  <>

                    <div
                      className="header-filter-backdrop"
                      onClick={() => setShowFilterDropdown(false)}
                    />

                    <div
                      className="header-filter-dropdown"
                      style={{
                        top: `${filterDropdownPos.top}px`,
                        left: `${filterDropdownPos.left}px`
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >

                      <div className="header-filter-dropdown-head">

                        <div className="header-filter-dropdown-title">
                          <Filter size={13} strokeWidth={2.6} />
                          <span>Filter Executes</span>
                        </div>

                        <button
                          className="header-filter-dropdown-close"
                          title="Close"
                          onClick={() => setShowFilterDropdown(false)}
                        >
                          <X size={14} strokeWidth={2.4} />
                        </button>

                      </div>

                      <div className="header-filter-dropdown-body">

                        <div className="header-filter-dropdown-row">

                          <div className="header-filter-field">
                            <label>Start Date</label>
                            <DatePicker
                              selected={startDate}
                              onChange={setStartDate}
                              dateFormat="yyyy-MM-dd"
                              placeholderText="Select start date"
                              className="header-filter-date-input"
                            />
                          </div>

                          <div className="header-filter-field">
                            <label>End Date</label>
                            <DatePicker
                              selected={endDate}
                              onChange={setEndDate}
                              dateFormat="yyyy-MM-dd"
                              placeholderText="Select end date"
                              className="header-filter-date-input"
                            />
                          </div>

                        </div>

                        <div className="header-filter-dropdown-row">

                          <div className="header-filter-field">
                            <label>Stage</label>
                            <select
                              value={selectedFilterStage}
                              onChange={(e) => setSelectedFilterStage(e.target.value)}
                            >
                              <option value="">All Stages</option>
                              {FILTER_STAGES.map(stage => (
                                <option key={stage} value={stage}>
                                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="header-filter-field">
                            <label>Topic</label>
                            <select
                              value={selectedFilterOccasion}
                              onChange={(e) => setSelectedFilterOccasion(e.target.value)}
                            >
                              <option value="">All Topics</option>
                              {occasionList.map(o => (
                                <option key={o.occasion_id} value={o.occasion_id}>
                                  {o.title}
                                </option>
                              ))}
                            </select>
                          </div>

                        </div>

                        <div className="header-filter-dropdown-row">

                          <div className="header-filter-field">
                            <label>Product</label>
                            <select
                              value={selectedFilterProduct}
                              onChange={(e) => setSelectedFilterProduct(e.target.value)}
                            >
                              <option value="">All Products</option>
                              {productList.map(p => (
                                <option key={p.product_id} value={p.product_id}>
                                  {p.product_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="header-filter-field">
                            <label>Persona</label>
                            <select
                              value={selectedFilterPersona}
                              onChange={(e) => setSelectedFilterPersona(e.target.value)}
                            >
                              <option value="">All Personas</option>
                              {personaList.map(p => (
                                <option key={p.persona_id} value={p.persona_id}>
                                  {p.persona_name}
                                </option>
                              ))}
                            </select>
                          </div>

                        </div>

                      </div>

                      <div className="header-filter-dropdown-foot">
                        <button
                          className="header-filter-clear-btn"
                          onClick={clearAllFilters}
                        >
                          <RotateCcw size={12} strokeWidth={2.4} />
                          Clear Filter
                        </button>
                      </div>

                    </div>

                  </>,

                  document.body
                )
              }

            </div>

            <div className="header-filters-box">

              <div className="header-active-filters">
                {activeFilters.length > 0 ? (
                  activeFilters.map(f => (
                    <div key={f.key} className="header-filter-pill">
                      <span>{f.label}</span>
                      <button onClick={f.clear}>✕</button>
                    </div>
                  ))
                ) : (
                  <span className="header-filters-empty">No filters applied</span>
                )}
              </div>

              <button
                className="header-clear-btn"
                onClick={clearAllFilters}
                disabled={activeFilters.length === 0}
              >
                Clear all
              </button>

            </div>

          </div>



          <div className="header-right">

          
            {headerDropdownConfig.options.length > 0 && (

              <select
                className="header-view-dropdown"
                value={selectedViewMode}
                onChange={(e) => setViewMode(e.target.value)}
              >

                {headerDropdownConfig.options.map(option => (

                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>

                ))}

              </select>

            )}




            <button
              className="header-add-btn"
              title="Create Execute"
              onClick={() => setShowCreateExecuteModal(true)}
            >
              <Plus size={16} color="#ffffff" strokeWidth={2.4} />
            </button>




            <div className="panel-switch">
                    <button
                        className={panelPosition === "top" ? "active" : ""}
                        onClick={() => setPanelPosition("top")}
                    >
                        Top
                    </button>

                    <button
                        className={panelPosition === "right" ? "active" : ""}
                        onClick={() => setPanelPosition("right")}
                    >
                        Right
                    </button>
                </div>










          </div>

        </header>





        <div
          className={`app-center ${
              panelPosition === "top"
                  ? "panel-top"
                  : "panel-right"
          }`}
      >

          {panelPosition === "top" && (
              <aside className="app-right-panel">
                <div className="carousel-control-card">


                  <button
                    className="left-arrow"
                    title="left"
                  >left
                  </button>

                  <button
                    className="right-arrow"
                    title="right"
                  >right
                  </button>


                  <button
                    className="change-right-arrow"
                    title="change-right"
                  >change-right
                  </button>


                  <button
                    className="change-left-arrow"
                    title="change-left"
                  >change-left
                  </button>



                </div>
                  {executeCards}
              </aside>
          )}

          <div className="app-content">
              <Outlet
                  context={{
                      filters: {
                          startDate,
                          endDate,
                          stage: selectedFilterStage,
                          productId: selectedFilterProduct,
                          personaId: selectedFilterPersona,
                          occasionId: selectedFilterOccasion,
                          search: searchText,
                      },
                  }}
              />
          </div>



          {panelPosition === "right" && (
              <aside className="app-right-panel">
                <div className="carousel-control-card">
                  <button
                    className="left-arrow"
                    title="left"
                  >
                  </button>

                  <button
                    className="right-arrow"
                    title="left"
                  >
                  </button>


                  <button
                    className="change-right-arrow"
                    title="left"
                  >
                  </button>


                  <button
                    className="change-left-arrow"
                    title="left"
                  >
                  </button>

                </div>
                  {executeCards}
              </aside>
          )}

      </div>



        <footer className="app-footer-bar">

          {footerItems.map((item) => (
            <div
              className="footer-card"
              key={item.key}
              style={{ "--card-color": item.color }}
            >
              <span className="footer-card-icon">
                {item.icon}
              </span>

              <span className="footer-card-label">
                {item.label}
              </span>

              <span className="footer-card-count">
                {stageCounts[item.key] ?? 0}
              </span>
            </div>
          ))}

          <button
            className="footer-refresh-btn"
            title="Refresh"
            onClick={fetchStageCounts}
          >
            <RotateCcw size={13.5} color="#4b5565" strokeWidth={2} />
          </button>

        </footer>

      </main>

      {showCreateExecuteModal &&
        createPortal(

          <div
            className="ce-overlay"
            onClick={() => {
              if (!isCreatingExecute) setShowCreateExecuteModal(false);
            }}
          >

            <div
              className="ce-modal"
              onClick={(e) => e.stopPropagation()}
            >

              <div className="ce-modal-header">

                <div className="ce-modal-header-left">
                  <div className="ce-modal-header-icon">
                    <Sparkles size={14} strokeWidth={2.4} />
                  </div>
                  <h3>Create Execute</h3>
                </div>

                <button
                  className="ce-modal-close"
                  onClick={() => setShowCreateExecuteModal(false)}
                  disabled={isCreatingExecute}
                >
                  <X size={16} color="#6b7280" strokeWidth={2.4} />
                </button>
              </div>

              <div className="ce-modal-body">

                <div className="ce-modal-section">

                  <div className="ce-modal-section-title">Basics</div>

                  <div className="ce-modal-group">
                    <label>Execute Title</label>
                    <input
                      type="text"
                      value={newDocketTitle}
                      onChange={(e) => setNewDocketTitle(e.target.value)}
                    />
                  </div>

                  <div className="ce-modal-group">
                    <label>Upload Schedule</label>
                    <DatePicker
                      selected={newUploadedDateTime}
                      popperPlacement="bottom-end"
                      onChange={(date) => setNewUploadedDateTime(date)}
                      showTimeSelect
                      dateFormat="MMM d, yyyy h:mm aa"
                      timeFormat="hh:mm aa"
                      timeIntervals={15}
                      className="ce-modal-date-input"
                      placeholderText="Select upload time"
                    />
                  </div>

                </div>

                <div className="ce-modal-divider" />

                <div className="ce-modal-section">

                  <div className="ce-modal-section-title">Content</div>

                  <div className="ce-modal-group">
                    <label>Execute Description</label>
                    <textarea
                      value={newExecuteDescription}
                      onChange={(e) => setNewExecuteDescription(e.target.value)}
                      placeholder="Enter execute description..."
                    />
                  </div>

                  <div className="ce-modal-group">
                    <label>Visual Elements</label>
                    <textarea
                      value={newVisualElements}
                      onChange={(e) => setNewVisualElements(e.target.value)}
                      placeholder="Enter visual elements..."
                    />
                  </div>

                </div>

                <div className="ce-modal-divider" />

                <div className="ce-modal-section">

                  <div className="ce-modal-section-title">Classification</div>

                  <div className="ce-modal-row">

                    <div className="ce-modal-group">
                      <label>Prompt Type</label>
                      <select
                        value={newMode}
                        onChange={(e) => {
                          setNewMode(e.target.value);
                          setNewMediaType("");
                          setNewSubType("");
                        }}
                      >
                        <option value="">Select Prompt Type</option>
                        <option value="visuals">Visuals</option>
                      </select>
                    </div>

                    {newMode && (
                      <div className="ce-modal-group">
                        <label>{newMode === "message" ? "Message Type" : "Visual Type"}</label>
                        <select
                          value={newMediaType}
                          onChange={(e) => {
                            setNewMediaType(e.target.value);
                            setNewSubType("");
                          }}
                        >
                          <option value="">Select Type</option>
                          {createMediaTypes.map((t) => (
                            <option key={t.media_type} value={t.media_type}>
                              {t.media_type}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                  </div>

                  {newMediaType && (
                    <div className="ce-modal-group">
                      <label>{newMode === "message" ? "Message Sub Type" : "Visual Sub Type"}</label>
                      <select
                        value={newSubType}
                        onChange={(e) => setNewSubType(e.target.value)}
                      >
                        <option value="">Select Sub Type</option>
                        {createSubTypes.map((s) => (
                          <option key={s.subtype_name} value={s.subtype_name}>
                            {s.subtype_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                </div>

                <div className="ce-modal-divider" />

                <div className="ce-modal-section">

                  <div className="ce-modal-section-title">Targeting</div>

                  <div className="ce-modal-row">

                    <div className="ce-modal-group">
                      <label>Product</label>
                      <select
                        value={newProductId}
                        onChange={(e) => setNewProductId(e.target.value)}
                      >
                        <option value="">Select Product</option>
                        {productList.map((p) => (
                          <option key={p.product_id} value={p.product_id}>
                            {p.product_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ce-modal-group">
                      <label>Persona</label>
                      <select
                        value={newPersonaId}
                        onChange={(e) => setNewPersonaId(e.target.value)}
                      >
                        <option value="">Select Persona</option>
                        {personaList.map((p) => (
                          <option key={p.persona_id} value={p.persona_id}>
                            {p.persona_name}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                  <div className="ce-modal-group">
                    <label>Topic</label>
                    <select
                      value={newOccasionId}
                      onChange={(e) => setNewOccasionId(e.target.value)}
                    >
                      <option value="">Select Topic</option>
                      {occasionList.map((event) => (
                        <option key={event.occasion_id} value={event.occasion_id}>
                          {event.title}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

              </div>

              <div className="ce-modal-footer">
                <button
                  className="ce-modal-btn ce-modal-btn--cancel"
                  onClick={() => setShowCreateExecuteModal(false)}
                  disabled={isCreatingExecute}
                >
                  Cancel
                </button>
                <button
                  className="ce-modal-btn ce-modal-btn--save"
                  onClick={handleCreateExecute}
                  disabled={isCreatingExecute}
                >
                  {isCreatingExecute ? (
                    <>
                      <Loader2 size={14} className="ce-spinner" strokeWidth={2.4} />
                      Creating...
                    </>
                  ) : (
                    "Create Execute"
                  )}
                </button>
              </div>

            </div>

          </div>,

          document.body
        )
      }

    </div>
  );
}
