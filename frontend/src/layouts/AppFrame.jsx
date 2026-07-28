import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select, { components } from "react-select";

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

    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}



const ValueContainer = (props) => {

    const count = props.getValue().length;

    const placeholder =
        props.selectProps.placeholder;

    return (

        <components.ValueContainer {...props}>

            <span
                style={{
                    fontSize: 11,
                    color: "#333"
                }}
            >
                {
                    count === 0
                        ? placeholder
                        : `${placeholder} ${count}`
                }
            </span>

        </components.ValueContainer>

    );

};



function getVisiblePages(currentPage, totalPages) {

    if (totalPages <= 7) {

        return Array.from(
            { length: totalPages },
            (_, i) => i + 1
        );

    }

    if (currentPage <= 4) {

        return [
            1,
            2,
            3,
            4,
            5,
            "...",
            totalPages
        ];

    }

    if (currentPage >= totalPages - 3) {

        return [
            1,
            "...",
            totalPages - 4,
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages
        ];

    }

    return [

        1,

        "...",

        currentPage - 1,

        currentPage,

        currentPage + 1,

        "...",

        totalPages

    ];

}





function ExecutePanel({
    executeCards,
    currentPage,
    totalPages,
    setCurrentPage,
    onPreviousExecute,
    onNextExecute,
    loadCarouselDockets
}) {
    const visiblePages = getVisiblePages(
          currentPage,
          totalPages);

    return (
      
      

        <aside className="app-right-panel">
                
                <div className="carousel-panel-new">
                  {executeCards}

                </div>

                <div className="carousel-control-card">
                  <button
                      className="left-arrow"
                      title="Previous Page"
                      disabled={currentPage === 1}
                      onClick={() => loadCarouselDockets(currentPage - 1)}
                  >
                    <img
                      src="/all_svg_icons/appframe_left_page.svg"
                      alt="Previous Page"
                      className="button-svg-icon"
                  />
                  </button>

                  <button
                      className="right-arrow"
                      title="Next Page"
                      disabled={currentPage === totalPages}
                      onClick={() => loadCarouselDockets(currentPage + 1)}
                  >
                    <img
                      src="/all_svg_icons/appframe_right_page.svg"
                      alt="Next Page"
                      className="button-svg-icon"
                  />
                  </button>


                  <button
                    className="change-left-arrow"
                    title="Previous Execute"
                    onClick={onPreviousExecute}
                  >
                    <img
                      src="/all_svg_icons/appframe_left_arrow.svg"
                      alt="Previous Execute"
                      className="button-svg-icon"
                  />
                  </button>


                  <button
                    className="change-right-arrow"
                    title="Next Execute"
                    onClick={onNextExecute}
                  >
                    <img
                      src="/all_svg_icons/appframe_right_arrow.svg"
                      alt="Next Execute"
                      className="button-svg-icon"
                  />
                  </button>


                  

                </div>


                <div className="carousel-pagination">

                  
                  <button
                      className="arrow"
                      disabled={currentPage === 1}
                      onClick={() => loadCarouselDockets(currentPage - 1)}
                  >
                    <img
                      src="/all_svg_icons/appframe_left_page.svg"
                      alt="Next Page"
                      className="button-svg-icon"
                  />
                    
                  </button>

                  {visiblePages.map((page, index) => {

                    if (page === "...") {

                        return (

                            <span
                                key={`dots-${index}`}
                                className="pagination-dots"
                            >
                                ...
                            </span>

                        );

                    }

                    return (

                        <span
                            key={page}
                            className={
                                page === currentPage
                                    ? "pagination-number active"
                                    : "pagination-number"
                            }
                            onClick={() => loadCarouselDockets(page)}
                        >

                            {page}

                        </span>

                    );

                })}

                  <button
                      className="arrow"
                      disabled={currentPage === totalPages}
                      onClick={() => loadCarouselDockets(currentPage + 1)}
                  >
                      <img
                      src="/all_svg_icons/appframe_right_page.svg"
                      alt="Next Page"
                      className="button-svg-icon"
                  />
                  </button>

              </div>

                
              </aside>

    );
}








