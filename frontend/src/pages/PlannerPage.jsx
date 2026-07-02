import { useState, useEffect, useRef } from "react";
import "../styles/plannerpage.css";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function PlannerPage() {
  // ========== STATE MANAGEMENT ==========
  const today = new Date();
  const API = import.meta.env.VITE_BACKEND_URL;

  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [uploadedDateTime, setUploadedDateTime] = useState(new Date());

  const plannerFilterRef = useRef(null);

  const FILTER_STAGES = [
    "discovery",
    "draft",
    "generate",
    "review",
    "approve",
    "publish",
    "closed",
    "rejected"
  ];




  const [plannerFilters, setPlannerFilters] = useState({

      startDate: null,

      endDate: null,

      stage: "",

      product: "",

      persona: "",

      occasion: "",

      mediaType: "",

      subType: "",

      search: ""

  });






  const [showPlannerFilter, setShowPlannerFilter] = useState(false);





  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [selectedFilterStage, setSelectedFilterStage] = useState("");
  const [selectedFilterProduct, setSelectedFilterProduct] = useState("");
  const [selectedFilterPersona, setSelectedFilterPersona] = useState("");
  const [selectedFilterOccasion, setSelectedFilterOccasion] = useState("");

  const [selectedFilterMediaType, setSelectedFilterMediaType] = useState("");
  const [selectedFilterSubType, setSelectedFilterSubType] = useState("");

  const [searchText, setSearchText] = useState("");

  



  useEffect(() => {

      setPlannerFilters({

          startDate,

          endDate,

          stage: selectedFilterStage,

          product: selectedFilterProduct,

          persona: selectedFilterPersona,

          occasion: selectedFilterOccasion,

          mediaType: selectedFilterMediaType,

          subType: selectedFilterSubType,

          search: searchText

      });

  }, [

      startDate,

      endDate,

      selectedFilterStage,

      selectedFilterProduct,

      selectedFilterPersona,

      selectedFilterOccasion,

      selectedFilterMediaType,

      selectedFilterSubType,

      searchText

  ]);



  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const handleApiError = (data) => {
    if (data?.detail === "BUSINESS_REQUIRED") {
      setPopup({
        show: true,
        type: "warning",
        title: "Business Required",
        message: "Please setup your business before continuing.",
        confirmLabel: "Setup Now",
        onConfirm: () => navigate("/setup-business")
      });
      return true;
    }

    if (data?.detail === "PRODUCT_REQUIRED") {
      setPopup({
        show: true,
        type: "warning",
        title: "Product Required",
        message: "Please add a product before creating execute.",
        confirmLabel: "Go to Product",
        onConfirm: () => navigate("/product")
      });
      return true;
    }


    if (data?.detail === "NOT_ALLOWED") {
      setPopup({
        show: true,
        type: "warning",
        title: "Access Restricted",
        message: "You don’t have permission to perform this action.",
        confirmLabel: "OK"
      });
      return true;
    }

    if (data?.detail === "PERSONA_REQUIRED") {
      setPopup({
        show: true,
        type: "warning",
        title: "Persona Required",
        message: "Please add a persona before creating execute.",
        confirmLabel: "Go to Persona",
        onConfirm: () => navigate("/persona")
      });
      return true;
    }

    return false;
  };



  const [popup, setPopup] = useState({
    show: false,
    type: "warning",
    title: "",
    message: "",
    onConfirm: null,
    confirmLabel: "OK",
    cancelLabel: null
  });

  

  const [mode, setMode] = useState("");
  const [mediaTypes, setMediaTypes] = useState([]);
  const [mediaType, setMediaType] = useState("");
  const [subTypes, setSubTypes] = useState([]);
  const [subType, setSubType] = useState("");

  const [productList, setProductList] = useState([]);
  const [personaList, setPersonaList] = useState([]);

  const [docketTitle, setDocketTitle] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");

  const [executeDescription, setExecuteDescription] = useState("");
  const [visualElements, setVisualElements] = useState("");

  const [occasions, setOccasions] = useState([]);
  const [occasionModalOpen, setOccasionModalOpen] = useState(false);
  const [editingOccasion, setEditingOccasion] = useState(null);
  const [occasionForm, setOccasionForm] = useState({
    title: "",
    description: "",
    color: "#e74c3c",
    date: null
  });

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    date: null
  });

  // ========== OVERFLOW POPUP STATE ==========
  const [overflowPopup, setOverflowPopup] = useState({
    visible: false,
    x: 0,
    y: 0,
    items: [],
    dateLabel: ""
  });

  // ========== FETCH OCCASIONS ==========
  useEffect(() => {
    const fetchOccasions = async () => {
      try {
        const res = await fetch(
          `${API}/planner/occasions?year=${selectedYear}&month=${selectedMonth + 1}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        const data = await res.json();

        if (handleApiError(data)) return;

        if (data.success) setOccasions(data.data);

        if (data.success) setOccasions(data.data);
      } catch (err) {
        console.error("Occasion fetch error:", err);
      }
    };
    fetchOccasions();
  }, [selectedYear, selectedMonth]);






  const loadPlannerExecutes = async (filters) => {

    try {

      const params = new URLSearchParams();

      if (filters.startDate) {
          params.append(
              "start_date",
              filters.startDate
          );
      }

      if (filters.endDate) {
          params.append(
              "end_date",
              filters.endDate
          );
      }

      if (filters.stage) {
          params.append(
              "stage",
              filters.stage
          );
      }

      if (filters.product) {
          params.append(
              "product_id",
              filters.product
          );
      }

      if (filters.persona) {
          params.append(
              "persona_id",
              filters.persona
          );
      }

      if (filters.occasion) {
          params.append(
              "occasion_id",
              filters.occasion
          );
      }

      if (filters.mediaType) {
          params.append(
              "media_type",
              filters.mediaType
          );
      }

      if (filters.subType) {
          params.append(
              "subtype_name",
              filters.subType
          );
      }

      if (filters.search) {
          params.append(
              "search",
              filters.search
          );
      }

      const res = await fetch(
        `${API}/planner/carousel-dockets?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      const data = await res.json();

      if (handleApiError(data)) {
        return [];
      }

      if (data.success) {
        return data.data || [];
      }

      return [];

    } catch (err) {

      console.error(err);

      return [];

    }

  };






  const [allMonthDockets, setAllMonthDockets] = useState([]);


  // ========== FETCH DOCKETS FOR SELECTED DATE (right panel) ==========
  const [dockets, setDockets] = useState([]);

useEffect(() => {

    const selectedDate =
        `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;

    const filteredDockets = allMonthDockets.filter((docket) => {

        const dateField =
            docket.uploaded_date_time ||
            docket.planner_date_time ||
            docket.planner_date ||
            docket.date ||
            docket.created_at ||
            "";

        return String(dateField).startsWith(selectedDate);

    });

    setDockets(filteredDockets);

}, [
    selectedYear,
    selectedMonth,
    selectedDay,
    allMonthDockets
]);

  // ========== FETCH ALL MONTH DOCKETS (for calendar chip display) ==========
  

  const getDaysInMonth = (m, y) => {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (m === 1)
      return (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28;
    return daysInMonth[m];
  };

  useEffect(() => {
    const fetchMonthDockets = async () => {
      const pad = (n) => String(n).padStart(2, "0");

      const totalDays = getDaysInMonth(
        selectedMonth,
        selectedYear
      );

      const firstDate =
        `${selectedYear}-${pad(selectedMonth + 1)}-01`;

      const lastDate =
        `${selectedYear}-${pad(selectedMonth + 1)}-${pad(totalDays)}`;

      const data = await loadPlannerExecutes({

          startDate: firstDate,

          endDate: lastDate,

          ...plannerFilters

      });

      setAllMonthDockets(data);
    };


    fetchMonthDockets();
      }, [
      selectedYear,
      selectedMonth,
      plannerFilters
    ]);

  // ========== FETCH PRODUCTS & PERSONAS ==========
  useEffect(() => {
    fetch(`${API}/products`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => { if (data.success) setProductList(data.data); });

    fetch(`${API}/personas`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => { if (data.success) setPersonaList(data.data); });
  }, []);

  // ========== FETCH MEDIA TYPES ==========
  useEffect(() => {
    if (!mode) {
      setMediaTypes([]);
      setMediaType("");
      setSubTypes([]);
      setSubType("");
      return;
    }
    setMediaTypes([]);
    setMediaType("");
    setSubTypes([]);
    setSubType("");

    fetch(`${API}/media-types?mode=${mode}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setMediaTypes(data.data);
        else setMediaTypes([]);
      });
  }, [mode]);

  // ========== FETCH MEDIA SUBTYPES ==========
  useEffect(() => {
    if (!mediaType) {
      setSubTypes([]);
      setSubType("");
      return;
    }
    setSubTypes([]);
    setSubType("");

    fetch(`${API}/media-subtypes?mode=${mode}&mediaType=${mediaType}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setSubTypes(data.data);
        else setSubTypes([]);
      });
  }, [mediaType]);

  // ========== CLOSE DROPDOWNS & MENUS ON OUTSIDE CLICK ==========
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container'))
        setShowUserMenu(false);
      if (showYearDropdown && !event.target.closest('.year-selector'))
        setShowYearDropdown(false);


      if (
          showPlannerFilter &&
          plannerFilterRef.current &&
          !plannerFilterRef.current.contains(event.target)
      ) {
          setShowPlannerFilter(false);
      }

      if (contextMenu.visible && !event.target.closest('.context-menu'))
        setContextMenu(prev => ({ ...prev, visible: false }));
      if (overflowPopup.visible && !event.target.closest('.overflow-popup'))
        setOverflowPopup(prev => ({ ...prev, visible: false }));
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu,
    showYearDropdown,
    showPlannerFilter,
    contextMenu.visible,
    overflowPopup.visible]);

  // ========== CONSTANTS ==========
  const weekDays   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const years = [2024, 2025, 2026, 2027, 2028];

  // ========== CALENDAR LOGIC ==========
  const getFirstDayOfMonth = (m, y) => new Date(y, m, 1).getDay();

  const buildCalendarDays = () => {
    const days     = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const calendarDays = [];

    for (let i = 0; i < firstDay; i++)
      calendarDays.push({ day: null, isCurrentMonth: false });
    for (let i = 1; i <= days; i++)
      calendarDays.push({ day: i, isCurrentMonth: true });

    const remainder = calendarDays.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++)
        calendarDays.push({ day: null, isCurrentMonth: false });
    }

    return calendarDays;
  };

  // ========== OPEN CONTEXT MENU ==========
  const openContextMenu = (e, dateStr, day) => {
    e.preventDefault();
    e.stopPropagation();
    setOverflowPopup(prev => ({ ...prev, visible: false }));
    setSelectedDay(day);
    setContextMenu({ visible: true, x: e.pageX, y: e.pageY, date: dateStr });
  };

  // ========== OPEN OVERFLOW POPUP ==========
  const openOverflowPopup = (e, allItems, day) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(prev => ({ ...prev, visible: false }));
    setSelectedDay(day);

    const x = Math.min(e.pageX, window.innerWidth - 220);
    const y = Math.min(e.pageY, window.innerHeight - 60 - allItems.length * 44);

    const dateStr  = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayLabel = `${String(day).padStart(2, '0')} ${monthNames[selectedMonth]} ${selectedYear}`;

    setOverflowPopup({ visible: true, x, y, items: allItems, dateLabel: dayLabel, dateStr });
  };

  // ========== EVENT HANDLERS ==========
  const handleSubmit = async () => {
    if (!docketTitle || !mode || !mediaType || !subType) {
      alert("Please fill all required fields");
      return;
    }
    try {
      const formattedDateTime =
        `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')} 00:00:00`;

      const res = await fetch(`${API}/planner/docket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: docketTitle,
          tab: activeTab,
          product_id: selectedProductId || null,
          persona_id: selectedPersonaId || null,
          mode,
          mediaType,
          subType,
          planner_date_time: formattedDateTime,
          uploaded_date_time: uploadedDateTime
            ? new Date(uploadedDateTime).toISOString()
            : null,

          execute_description: executeDescription,
          visual_elements: visualElements
        })
      });

      const data = await res.json();
      if (handleApiError(data)) return;

      if (data.success) {
        if (activeTab === "media") {
          navigate(`/docket-media/${data.docket_id}`);
        } else {
          navigate(`/docket/${data.docket_id}`);
        }
      } else alert("Failed to save docket");
    } catch (err) {
      console.error("Save error:", err);
      alert("Server error");
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setDocketTitle("");
    setMode("");
    setMediaType("");
    setSubType("");
    setSelectedProductId("");
    setSelectedPersonaId("");
  };

  const handleSaveOccasion = async () => {
    if (!occasionForm.title) {
      alert("Title required");
      return;
    }
    try {
      let res;
      if (editingOccasion) {
        res = await fetch(`${API}/planner/occasion/${editingOccasion.occasion_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({
            title: occasionForm.title,
            description: occasionForm.description,
            color: occasionForm.color
          })
        });
      } else {
        res = await fetch(`${API}/planner/occasion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({
            title: occasionForm.title,
            description: occasionForm.description,
            color: occasionForm.color,
            occasion_date: occasionForm.date
          })
        });
      }

      const data = await res.json();
      if (handleApiError(data)) return;
      if (data.success) {
        setOccasionModalOpen(false);
        setEditingOccasion(null);
        const refresh = await fetch(
          `${API}/planner/occasions?year=${selectedYear}&month=${selectedMonth + 1}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        const refreshedData = await refresh.json();
        if (refreshedData.success) setOccasions(refreshedData.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshOccasions = async () => {
    const refresh = await fetch(
      `${API}/planner/occasions?year=${selectedYear}&month=${selectedMonth + 1}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );
    const refreshedData = await refresh.json();
    if (refreshedData.success) setOccasions(refreshedData.data);
  };

  const [activeTab, setActiveTab] = useState("prompt");
  const [filterEvents, setFilterEvents] = useState(true);
  const [filterTasks,  setFilterTasks]  = useState(true);

  const filterChips = [
    {
        show: selectedFilterStage,
        label: `Stage: ${selectedFilterStage}`,
        clear: () => setSelectedFilterStage("")
    },
    {
        show: selectedFilterProduct,
        label: `Product: ${
            productList.find(
                p => p.product_id == selectedFilterProduct
            )?.product_name
        }`,
        clear: () => setSelectedFilterProduct("")
    },
    {
        show: selectedFilterPersona,
        label: `Persona: ${
            personaList.find(
                p => p.persona_id == selectedFilterPersona
            )?.persona_name
        }`,
        clear: () => setSelectedFilterPersona("")
    },
    {
        show: selectedFilterOccasion,
        label: `Topic: ${
            occasions.find(
                o => o.occasion_id == selectedFilterOccasion
            )?.title
        }`,
        clear: () => setSelectedFilterOccasion("")
    },
    {
        show: searchText,
        label: `"${searchText}"`,
        clear: () => setSearchText("")
    },
    {
        show: startDate,
        label: `From: ${startDate?.toLocaleDateString()}`,
        clear: () => setStartDate(null)
    },
    {
        show: endDate,
        label: `To: ${endDate?.toLocaleDateString()}`,
        clear: () => setEndDate(null)
    }
].filter(chip => chip.show);


  






  // ========== RENDER ==========
  return (
    <div className="planner-page">
      <div className="planner-content">

        {/* ── SIDEBAR ── */}
        <div className="sidebar">
          <div className="planner-title">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="6" width="24" height="22" rx="3"/>
              <line x1="4" y1="12" x2="28" y2="12"/>
              <line x1="10" y1="3" x2="10" y2="9"/>
              <line x1="22" y1="3" x2="22" y2="9"/>
            </svg>
            <span>Planner</span>
          </div>

          <div className="year-selector">
            <button className="ai-dropdown" onClick={() => setShowYearDropdown(!showYearDropdown)}>
              Year
              <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 8 L2 4 L10 4 Z"/>
              </svg>
            </button>
            {showYearDropdown && (
              <div className="year-dropdown">
                {years.map(year => (
                  <div
                    key={year}
                    className={`year-option ${year === selectedYear ? 'active' : ''}`}
                    onClick={() => { setSelectedYear(year); setShowYearDropdown(false); }}
                  >
                    {year}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="months-list">
            {monthNames.map((month, index) => (
              <button
                key={month}
                className={`month-btn ${index === selectedMonth ? 'always-active' : ''}`}
                onClick={() => setSelectedMonth(index)}
              >
                {month}
              </button>
            ))}
          </div>
        </div>

        {/* ── CALENDAR SECTION ── */}
        <div className="calendar-section">
          <div className="calendar-header">
            <div className="month-navigation">
              <span className="current-month">{monthNames[selectedMonth]}</span>
              <span className="year-display">{selectedYear}</span>
            </div>

            <div className="filter-buttons">

              <div
                  className="dm-filter-wrapper"
                  ref={plannerFilterRef}
              >

                  <button
                      className="filter-btn"
                      onClick={() =>
                          setShowPlannerFilter(v => !v)
                      }
                      aria-label="Filter"
                      title="Filter"
                  >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 4.5h18L14 13v6.5l-4 2.2V13L3 4.5z" fill="currentColor"/>
                      </svg>
                  </button>


                  {showPlannerFilter && (
                    <div className="dm-filter-dropdown-new">
                      <div className="dm-filter-header">Filter Executes</div>


                      <div className="dm-filter-date-row">

                      <div className="dm-filter-field">
                        <label>Start Date</label>
                        <DatePicker
                          selected={startDate}
                          onChange={(date) => setStartDate(date)}
                          dateFormat="yyyy-MM-dd"
                          placeholderText="Select start date"
                          className="dm-filter-date-input"
                        />
                      </div>

                      <div className="dm-filter-field">
                        <label>End Date</label>
                        <DatePicker
                          selected={endDate}
                          onChange={(date) => setEndDate(date)}
                          dateFormat="yyyy-MM-dd"
                          placeholderText="Select end date"
                          className="dm-filter-date-input"
                        />
                      </div>
                      </div>

                      <div className="dm-filter-field">
                        <label>Stage</label>
                        <select
                          className="dm-filter-stage-select"
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

                      <div className="dm-filter-field">
                        <label>Topic</label>
                        <select
                          className="dm-filter-stage-select"
                          value={selectedFilterOccasion}
                          onChange={(e) => setSelectedFilterOccasion(e.target.value)}
                        >
                          <option value="">All Topics</option>
                          {occasions.map((event) => (
                            <option key={event.occasion_id} value={event.occasion_id}>
                              {event.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="dm-filter-field">
                        <label>Product</label>
                        <select
                          value={selectedFilterProduct}
                          onChange={(e) => setSelectedFilterProduct(e.target.value)}
                        >
                          <option value="">All Products</option>
                          {productList.map(product => (
                            <option key={product.product_id} value={product.product_id}>
                              {product.product_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="dm-filter-field">
                        <label>Persona</label>
                        <select
                          value={selectedFilterPersona}
                          onChange={(e) => setSelectedFilterPersona(e.target.value)}
                        >
                          <option value="">All Personas</option>
                          {personaList.map(persona => (
                            <option key={persona.persona_id} value={persona.persona_id}>
                              {persona.persona_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="dm-filter-field">
                        <label>Search</label>
                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          placeholder="Search title"
                        />
                      </div>

                      <button
                        className="dm-filter-clear-btn"
                        onClick={() => {
                          setStartDate(null);
                          setEndDate(null);
                          setSelectedFilterStage("");
                          setSelectedFilterProduct("");
                          setSelectedFilterPersona("");
                          setSelectedFilterMediaType("");
                          setSelectedFilterOccasion("");
                          setSelectedFilterSubType("");
                          setSearchText("");
                          setShowPlannerFilter(false)
                        }}
                      >
                        Clear Filter
                      </button>
                    </div>
                  )}

                  </div>
                  
                  


              <div className="planner-filter-chip-box">
              <div className="planner-filter-chips">

                  {filterChips.map((chip, index) => (
                      <div
                          key={index}
                          className="planner-filter-chip"
                      >
                          <span>{chip.label}</span>

                          <button
                              className="planner-filter-chip-remove"
                              onClick={chip.clear}
                          >
                              ✕
                          </button>
                      </div>
                  ))}

              </div>
          </div>





            </div>

          </div>

          <div className="calendar-weekdays">
            {weekDays.map(d => (
              <div key={d} className="weekday-cell">{d}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {buildCalendarDays().map((dayObj, index) => {
              if (!dayObj.isCurrentMonth) {
                return <div key={index} className="calendar-day empty-day" />;
              }

              const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;

              // Events (occasions)
              const dayOccasions = filterEvents
                ? occasions.filter(o => o.occasion_date === dateStr).map(o => ({ ...o, _type: 'occasion' }))
                : [];

              // Execute (dockets) — blue chips
              const dayDockets = filterTasks
                ? allMonthDockets.filter(d => {
                    const dateField =
                      d.uploaded_date_time ||
                      d.planner_date_time ||
                      d.planner_date ||
                      d.date ||
                      d.created_at ||
                      "";
                                        return String(dateField).startsWith(dateStr);
                  }).map(d => ({ ...d, _type: 'docket' }))
                : [];

              const allDayItems   = [...dayOccasions, ...dayDockets];
              const MAX_VISIBLE   = 2;
              const visibleItems  = allDayItems.slice(0, MAX_VISIBLE);
              const overflowCount = allDayItems.length - MAX_VISIBLE;

              return (
                <div
                  key={index}
                  onClick={(e) => openContextMenu(e, dateStr, dayObj.day)}
                  onContextMenu={(e) => openContextMenu(e, dateStr, dayObj.day)}
                  className={`calendar-day${dayObj.day === selectedDay ? ' active-day' : ''}`}
                >
                  <div className="day-number">
                    {String(dayObj.day).padStart(2, '0')}
                  </div>

                  <div className="occasion-container">
                    {visibleItems.map((item) => {
                      if (item._type === 'occasion') {
                        return (
                          <div
                            key={`occ-${item.occasion_id}`}
                            className="occasion-chip"
                            style={{ backgroundColor: item.color || '#e74c3c' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingOccasion(item);
                              setOccasionForm({
                                title: item.title,
                                description: item.description || "",
                                color: item.color,
                                date: item.occasion_date
                              });
                              setOccasionModalOpen(true);
                            }}
                          >
                            {item.title}
                          </div>
                        );
                      } else {
                        return (
                          <div
                            key={`doc-${item.docket_id}`}
                            className="occasion-chip docket-chip"
                            onClick={(e) => {
                              e.stopPropagation();
                              const type = item.tab?.toLowerCase();
                              if (type === "media") navigate(`/docket-media/${item.docket_id}`);
                              else navigate(`/docket/${item.docket_id}`);
                            }}
                          >
                            {item.title}
                          </div>
                        );
                      }
                    })}

                    {overflowCount > 0 && (
                      <div
                        className="occasion-chip occasion-overflow-chip"
                        onClick={(e) => openOverflowPopup(e, allDayItems, dayObj.day)}
                      >
                        +{overflowCount} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          <div className="date-display">
            {String(selectedDay).padStart(2, '0')}/
            {String(selectedMonth + 1).padStart(2, '0')}/
            {selectedYear}
          </div>

          <button className="ai-btn add-btn" onClick={() => setShowModal(true)}>+</button>

          <div className="projects-list">
            {dockets.map(docket => (
              <div key={docket.docket_id} className="project-card">
                <h3 className="project-title">{docket.title}</h3>
                <div className="project-details">
                  <p>{docket.media_name}</p>
                  <p>{docket.media_type}</p>
                  <p>{docket.subtype_name}</p>
                  {docket.product_name && <p>{docket.product_name}</p>}
                  {docket.persona_name && <p>{docket.persona_name}</p>}
                </div>
                <button
                  className="ai-btn ai-btn-sm"
                  onClick={() => {
                    const type = docket.tab?.toLowerCase();
                    if (type === "media") navigate(`/docket-media/${docket.docket_id}`);
                    else navigate(`/docket/${docket.docket_id}`);
                  }}
                >
                  EDIT
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── OVERFLOW POPUP ── */}
      {overflowPopup.visible && (
        <div
          className="overflow-popup"
          style={{ top: overflowPopup.y, left: overflowPopup.x }}
        >
          <div className="overflow-popup-header">
            <span className="overflow-popup-date">{overflowPopup.dateLabel}</span>
            <button
              className="overflow-popup-close"
              onClick={() => setOverflowPopup(prev => ({ ...prev, visible: false }))}
            >
              ✕
            </button>
          </div>
          <div className="overflow-popup-list">
            {(overflowPopup.items || []).map((item) => {
              if (item._type === 'occasion') {
                return (
                  <div
                    key={`occ-${item.occasion_id}`}
                    className="overflow-popup-item"
                    onClick={() => {
                      setOverflowPopup(prev => ({ ...prev, visible: false }));
                      setEditingOccasion(item);
                      setOccasionForm({
                        title: item.title,
                        description: item.description || "",
                        color: item.color,
                        date: item.occasion_date
                      });
                      setOccasionModalOpen(true);
                    }}
                  >
                    <span className="overflow-popup-dot" style={{ backgroundColor: item.color || '#e74c3c' }} />
                    <span className="overflow-popup-title">{item.title}</span>
                    {item.description && (
                      <span className="overflow-popup-desc">{item.description}</span>
                    )}
                  </div>
                );
              } else {
                return (
                  <div
                    key={`doc-${item.docket_id}`}
                    className="overflow-popup-item"
                    onClick={() => {
                      setOverflowPopup(prev => ({ ...prev, visible: false }));
                      const type = item.tab?.toLowerCase();
                      if (type === "media") navigate(`/docket-media/${item.docket_id}`);
                      else navigate(`/docket/${item.docket_id}`);
                    }}
                  >
                    <span className="overflow-popup-dot" style={{ backgroundColor: '#4B479E' }} />
                    <span className="overflow-popup-title">{item.title}</span>
                    <span className="overflow-popup-desc">Execute</span>
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}

      {/* ── CONTEXT MENU ── */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div
            className="context-menu-item"
            onClick={() => {
              setEditingOccasion(null);
              setOccasionForm({ title: "", description: "", color: "#e74c3c", date: contextMenu.date });
              setOccasionModalOpen(true);
              setContextMenu({ ...contextMenu, visible: false });
            }}
          >
            Add Event
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              setShowModal(true);
              setContextMenu({ ...contextMenu, visible: false });
            }}
          >
            Add Execute
          </div>
        </div>
      )}

      {/* ── DOCKET MODAL ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <line x1="1" y1="1" x2="13" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="13" y1="1" x2="1" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="modal-tabs">
              <label className={`tab-button ${activeTab === 'prompt' ? 'active' : ''}`}>
                <span>Prompt</span>
                <input type="radio" name="tab" className="tab-radio"
                  checked={activeTab === 'prompt'} onChange={() => setActiveTab('prompt')} />
              </label>
              <label className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}>
                <span>Media</span>
                <input type="radio" name="tab" className="tab-radio"
                  checked={activeTab === 'media'} onChange={() => setActiveTab('media')} />
              </label>
            </div>

            <div className="modal-body">
              <div className="schedule-row">

                <div className="schedule-title-field">
                  <label className="form-label">Execute Title:</label>

                  <input
                    type="text"
                    className="form-input"
                    value={docketTitle}
                    onChange={e => setDocketTitle(e.target.value)}
                  />
                </div>

                <div className="schedule-picker-field">
                  <label className="form-label">Upload Schedule:</label>

                  <DatePicker
                    selected={uploadedDateTime}
                    popperPlacement="bottom-end"
                    onChange={(date) => setUploadedDateTime(date)}
                    showTimeSelect
                    dateFormat="MMM d, yyyy h:mm aa"
                    timeFormat="hh:mm aa"
                    timeIntervals={15}
                    className="planner-datepicker"
                    placeholderText="Select upload time"
                  />
                </div>

              </div>


              <div className="docket-form-group">
                <label>Execute Description</label>

                <textarea
                  value={executeDescription}
                  onChange={(e) => setExecuteDescription(e.target.value)}
                  placeholder="Enter execute description..."
                />
              </div>

              <div className="docket-form-group">
                <label>Visual Elements</label>

                <textarea
                  value={visualElements}
                  onChange={(e) => setVisualElements(e.target.value)}
                  placeholder="Enter visual elements..."
                />
              </div>

              <div className="form-row">
                <label className="form-label">Prompt Type:</label>
                <select
                  className="form-input"
                  value={mode}
                  onChange={e => { setMode(e.target.value); setMediaType(""); setSubType(""); }}
                >
                  <option value="">Select Prompt Type</option>
                  <option value="message">Message</option>
                  <option value="visuals">Visuals</option>
                </select>
              </div>

              {mode && (
                <div className="form-row">
                  <label className="form-label">{mode === "message" ? "Message Type:" : "Visual Type:"}</label>
                  <select
                    className="form-input"
                    value={mediaType}
                    onChange={e => { setMediaType(e.target.value); setSubType(""); }}
                  >
                    <option value="">Select Type</option>
                    {mediaTypes.map(t => (
                      <option key={t.media_type} value={t.media_type}>{t.media_type}</option>
                    ))}
                  </select>
                </div>
              )}

              {mediaType && (
                <div className="form-row">
                  <label className="form-label">{mode === "message" ? "Message Sub Type:" : "Visual Sub Type:"}</label>
                  <select
                    className="form-input"
                    value={subType}
                    onChange={e => setSubType(e.target.value)}
                  >
                    <option value="">Select Sub Type</option>
                    {subTypes.map(s => (
                      <option key={s.subtype_name} value={s.subtype_name}>{s.subtype_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-row">
                <label className="form-label">Product:</label>
                <select
                  className="form-input"
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                >
                  <option value="">Select Product</option>
                  {productList.map(p => (
                    <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label className="form-label">Persona:</label>
                <select
                  className="form-input"
                  value={selectedPersonaId}
                  onChange={e => setSelectedPersonaId(e.target.value)}
                >
                  <option value="">Select Persona</option>
                  {personaList.map(p => (
                    <option key={p.persona_id} value={p.persona_id}>{p.persona_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={handleCancel}>CANCEL</button>
              <button className="modal-save-btn" onClick={handleSubmit}>DONE</button>
            </div>
          </div>
        </div>
      )}

      {/* ── OCCASION MODAL ── */}
      {occasionModalOpen && (
        <div className="modal-overlay" onClick={() => setOccasionModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setOccasionModalOpen(false); setEditingOccasion(null); }}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <line x1="1" y1="1" x2="13" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="13" y1="1" x2="1" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="occasion-modal-header">
              {editingOccasion ? "Update Event" : "Add Event"}
            </div>

            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Title:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Event title"
                  value={occasionForm.title}
                  onChange={e => setOccasionForm({ ...occasionForm, title: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label className="form-label">Description:</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Description (optional)"
                  value={occasionForm.description}
                  onChange={e => setOccasionForm({ ...occasionForm, description: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label className="form-label">Color:</label>
                <input
                  type="color"
                  className="form-color"
                  value={occasionForm.color}
                  onChange={e => setOccasionForm({ ...occasionForm, color: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => { setOccasionModalOpen(false); setEditingOccasion(null); }}>
                Cancel
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                {editingOccasion && (
                  <button
                    className="modal-save-btn modal-danger-btn"
                    onClick={async () => {
                      await fetch(`${API}/planner/occasion/${editingOccasion.occasion_id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                      });
                      setOccasionModalOpen(false);
                      setEditingOccasion(null);
                      await refreshOccasions();
                    }}
                  >
                    Delete
                  </button>
                )}
                <button className="modal-save-btn" onClick={handleSaveOccasion}>
                  {editingOccasion ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {popup.show && (
        <div className="ai-popup-overlay">
          <div className={`ai-popup ${popup.type}`}>
            <div className="ai-popup-icon">
              {popup.type === "warning" ? "⚠️" : "✅"}
            </div>
            <h3>{popup.title}</h3>
            <p>{popup.message}</p>

            <div className="ai-popup-actions">
              {popup.cancelLabel && (
                <button
                  className="ai-btn ai-popup-cancel"
                  onClick={() => setPopup(p => ({ ...p, show: false }))}
                >
                  {popup.cancelLabel}
                </button>
              )}

              <button
                className="ai-btn ai-popup-close"
                onClick={() => {
                  if (popup.onConfirm) popup.onConfirm();
                  setPopup(p => ({ ...p, show: false }));
                }}
              >
                {popup.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