export default function AppFrame() {

  const navigate = useNavigate();
  const location = useLocation();

  // ── Account ────────────────────────────────────────────────────────────
  const [businessName, setBusinessName] = useState("My Business");
  const [email, setEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const [activePanel, setActivePanel] = useState({
      topic: false,
      ai: false,
      basic: false,
      detail: false,
      interactive: false,
      stage: false,
  });

  // ── Reference lists (used by the filter dropdown) ────────────────────────
  const [productList, setProductList] = useState([]);
  const [personaList, setPersonaList] = useState([]);
  const [occasionList, setOccasionList] = useState([]);          // Create Execute

  // ── Filter Lists Data (AppFrame Filter Endpoints) ──────────────────────────────
  const [filterOccasionList, setFilterOccasionList] = useState([]);
  const [filterProductList, setFilterProductList] = useState([]);
  const [filterPersonaList, setFilterPersonaList] = useState([]);
  const [filterStageList, setFilterStageList] = useState([]);

  // ── Filter state List of selected dropdown──────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedFilterOccasion, setSelectedFilterOccasion] = useState([]);
  const [selectedFilterProduct, setSelectedFilterProduct] = useState([]);
  const [selectedFilterPersona, setSelectedFilterPersona] = useState([]);
  const [selectedFilterStage, setSelectedFilterStage] = useState([]);

  // ── Get selected ──────────────────────────────────────────────────────
  const [appliedFilters, setAppliedFilters] = useState({
      startDate: null,
      endDate: null,
      occasions: [],
      products: [],
      personas: [],
      stages: [],
      search: ""
  });
  

  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("");

  const [panelPosition, setPanelPosition] = useState("right");

  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);

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

  // Pagination 
  const [currentPage, setCurrentPage] = useState(1);

  const [pageSize] = useState(10);

  const [totalPages, setTotalPages] = useState(1);
  
  




  // Lets the currently open execute (if any) highlight itself in the panel.
  const activeDocketId = useMemo(() => {

    const match = location.pathname.match(
        /^\/(docket-media|design)\/([^/]+)/
    );

    return match ? match[2] : null;

}, [location.pathname]);




const goToPreviousExecute = async () => {

    const index = carouselDockets.findIndex(
        d => String(d.docket_id) === String(activeDocketId)
    );

    if (index === -1)
        return;

    // Previous execute exists
    if (index > 0) {

        navigate(
            `/docket-media/${carouselDockets[index - 1].docket_id}`
        );

        return;
    }

    // First execute on page
    if (currentPage <= 1)
        return;

    const previousDockets =
        await loadCarouselDockets(currentPage - 1);

    if (!previousDockets.length)
        return;

    navigate(
        `/docket-media/${
            previousDockets[
                previousDockets.length - 1
            ].docket_id
        }`
    );

};




const goToNextExecute = async () => {

    const index = carouselDockets.findIndex(
        d => String(d.docket_id) === String(activeDocketId)
    );

    if (index === -1)
        return;

    // Next execute exists on current page
    if (index < carouselDockets.length - 1) {

        navigate(
            `/docket-media/${carouselDockets[index + 1].docket_id}`
        );

        return;
    }

    // Last execute on page
    if (currentPage >= totalPages)
        return;

    const nextDockets =
        await loadCarouselDockets(currentPage + 1);

    if (!nextDockets.length)
        return;

    navigate(
        `/docket-media/${nextDockets[0].docket_id}`
    );

};









  const filterSelectStyles = {

    container: (base) => ({
        ...base,
        width: "100%"
        
    }),

    control: (base, state) => ({
        ...base,

        minHeight: 36,
        height: 36,

        backgroundColor: "#ffffff",

        border: `1px solid ${
            state.isFocused
                ? "#4B479E"
                : "#dcdfe6"
        }`,

        borderRadius: 6.3,

        boxShadow: state.isFocused
            ? "0 0 0 3px rgba(75,71,158,.10)"
            : "none",

        cursor: "pointer",

        transition: "all .15s ease",

        "&:hover": {
            borderColor: state.isFocused
                ? "#4B479E"
                : "#dcdfe6"
        }
    }),

    valueContainer: (base) => ({
        ...base,

        height: 34,

        padding: "0 8px",

        display: "flex",

        alignItems: "center"
    }),

    input: (base) => ({
        ...base,
        margin: 0,
        padding: 0
    }),

    placeholder: (base) => ({
        ...base,

        color: "#333",

        fontSize: 11,

        margin: 0
    }),

    indicatorSeparator: () => ({
        display: "none"
    }),

    dropdownIndicator: (base) => ({
        ...base,

        color: "#888",

        padding: 4
    }),

    menu: (base) => ({
        ...base,

        marginTop: 4,

        border: "1px solid #dcdfe6",

        borderRadius: 6.3,

        overflow: "hidden",

        boxShadow:
            "0 8px 20px rgba(226, 13, 13, 0.1)",

        zIndex: 99999
    }),

    menuList: (base) => ({
        ...base,
        overflowX: "hidden",

        paddingTop: 4,

        paddingBottom: 4
    }),

    option: (base, state) => ({
        ...base,
        whiteSpace: "normal",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        display: "flex",
        alignItems: "flex-start",

        backgroundColor:
            state.isFocused
                ? "#f6f7fb"
                : "#fff",

        color: "#333",

        fontSize: 11,

        padding: "8px 10px",

        cursor: "pointer",

        ":active": {
            background: "#eef0ff"
        }
    })
};




  const CheckboxOption = (props) => (

    <components.Option {...props}>

        <div
            style={{
                display: "flex",
                alignItems: "center",
                width: "100%"
            }}
        >

            <input
                type="checkbox"
                checked={props.isSelected}
                readOnly
                style={{
                    width: 14,
                    height: 14,
                    margin: 0,
                    marginRight: 10,
                    accentColor: "#4B479E",
                    cursor: "pointer",
                    flexShrink: 0
                }}
            />

            <span
                style={{
                    fontSize: 11,
                    color: "#333",
                    lineHeight: 1.2
                }}
            >
                {props.label}
            </span>

        </div>

    </components.Option>

);



  
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
      appliedFilters
  ]);




  function get_selected_filters() {

    setCurrentPage(1);

    setAppliedFilters({

        startDate,

        endDate,

        occasions: selectedFilterOccasion,

        products: selectedFilterProduct,

        personas: selectedFilterPersona,

        stages: selectedFilterStage,

        search: searchText

    });

}


  function applyPlannerDateFilter(start, end) {

    setStartDate(start);

    setEndDate(end);

}


  useEffect(() => {

      get_selected_filters();

  }, [
      startDate,
      endDate
  ]);









  function buildCarouselFilterParams() {

    const params = new URLSearchParams();

    if (appliedFilters.startDate) {
      params.append("start_date", formatDate(appliedFilters.startDate));
    }

    if (appliedFilters.endDate) {
      params.append("end_date", formatDate(appliedFilters.endDate));
    }

    appliedFilters.stages.forEach(stage => {
        params.append(
            "stage",
            stage.value
        );
    });

    appliedFilters.products.forEach(product => {
        params.append(
            "product_id",
            product.value
        );
    });

    appliedFilters.personas.forEach(persona => {
        params.append(
            "persona_id",
            persona.value
        );
    });

    appliedFilters.occasions.forEach(occasion => {
        params.append(
            "occasion_id",
            occasion.value
        );
    });

    if (appliedFilters.search.trim()) {
        params.append(
            "search",
            appliedFilters.search.trim()
        );
    }

    return params;
  }




  async function loadFilterLists() {


    fetch(`${API}/appframe/filter-occasion`, {
        headers: AUTH()
    })
    .then(res => {
        if (res.status === 401) {
            logout();
            return null;
        }
        return res.json();
    })
    .then(data => {
        if (data?.success) {
            setFilterOccasionList(
              (data.data.occasions || []).map(item => ({
                  value: item.id,
                  label: item.display_name,
                  ...item
              }))
            );
        }
    })
    .catch(err =>
        console.error(
            "Failed to load filter occasions",
            err
        )
    );



    fetch(`${API}/appframe/filter-product`, {
        headers: AUTH()
    })
    .then(res => {
        if (res.status === 401) {
            logout();
            return null;
        }
        return res.json();
    })
    .then(data => {
        if (data?.success) {
            setFilterProductList(
                (data.data.products || []).map(item => ({
                    value: item.id,
                    label: item.display_name,
                    ...item
                }))
            );
        }
    })
    .catch(err =>
        console.error(
            "Failed to load filter products",
            err
        )
    );



    fetch(`${API}/appframe/filter-persona`, {
        headers: AUTH()
    })
    .then(res => {
        if (res.status === 401) {
            logout();
            return null;
        }
        return res.json();
    })
    .then(data => {
        if (data?.success) {
            setFilterPersonaList(
                (data.data.personas || []).map(item => ({
                    value: item.id,
                    label: item.display_name,
                    ...item
                }))
            );
        }
    })
    .catch(err =>
        console.error(
            "Failed to load filter personas",
            err
        )
    );




    fetch(`${API}/appframe/filter-stage`, {
        headers: AUTH()
    })
    .then(res => {
        if (res.status ===401) {
            logout();
            return null;
        }
        return res.json();
    })
    .then(data => {
        if (data?.success) {
            setFilterStageList(
                (data.data.stages || []).map(item => ({
                    value: item.stage_name,
                    label: item.stage_name,
                    ...item
                }))
            );
        }
    })
    .catch(err =>
        console.error(
            "Failed to load filter stages",
            err
        )
    );

  }



  useEffect(() => {
      loadFilterLists();
  }, []);









  async function fetchStageCounts() {

    try {

      const params = buildCarouselFilterParams();

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
  async function loadCarouselDockets(page) {

    try {

        const params = buildCarouselFilterParams();

        params.append("page", page);
        params.append("page_size", pageSize);

        const res = await fetch(
            `${API}/planner/carousel-dockets?${params.toString()}`,
            {
                headers: AUTH()
            }
        );

        if (res.status === 401) {
            logout();
            return [];
        }

        const data = await res.json();

        if (!data.success)
            return [];

        setCarouselDockets(data.data || []);

        setTotalPages(
            Math.max(
                1,
                Math.ceil(data.total / pageSize)
            )
        );

        setCurrentPage(page);

        return data.data || [];

    }
    catch (err) {

        console.error(err);

        return [];
    }
}




  useEffect(() => {

      loadCarouselDockets(1);

  }, [
      appliedFilters
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

    setSelectedFilterStage([]);

    setSelectedFilterProduct([]);

    setSelectedFilterPersona([]);

    setSelectedFilterOccasion([]);

    setSearchText("");

    setAppliedFilters({
        startDate: null,
        endDate: null,
        occasions: [],
        products: [],
        personas: [],
        stages: [],
        search: ""
    });

    setShowFilterDropdown(false);

}

  // ── Active filter pills ──────────────────────────────────────────────────
  const activeFilters = useMemo(() => {

    const pills = [];


    if (appliedFilters.startDate) {
      pills.push({
        key: "startDate",
        label: `From ${formatDate(appliedFilters.startDate)}`,
        clear: () => {

            setStartDate(null);

            setAppliedFilters(prev => ({
                ...prev,
                startDate: null
            }));

        }
      });
    }

    if (appliedFilters.endDate) {
      pills.push({
        key: "endDate",
        label: `To ${formatDate(appliedFilters.endDate)}`,
        clear: () => {

            setEndDate(null);

            setAppliedFilters(prev => ({
                ...prev,
                endDate: null
            }));

        }
      });
    }



    appliedFilters.occasions.forEach(occasion => {

        pills.push({

            key: `occasion-${occasion.value}`,

            label: occasion.label,

            clear: () => {

                const updated = selectedFilterOccasion.filter(
                    x => x.value !== occasion.value
                );

                setSelectedFilterOccasion(updated);

                setAppliedFilters(prev => ({
                    ...prev,
                    occasions: updated
                }));

            }

        });

    });

    

    appliedFilters.products.forEach(product => {

        pills.push({

            key: `product-${product.value}`,

            label: product.label,

            clear: () => {

                const updated = selectedFilterProduct.filter(
                    x => x.value !== product.value
                );

                setSelectedFilterProduct(updated);

                setAppliedFilters(prev => ({
                    ...prev,
                    products: updated
                }));

            }

        });

    });

    appliedFilters.personas.forEach(persona => {

        pills.push({

            key: `persona-${persona.value}`,

            label: persona.label,

            clear: () => {

                const updated = selectedFilterPersona.filter(
                    x => x.value !== persona.value
                );

                setSelectedFilterPersona(updated);

                setAppliedFilters(prev => ({
                    ...prev,
                    personas: updated
                }));

            }

        });

    });

    


    appliedFilters.stages.forEach(stage => {
        pills.push({
            key: `stage-${stage.value}`,
            label: stage.label,
            clear: () => {

                const updated = selectedFilterStage.filter(
                    x => x.value !== stage.value
                );

                setSelectedFilterStage(updated);

                setAppliedFilters(prev => ({
                    ...prev,
                    stages: updated
                }));

            }
        });
    });

    

    if (appliedFilters.search.trim()) {
      pills.push({
        key: "search",
        label: `"${appliedFilters.search}"`,
        clear: () => {

            setSearchText("");

            setAppliedFilters(prev => ({
                ...prev,
                search: ""
            }));

        }
      });
    }

    return pills;

  }, [
          appliedFilters
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
    { label: "Purpose",  route: "/setup-business", icon: (
        <img
            src="/all_svg_icons/appframe_purpose.svg"
            alt="Purpose"
            className="button-svg-icon"
        />
    ) },


    { label: "Solution", route: "/product",         icon: (
        <img
            src="/all_svg_icons/appframe_solution.svg"
            alt="Solution"
            className="button-svg-icon"
        />
    )},


    { label: "Audience", route: "/persona",         icon: (
        <img
            src="/all_svg_icons/appframe_audience.svg"
            alt="Audience"
            className="button-svg-icon"
        />
    ) },


    { label: "Planner2",  route: "/planner",         icon: (
        <img
            src="/all_svg_icons/appframe_planner.svg"
            alt="Planner"
            className="button-svg-icon"
        />
    )},


    { label: "Execute",  route: "execute",          icon: (
        <img
            src="/all_svg_icons/appframe_execute.svg"
            alt="Execute"
            className="button-svg-icon"
        />
    ) },


    { label: "Planner",  route: "/planner",         icon: (
        <img
            src="/all_svg_icons/appframe_planner.svg"
            alt="Planner"
            className="button-svg-icon"
        />
    ) },


    { label: "Design",  route: "/design",          icon: (
        <img
            src="/all_svg_icons/appframe_execute.svg"
            alt="Design"
            className="button-svg-icon"
        />
    ) }
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
                className={`dm-carousel-item${
                    isActive ? ' dm-carousel-item--active' : ''
                }`}
                onDoubleClick={() => {
                    if (location.pathname.startsWith("/design")) {

    navigate(`/design/${item.docket_id}`);

}
else {

    navigate(`/docket-media/${item.docket_id}`);

} 
                }}
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
          onClick={() => navigate("/planner")}
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

    // ===========================
    // DESIGN PAGE
    // ===========================
    if (item.route === "/design") {

        // If an execute is already open,
        // open the same execute in Design.
        if (activeDocketId) {
            navigate(`/design/${activeDocketId}`);
            return;
        }

        // Otherwise open the default execute.
        try {

            const res = await fetch(
                `${API}/execute/default`,
                { headers: AUTH() }
            );

            const data = await res.json();

            if (data.success && data.docket_id) {
                navigate(`/design/${data.docket_id}`);
            }
            else {
                alert(data.message || "No execute found");
            }

        } catch (err) {

            console.error(err);
            navigate("/planner");

        }

        return;
    }

    // ===========================
    // EXECUTE PAGE
    // ===========================
    if (item.route === "execute") {

        // If an execute is already open,
        // open the same execute in Execute page.
        if (activeDocketId) {
            navigate(`/docket-media/${activeDocketId}`);
            return;
        }

        // Otherwise open the default execute.
        try {

            const res = await fetch(
                `${API}/execute/default`,
                { headers: AUTH() }
            );

            const data = await res.json();

            if (data.success && data.docket_id) {
                navigate(`/docket-media/${data.docket_id}`);
            }
            else {
                alert(data.message || "No execute found");
            }

        } catch (err) {

            console.error(err);
            navigate("/planner");

        }

        return;
    }

    // ===========================
    // ALL OTHER PAGES
    // ===========================
    navigate(item.route);

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
              <img
                  src="/all_svg_icons/appframe_profile.svg"
                  alt="Profile"
                  className="button-svg-icon"
              />

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
                onClick={() => setShowFilterDropdown(prev => !prev)}
              >
                <img
                    src="/all_svg_icons/appframe_filter.svg"
                    alt="Filter"
                    className="button-svg-icon"
                />
              </button>

              

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
                      <img
                      src="/all_svg_icons/appframe_top.svg"
                      alt="Top View"
                      className="button-svg-icon"
                  />
                    </button>

                    <button
                        className={panelPosition === "right" ? "active" : ""}
                        onClick={() => setPanelPosition("right")}
                    >
                      <img
                      src="/all_svg_icons/appframe_right.svg"
                      alt="Right View"
                      className="button-svg-icon"
                  />
                      
                    </button>
                </div>

          </div>

        </header>





            {showFilterDropdown && (
                <div className="header-filter-bar">


                  <button
                  className="header-filter-refresh-btn"
                      onClick={() => {
                          loadFilterLists();
                          get_selected_filters();
                      }}
                  >
                      Refresh
                  </button>

                  <div className="header-filter-field">

                      <DatePicker
                          className="header-filter-date-input"
                          selected={startDate}
                          onChange={setStartDate}
                          
                          dateFormat="yyyy-MM-dd"
                          placeholderText="Start Date"

                          showTimeSelect
                          timeIntervals={15}
                          dateFormat="dd/MM/yyyy hh:mm aa"
                          timeCaption="Time"
                          onKeyDown={(e) => e.preventDefault()}
                      />

                  </div>

                  <div className="header-filter-field">

                      <DatePicker
                          className="header-filter-date-input"
                          selected={endDate}
                          onChange={setEndDate}
                          dateFormat="yyyy-MM-dd"
                          placeholderText="End Date"
                          showTimeSelect
                          timeIntervals={15}
                          dateFormat="dd/MM/yyyy hh:mm aa"
                          timeCaption="Time"
                          onKeyDown={(e) => e.preventDefault()}
                      />

                  </div>

                  <div className="header-filter-field">

                      <Select
                          isMulti
                          styles={filterSelectStyles}
                          options={filterOccasionList}
                          value={selectedFilterOccasion}
                          onChange={setSelectedFilterOccasion}
                          placeholder="Topics"
                          isSearchable={false}
                          closeMenuOnSelect={false}
                          hideSelectedOptions={false}
                          controlShouldRenderValue={false}
                          components={{
                              Option: CheckboxOption
                          }}
                      />

                  </div>

                  

                  <div className="header-filter-field">

                      <Select
                          isMulti
                          styles={filterSelectStyles}
                          options={filterProductList}
                          value={selectedFilterProduct}
                          onChange={setSelectedFilterProduct}
                          placeholder="Products"
                          isSearchable={false}
                          closeMenuOnSelect={false}
                          hideSelectedOptions={false}
                          controlShouldRenderValue={false}
                          components={{
                              Option: CheckboxOption
                          }}
                      />

                  </div>

                  <div className="header-filter-field">

                      <Select
                          isMulti
                          styles={filterSelectStyles}
                          options={filterPersonaList}
                          value={selectedFilterPersona}
                          onChange={setSelectedFilterPersona}
                          placeholder="Personas"
                          isSearchable={false}
                          closeMenuOnSelect={false}
                          hideSelectedOptions={false}
                          controlShouldRenderValue={false}
                          components={{
                              Option: CheckboxOption
                          }}
                      />

                  </div>


                  <div className="header-filter-field">

                      <Select
                          isMulti
                          styles={filterSelectStyles}
                          options={filterStageList}
                          value={selectedFilterStage}
                          onChange={setSelectedFilterStage}
                          placeholder="Stages"
                          isSearchable={false}
                          closeMenuOnSelect={false}
                          hideSelectedOptions={false}
                          controlShouldRenderValue={false}
                          components={{
                              Option: CheckboxOption
                          }}
                      />

                  </div>


                  <button
                  className="header-filter-apply-btn"
                  onClick={get_selected_filters}
                  >
                    Apply
                  </button>

              
              </div>
            )}


        <div
          className={`app-center ${
              panelPosition === "top"
                  ? "panel-top"
                  : "panel-right"
          }`}
      >

          {panelPosition === "top" && (

              <ExecutePanel
                  executeCards={executeCards}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                  onPreviousExecute={goToPreviousExecute}
                  onNextExecute={goToNextExecute}
                  loadCarouselDockets={loadCarouselDockets}
              />

          )}

          <div className="app-content">
              <Outlet
                context={{
                    filters: appliedFilters,

                    activePanel,
                    setActivePanel,

                    setPlannerDateFilter: (date) => {

                        const start = new Date(date);
                        start.setHours(0,0,0,0);

                        const end = new Date(date);
                        end.setHours(23,59,59,999);

                        applyPlannerDateFilter(start, end);
                    }
                }}
            />

          </div>



          {panelPosition === "right" && (

              <ExecutePanel
                  executeCards={executeCards}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                  onPreviousExecute={goToPreviousExecute}
                  onNextExecute={goToNextExecute}
                  loadCarouselDockets={loadCarouselDockets}
              />

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
                      readOnly
                      onKeyDown={(e) => e.preventDefault()}
                      showTimeSelect
                      dateFormat="MMM d, yyyy h:mm aa"
                      timeFormat="hh:mm aa"
                      timeIntervals={15}
                      className="ce-modal-date-input"
                      placeholderText="Select upload time"
                      onKeyDown={(e) => e.preventDefault()}
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
