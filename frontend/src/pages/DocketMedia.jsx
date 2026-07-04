// =============================================================================
//  DocketMedia.jsx  —  Elevantia PACE
//  UI rebuilt pixel-perfect from reference image.
//  All original logic, API calls, and handlers preserved exactly.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import '../styles/docket.css';

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const API       = import.meta.env.VITE_BACKEND_URL;
const TOKEN     = () => localStorage.getItem('token');
const AUTH      = () => ({ Authorization: `Bearer ${TOKEN()}` });
const JSON_AUTH = () => ({ 'Content-Type': 'application/json', ...AUTH() });

const TEXTAREA_LINE_H = 20;
const TEXTAREA_PAD    = 16;
const TEXTAREA_MAX_H  = TEXTAREA_LINE_H * 3 + TEXTAREA_PAD;

// ─── Utility ──────────────────────────────────────────────────────────────────
function resizeTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';
  const newH = Math.min(el.scrollHeight, TEXTAREA_MAX_H);
  el.style.height = `${newH}px`;
  el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_H ? 'auto' : 'hidden';
}

function handleUnauthorized(res) {
  if (res.status === 401) { localStorage.clear(); window.location.href = '/'; return true; }
  return false;
}

function buildStructuredPersona(persona) {
  if (!persona) return null;
  const grouped = {};
  persona.segments
    ?.filter(seg => seg.is_active)
    .forEach(seg => {
      if (!grouped[seg.segment_type]) grouped[seg.segment_type] = {};
      const key = seg.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      grouped[seg.segment_type][key] = seg.value;
    });
  return { persona_name: persona.persona_name, segments: grouped, hashtags: persona.hashtags || [] };
}

async function downloadImage(url, docketId) {

  const parts =
    url.split(/[?#]/)[0].split("/");

  const rawName =
    parts[parts.length - 1] ||
    `execute-${docketId}`;

  const fileName =
    /\.[a-z]{2,5}$/i.test(rawName)
      ? rawName
      : `${rawName}.png`;

  const triggerDownload = (
    href,
    download = fileName
  ) => {

    const a =
      document.createElement("a");

    a.href = href;

    a.download = download;

    a.style.display = "none";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

  };

  try {

    const res = await fetch(
      url,
      {
        mode: "cors"
      }
    );

    if (!res.ok) {
      throw new Error(
        "fetch failed"
      );
    }

    const objectUrl =
      URL.createObjectURL(
        await res.blob()
      );

    triggerDownload(objectUrl);

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 10000);

    return;

  } catch (err) {

    console.error(
      "Blob download failed",
      err
    );

  }

  try {

    await new Promise(
      (resolve, reject) => {

        const img = new Image();

        img.crossOrigin =
          "anonymous";

        img.onload = () => {

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            img.naturalWidth;

          canvas.height =
            img.naturalHeight;

          canvas
            .getContext("2d")
            .drawImage(
              img,
              0,
              0
            );

          canvas.toBlob(
            (blob) => {

              const objectUrl =
                URL.createObjectURL(
                  blob
                );

              triggerDownload(
                objectUrl
              );

              setTimeout(() => {
                URL.revokeObjectURL(
                  objectUrl
                );
              }, 10000);

              resolve();

            },
            "image/png"
          );

        };

        img.onerror = reject;

        img.src =
          `${url}${
            url.includes("?")
              ? "&"
              : "?"
          }_t=${Date.now()}`;

      }
    );

    return;

  } catch (err) {

    console.error(
      "Canvas download failed",
      err
    );

  }

  window.open(
    url,
    "_blank"
  );

}







// =============================================================================
//  ICONS
// =============================================================================
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#1f2937" strokeWidth="3"/>
    <path d="M12 7V12L15 15" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M15 5L5 15M5 5L15 15" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);
const SendIcon = ({ active }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
      stroke={active ? '#4A90E2' : '#9CA3AF'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
  </svg>
);
const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 9.5-9.5z" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);
const ExpandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    {/* top-right arrow */}
    <path d="M12 12L19 5M19 5H14M19 5V10" stroke="#1a2744" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    {/* bottom-left arrow */}
    <path d="M12 12L5 19M5 19H10M5 19V14" stroke="#1a2744" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 3v13M7 11l5 5 5-5M3 18h18" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);
const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="#1a2744" strokeWidth="3"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="#1a2744" strokeWidth="3"/>
  </svg>
);
const StagesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M22 12H2M22 12l-4-4m4 4l-4 4" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);
const NamesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="9" cy="7" r="4" stroke="#1a2744" strokeWidth="3"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);
const SubmitIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const WarnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
    <path d="M12 8V12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="1" fill="white"/>
  </svg>
);
const ChevronDownIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke="#1a2744" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const PrevIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke="#1a2744" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const NextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M9 18l6-6-6-6" stroke="#1a2744" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
    <polyline points="17 21 17 13 7 13 7 21" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
    <polyline points="7 3 7 8 15 8" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);



const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="#1a2744"
      strokeWidth="2"
    />
    <path
      d="M12 10V16"
      stroke="#1a2744"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle
      cx="12"
      cy="7"
      r="1"
      fill="#1a2744"
    />
  </svg>
);

const InfoIconWhite = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path d="M12 10V17" stroke="#ffffff" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="12" cy="6.5" r="1.5" fill="#ffffff"/>
  </svg>
);

const LabelsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="3" rx="1" stroke="#1a2744" strokeWidth="2"/>
    <rect x="3" y="11" width="13" height="3" rx="1" stroke="#1a2744" strokeWidth="2"/>
    <rect x="3" y="17" width="9" height="3" rx="1" stroke="#1a2744" strokeWidth="2"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="8" stroke="#9CA3AF" strokeWidth="2"/>
    <path d="M21 21l-4.35-4.35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="#1a2744" strokeWidth="2"/>
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="#1a2744" strokeWidth="2"/>
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="#1a2744" strokeWidth="2"/>
    <rect x="14" y="14" width="7" height="7" rx="1" stroke="#1a2744" strokeWidth="2"/>
  </svg>
);
const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M3 12h18M3 18h18" stroke="#1a2744" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const PlusCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#1a2744" strokeWidth="2"/>
    <path d="M12 8v8M8 12h8" stroke="#1a2744" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ─── Auto-grow Textarea ───────────────────────────────────────────────────────
const AutoTextarea = ({ value, onChange, placeholder = 'Enter info...' }) => {
  const ref = useRef(null);
  useEffect(() => { resizeTextarea(ref.current); }, [value]);
  return (
    <textarea
      ref={ref}
      className="docket-field-textarea"
      value={value}
      rows={1}
      placeholder={placeholder}
      onChange={e => { onChange(e.target.value); resizeTextarea(e.target); }}
      onFocus={e => resizeTextarea(e.target)}
    />
  );
};

// ─── Field Row ───────────────────────────────────────────────────────────────
const FieldRow = React.memo(({ field, fieldData, onToggle, onValueChange }) => (
  <div className="docket-field-row">
    <div className="docket-field-left">
      <input type="checkbox" className="docket-field-checkbox"
        checked={fieldData?.enabled ?? false}
        onChange={e => onToggle(field.variable_name, e.target.checked)}
      />
      <label className="docket-field-label-text">{field.label}</label>
      {field.isCustom && (
        <button className="docket-delete-btn" onClick={() => onValueChange(field, null)}>×</button>
      )}
    </div>
    <AutoTextarea value={fieldData?.value ?? ''} onChange={val => onValueChange(field.variable_name, val)} />
  </div>
));

// ─── Product Preview ─────────────────────────────────────────────────────────
const ProductPreview = React.memo(({ product }) => {
  if (!product) return null;
  return (
    <div className="docket-preview-card">
      <h4>{product.product_name}</h4>
      <p className="preview-desc">{product.product_description}</p>
      {product.features?.length > 0 && (<><strong>Features</strong><ul>{product.features.map((f,i)=><li key={i}>{f}</li>)}</ul></>)}
      {product.usps?.length    > 0 && (<><strong>USP</strong>    <ul>{product.usps.map((u,i)=><li key={i}>{u}</li>)}</ul></>)}
      {product.values?.length  > 0 && (<><strong>Values</strong> <ul>{product.values.map((v,i)=><li key={i}>{v}</li>)}</ul></>)}
      {product.images?.length  > 0 && (
        <div className="preview-images">
          {product.images.map((img,i) => <img key={i} src={img.img_url} alt=""/>)}
        </div>
      )}
    </div>
  );
});

// ─── Persona Preview ─────────────────────────────────────────────────────────
const PersonaPreview = React.memo(({ persona }) => {
  if (!persona) return null;
  const grouped = !Array.isArray(persona.segments)
    ? persona.segments
    : persona.segments.reduce((acc, seg) => {
        if (!seg.is_active) return acc;
        if (!acc[seg.segment_type]) acc[seg.segment_type] = {};
        acc[seg.segment_type][seg.label] = seg.value;
        return acc;
      }, {});
  return (
    <div className="docket-preview-card">
      <h4>{persona.persona_name}</h4>
      {Object.entries(grouped).map(([type, vals]) => (
        <div key={type} className="preview-segment-group">
          <div className="preview-segment-title">{type.toUpperCase()}</div>
          <ul className="preview-segment-list">
            {Object.entries(vals).map(([label,value],i) => <li key={i}><strong>{label}</strong>: {value}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
});

// ─── Chat Bubble ─────────────────────────────────────────────────────────────
const Bubble = React.memo(({ bubble }) => (
  <div className={`docket-bubble-wrapper ${bubble.sender === 'user' ? 'user-message' : 'ai-message'}`}>
    <div className="docket-bubble">
      {bubble.isLoading
        ? <div className="docket-bubble-loading"><span/><span/><span/></div>
        : bubble.text}
    </div>
  </div>
));


// =============================================================================
//  MAIN COMPONENT
// =============================================================================
const DocketMedia = () => {
  const { docketId } = useParams();

  const navigate = useNavigate();

  // ── AppFrame filter bridge ──────────────────────────────────────────────
  // AppFrame owns the header "Filter" dropdown and the footer stage counts.
  // It passes its live filter values down through <Outlet context={...} />.
  // We read them here (read-only) and use them, when present, as the source
  // of truth for the carousel query below — no local filter state, UI, or
  // any other function in this file is modified.
  const outletContext = useOutletContext();
  const appFrameFilters = outletContext?.filters ?? null;

  // ── Mode / Media ──────────────────────────────────────────────────────────
  const [mode,       setMode]       = useState('');
  const [subMode,    setSubMode]    = useState('');
  const [mediaType,  setMediaType]  = useState('');
  const [subType,    setSubType]    = useState('');
  const [mediaTypes, setMediaTypes] = useState([]);
  const [subTypes,   setSubTypes]   = useState([]);

  // ── Docket info ───────────────────────────────────────────────────────────
  const [docketTitle,        setDocketTitle]        = useState('');
  const [executeDescription, setExecuteDescription] = useState('');
  const [visualElements,     setVisualElements]     = useState('');
  const [uploadedDateTime,   setUploadedDateTime]   = useState(null);




  const [carouselPage,    setCarouselPage]    = useState(1);
  const [carouselTotal,   setCarouselTotal]   = useState(0);
  const CAROUSEL_PER_PAGE = 10;



  // ── Carousel ──────────────────────────────────────────────────────────────
  const [carouselDockets, setCarouselDockets] = useState([]);

  const [summary, setSummary] = useState('');

  const [newSummary, setNewSummary] = useState('');


  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);


  const [showImagePreview, setShowImagePreview] = useState(false);



  const [selectedFilterStage, setSelectedFilterStage] = useState("");


  const [selectedFilterProduct,
  setSelectedFilterProduct] = useState("");

  const [selectedFilterPersona,
  setSelectedFilterPersona] = useState("");

  const [selectedFilterOccasion,
  setSelectedFilterOccasion] = useState("");

  const [selectedFilterMediaType,
  setSelectedFilterMediaType] = useState("");

  const [selectedFilterSubType,
  setSelectedFilterSubType] = useState("");

  const [searchText,
  setSearchText] = useState("");

  const [showCreateExecuteModal, setShowCreateExecuteModal] = useState(false);

  const [newDocketTitle, setNewDocketTitle] = useState("");
  const [newMode, setNewMode] = useState("");
  const [newMediaType, setNewMediaType] = useState("");
  const [newSubType, setNewSubType] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [newPersonaId, setNewPersonaId] = useState("");

  const [newOccasionId, setNewOccasionId] = useState("");
  const [occasionList, setOccasionList] = useState([]);


  const [newExecuteDescription, setNewExecuteDescription] = useState("");
  const [newVisualElements, setNewVisualElements] = useState("");
  const [newUploadedDateTime, setNewUploadedDateTime] = useState(new Date());

  const [createMediaTypes, setCreateMediaTypes] = useState([]);
  const [createSubTypes, setCreateSubTypes] = useState([]);



  const [menuOpen, setMenuOpen] = useState(false);

  const [businessName, setBusinessName] = useState("My Business");

  const [email, setEmail] = useState("");

  



const formatDate = (date) => {

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};








  // ── Single source of truth for "what filters are active" ───────────────
  // Prefer the filters coming from AppFrame's header filter dropdown (shared
  // across every page it wraps, via Outlet context). Fall back to this
  // page's own local filter state so nothing breaks if DocketMedia is ever
  // rendered without an AppFrame ancestor. This is the ONLY place that
  // decides which filter values are "effective" — every fetch that loads
  // carousel dockets or stage counts must go through it.
  const effectiveFilters = useMemo(() => ({
    startDate:  appFrameFilters ? appFrameFilters.startDate  : startDate,
    endDate:    appFrameFilters ? appFrameFilters.endDate    : endDate,
    stage:      appFrameFilters ? appFrameFilters.stage      : selectedFilterStage,
    productId:  appFrameFilters ? appFrameFilters.productId  : selectedFilterProduct,
    personaId:  appFrameFilters ? appFrameFilters.personaId  : selectedFilterPersona,
    occasionId: appFrameFilters ? appFrameFilters.occasionId : selectedFilterOccasion,
    search:     (appFrameFilters ? appFrameFilters.search    : searchText) || "",
    mediaType:  selectedFilterMediaType,
    subType:    selectedFilterSubType,
  }), [
    appFrameFilters?.startDate,
    appFrameFilters?.endDate,
    appFrameFilters?.stage,
    appFrameFilters?.productId,
    appFrameFilters?.personaId,
    appFrameFilters?.occasionId,
    appFrameFilters?.search,
    startDate,
    endDate,
    selectedFilterStage,
    selectedFilterProduct,
    selectedFilterPersona,
    selectedFilterOccasion,
    selectedFilterMediaType,
    selectedFilterSubType,
    searchText,
  ]);

  function buildFilterParams(filters) {
    // Same param names/shape as PlannerPage's carousel-dockets call, so both
    // pages ask the backend for exactly the same thing given the same filters.
    const params = new URLSearchParams();

    if (filters.startDate)  params.append("start_date", formatDate(filters.startDate));
    if (filters.endDate)    params.append("end_date",   formatDate(filters.endDate));
    if (filters.stage)      params.append("stage",      filters.stage);
    if (filters.productId)  params.append("product_id", filters.productId);
    if (filters.personaId)  params.append("persona_id", filters.personaId);
    if (filters.occasionId) params.append("occasion_id", filters.occasionId);
    if (filters.mediaType)  params.append("media_type",  filters.mediaType);
    if (filters.subType)    params.append("subtype_name", filters.subType);
    if (filters.search && filters.search.trim()) params.append("search", filters.search.trim());

    return params;
  }

  // ── Fetch carousel dockets + stage counts, always through the active filters ──
  // This is the single fetch path used on mount, whenever a filter changes,
  // whenever the carousel page changes, and whenever anything else needs to
  // reload the list (e.g. after creating/saving an execute). No other
  // function in this file should call the carousel-dockets or stage-counts
  // endpoints directly — route everything through here so the filter is
  // always the source of truth.
  const fetchCarouselAndStageCounts = useCallback(async (filters) => {
    try {
      const params = buildFilterParams(filters);

      const docketRes  = await fetch(`${API}/planner/carousel-dockets?${params.toString()}`, { headers: AUTH() });
      const docketData = await docketRes.json();
      if (docketData.success) {
        setCarouselDockets(docketData.data || []);
        if (typeof docketData.total === "number") setCarouselTotal(docketData.total);
      }

      const stageRes  = await fetch(`${API}/planner/stage-counts?${params.toString()}`, { headers: AUTH() });
      const stageData = await stageRes.json();
      if (stageData.success) setStageCounts(stageData.data);
    } catch (err) {
      console.error("Filter error:", err);
    }
  }, []);

  useEffect(() => {
    fetchCarouselAndStageCounts(effectiveFilters);
  }, [effectiveFilters, fetchCarouselAndStageCounts]);







  // ── Product / Persona ─────────────────────────────────────────────────────
  const [productList,         setProductList]         = useState([]);
  const [selectedProductId,   setSelectedProductId]   = useState('');
  const [selectedProductData, setSelectedProductData] = useState(null);
  const [personaList,         setPersonaList]         = useState([]);
  const [selectedPersonaId,   setSelectedPersonaId]   = useState('');
  const [selectedPersonaData, setSelectedPersonaData] = useState(null);

  // ── Fields ────────────────────────────────────────────────────────────────
  const [mandatoryFields, setMandatoryFields] = useState([]);
  const [optionalFields,  setOptionalFields]  = useState([]);
  const [fieldValues,     setFieldValues]     = useState({});

  // ── Network / Assignment ─────────────────────────────────────────────────
  const [networkUsers, setNetworkUsers] = useState([]);
  const [assignedUser, setAssignedUser] = useState('');


  const [isCurrentOwner, setIsCurrentOwner] = useState(true);

  // ── Stage ─────────────────────────────────────────────────────────────────
  const [currentStage,  setCurrentStage]  = useState('discovery');
  const [selectedStage, setSelectedStage] = useState('');
  const [nextStages,    setNextStages]    = useState([]);

  // ── Stage counts for bottom bar ───────────────────────────────────────────
  const [stageCounts, setStageCounts] = useState({
    discovery: 0, draft: 0, generate: 0, review: 0,
    approve: 0, publish: 0, closed: 0, rejected: 0,
  });

  // ── History ───────────────────────────────────────────────────────────────
  const [showHistoryModal,      setShowHistoryModal]      = useState(false);
  const [historyList,           setHistoryList]           = useState([]);
  const [selectedHistoryPrompt, setSelectedHistoryPrompt] = useState(null);
  const [visualHistoryList,     setVisualHistoryList]     = useState([]);

  const [leftPanel, setLeftPanel] = useState(null);




  // ── Visual output ─────────────────────────────────────────────────────────
  const [visualImage,       setVisualImage]       = useState(null);

  const [selectedLogo, setSelectedLogo] = useState(null);

  const [selectedProductImage, setSelectedProductImage] = useState(null);

  const [previewProductImage, setPreviewProductImage] = useState(null);



  const [visualMessage,     setVisualMessage]     = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);


  const [uploadMessage, setUploadMessage] = useState("");


  const fileInputRef = useRef(null);

  // ── Feedback ──────────────────────────────────────────────────────────────
  const [adminMediaId,           setAdminMediaId]           = useState(null);
  const [showFeedbackModal,      setShowFeedbackModal]      = useState(false);
  const [feedbackText,           setFeedbackText]           = useState('');
  const [feedbackList,           setFeedbackList]           = useState([]);
  const [docketFeedbackList,     setDocketFeedbackList]     = useState([]);
  const feedbackBottomRef = useRef(null);

  // ── Assignment history ────────────────────────────────────────────────────
  const [showAssignHistoryModal, setShowAssignHistoryModal] = useState(false);
  const [assignHistory,          setAssignHistory]          = useState([]);

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [userMessage, setUserMessage] = useState('');
  const [conversationBubbles, setConversationBubbles] = useState([{
    id: 1, text: 'Use AI to Automatically fill in all Fields Based on your Needs.', type: 'ai', sender: 'ai',
  }]);


  useEffect(() => {
    setConversationBubbles([
      {
        id: 1,
        text: 'Use AI to Automatically fill in all Fields Based on your Needs.',
        type: 'ai',
        sender: 'ai',
      }
    ]);
  }, [docketId]);





  const chatEndRef = useRef(null);

  // ── Active tab ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('ai');

  // ── Stage/Names dropdown modals ───────────────────────────────────────────
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [showNamesDropdown, setShowNamesDropdown] = useState(false);


  // ── Toast ─────────────────────────────────────────────────────────────────
  const [showCopyToast,    setShowCopyToast]    = useState(false);
  const [showSaveToast,    setShowSaveToast]    = useState(false);
  const [saveToastMessage, setSaveToastMessage] = useState('');
  const [showSubmitToast,  setShowSubmitToast]  = useState(false);

  

  // ── Validation ────────────────────────────────────────────────────────────
  const [canGenerate,     setCanGenerate]     = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isEditMode,      setIsEditMode]      = useState(false);

  // ── Add-field modal ───────────────────────────────────────────────────────
  const [showModal,     setShowModal]     = useState(false);
  const [modalBoxType,  setModalBoxType]  = useState('optional');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // ── Expand-field modal (UI-only; reuses the same state setters as the
  //    inline fields, so Save/generate/etc. workflows are untouched) ────────
  const [expandField, setExpandField] = useState(null);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const [businessProfile, setBusinessProfile] = useState(null);
  const [categories,      setCategories]      = useState([]);

  // ── Memoised ─────────────────────────────────────────────────────────────
  const finalPersonaData = useMemo(() => buildStructuredPersona(selectedPersonaData), [selectedPersonaData]);

  const imageMap = useMemo(() => {
    const map = {};
    docketFeedbackList.forEach(item => { if (item.image_url) map[item.admin_media_id] = item.image_url; });
    return map;
  }, [docketFeedbackList]);

  const groupedFeedback = useMemo(() => {
    const grouped = {};
    docketFeedbackList.forEach(item => {
      if (!grouped[item.admin_media_id]) grouped[item.admin_media_id] = [];
      grouped[item.admin_media_id].push(item);
    });
    return Object.entries(grouped).map(([mediaId, messages]) => ({ admin_media_id: mediaId, messages }));
  }, [docketFeedbackList]);

  const formattedDateTime = useMemo(() => {
    if (!uploadedDateTime) return '';
    const d = new Date(uploadedDateTime);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  }, [uploadedDateTime]);

  // scroll chat to bottom
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversationBubbles]);

  
  
  
  
  const handleManualImageUpload = async (event) => {

    const file = event.target.files?.[0];

    if (!file) return;

    try {

      const formData = new FormData();

      formData.append("file", file);

      const uploadRes = await fetch(
        `${API}/upload-image`,
        {
          method: "POST",
          headers: AUTH(),
          body: formData
        }
      );

      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        alert("Upload failed");
        return;
      }

      const imageUrl = uploadData.url;

      const saveRes = await fetch(
        `${API}/admin/docket/${docketId}/upload-visual`,
        {
          method: "POST",
          headers: JSON_AUTH(),
          body: JSON.stringify({
            uploaded_url: imageUrl,
            message: visualMessage || ""
          })
        }
      );

      const saveData = await saveRes.json();

      if (saveData.success) {

        setVisualImage(imageUrl);

      }

    } catch (err) {

      console.error(err);

    }

  };




  const handleProductImageUpload = async (event) => {

    const file = event.target.files?.[0];

    if (!file) return;

    try {

        const formData = new FormData();

        formData.append(
            "file",
            file
        );

        const res = await fetch(

            `${API}/products/${selectedProductId}/upload-image`,

            {

                method:"POST",

                headers:AUTH(),

                body:formData

            }

        );

        const data =
            await res.json();

        if(!data.success){

            alert(data.message);

            return;

        }

        const refreshed =
            await fetch(

                `${API}/products/${selectedProductId}`,

                {

                    headers:AUTH()

                }

            );

        const refreshedData =
            await refreshed.json();

        if(refreshedData.success){

            setSelectedProductData(
                refreshedData.data
            );

            const newestImage =

                refreshedData.data.images[
                    refreshedData.data.images.length-1
                ];

            if(newestImage){

                setSelectedProductImage(

                    newestImage.img_url

                );

            }

        }

    }

    catch(err){

        console.error(err);

    }

};







  // ==========================================================================
  //  DATA FETCHING
  // ==========================================================================

  useEffect(() => {
    if (!docketId) return;
    const headers = AUTH();

    Promise.allSettled([
      fetch(`${API}/planner/docket/${docketId}`, { headers })
        .then(r => r.json()).then(data => {
          if (!data.success) return;
          const d = data.data;
          setDocketTitle(d.title);
          setExecuteDescription(d.execute_description || '');
          setVisualElements(d.visual_elements || '');
          setSummary(d.summary || '');
          setUploadedDateTime(d.uploaded_date_time);
          setMode(d.media_name);
          setMediaType(d.media_type);
          setSubType(d.subtype_name);
          setSelectedProductId(d.product_id || '');
          setSelectedPersonaId(d.persona_id || '');
        }),

      fetch(`${API}/docket/${docketId}/business`, { headers })
        .then(r => { handleUnauthorized(r); return r.json(); })
        .then(data => { if (data.success) setBusinessProfile(data.data);
          if (
            data.data.logo_url
          ) {

            setSelectedLogo(
              data.data.logo_url
            );

          }

         }),

      fetch(`${API}/docket/${docketId}/product`, { headers })
        .then(r => r.json())
        .then(data => {
          if (!data.success) return;

          setSelectedProductData(data.data);

          setSelectedProductImage(prev => {

            // Keep user's current selection
            if (
              prev &&
              data.data.images?.some(img => img.img_url === prev)
            ) {
              return prev;
            }

            // Only initialize once
            return data.data.images?.[0]?.img_url || null;

          });
        }),

      fetch(`${API}/docket/${docketId}/persona`, { headers })
        .then(r => r.json()).then(data => { if (data.success) setSelectedPersonaData(data.data); }),

      fetch(`${API}/planner/docket/${docketId}/visual`, { headers })
        .then(r => r.json()).then(data => {
          if (data.success) {
            setVisualImage(data.url);
            setVisualMessage(data.message);
            setAdminMediaId(data.admin_media_id);
          }
        }),

      fetch(`${API}/planner/docket/${docketId}/media-history`, { headers })
        .then(r => r.json()).then(data => { if (data.success) setHistoryList(data.data); }),

      fetch(`${API}/feedback/docket/${docketId}`, { headers })
        .then(r => r.json()).then(data => { if (data.success) setDocketFeedbackList(data.data); }),

      fetch(`${API}/planner/docket/${docketId}/chat-history`, { headers })
        .then(r => r.json()).then(data => {
          if (!data.success) return;
          const bubbles = [];
          data.data.forEach((item, i) => {
            bubbles.push({ id: Date.now() + i,        text: item.user,                                    sender: 'user', type: 'user' });
            bubbles.push({ id: Date.now() + i + 1000, text: 'Fields updated based on previous request.', sender: 'ai',   type: 'ai'   });
          });
          setConversationBubbles(prev => [...prev, ...bubbles]);
        }),

      fetch(`${API}/execute/current-stage/${docketId}`, { headers })
        .then(r => r.json()).then(data => {
          if (data.success) { setCurrentStage(data.stage); setSelectedStage(data.stage); }
        }),


      fetch(`${API}/execute/current-owner/${docketId}`, {
        headers
      })
      .then(r => r.json())
      .then(data => {

        if (data.success) {

          setIsCurrentOwner(
            Number(data.assigned_to) === Number(data.current_user)
          );

        }

      }),


        

      fetch(`${API}/network/secondary-users?docket_id=${docketId}`, { headers })
        .then(r => r.json()).then(data => { if (data.success) setNetworkUsers(data.data); }),

    ]).catch(err => console.error('Bootstrap fetch error:', err));

    fetch(`${API}/categories`, { headers: AUTH() })
      .then(r => { handleUnauthorized(r); return r.json(); })
      .then(data => data && setCategories(data))
      .catch(console.error);

    fetch(`${API}/personas`, { headers: AUTH() })
      .then(r => r.json())
      .then(data => { if (data.success) setPersonaList(data.data); })
      .catch(console.error);




    fetch(`${API}/products`, {
      headers: AUTH()
    })
      .then(r => r.json())
      .then(data => {
        if (data.success)
          setProductList(data.data);
      })
      .catch(console.error);




    fetch(`${API}/planner/all-occasions`, {
      headers: AUTH()
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setOccasionList(data.data || []);
        }
      })
      .catch(console.error);


    



    // NOTE: stage-counts and carousel-dockets are intentionally NOT fetched
    // here unfiltered. They are always loaded through
    // fetchCarouselAndStageCounts(effectiveFilters, ...) so the AppFrame
    // filter remains the single source of truth for what's shown — see the
    // dedicated effect above.

  }, [docketId]);



  

  useEffect(() => {
    if (!currentStage) return;
    fetch(`${API}/process-stages/${currentStage}`, { headers: AUTH() })
      .then(r => r.json())
      .then(data => { if (data.success) setNextStages(data.data); })
      .catch(console.error);
  }, [currentStage]);




  useEffect(() => {

    const interval = setInterval(
      refreshStage,
      2000
    );

    return () => clearInterval(interval);

  }, [docketId]);

  useEffect(() => {
    if (!mode) { setMediaTypes([]); return; }
    fetch(`${API}/media-types?mode=${mode}`, { headers: AUTH() })
      .then(r => r.json())
      .then(data => { if (data.success) setMediaTypes(data.data); })
      .catch(console.error);
  }, [mode]);

  useEffect(() => {
    if (!mediaType) return;
    fetch(`${API}/media-subtypes?mode=${mode}&mediaType=${mediaType}`, { headers: AUTH() })
      .then(r => r.json())
      .then(data => { if (data.success) setSubTypes(data.data); })
      .catch(console.error);
  }, [mediaType]);





  useEffect(() => {
    if (!newMode) {
      setCreateMediaTypes([]);
      return;
    }

    fetch(`${API}/media-types?mode=${newMode}`, {
      headers: AUTH()
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setCreateMediaTypes(data.data);
        }
      });
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
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setCreateSubTypes(data.data);
        }
      });
  }, [newMediaType]);










  useEffect(() => {
    if (!mode || !mediaType || !subType) return;
    async function fetchFields() {
      try {
        const res  = await fetch(`${API}/media-fields?mode=${mode}&mediaType=${mediaType}&subType=${subType}`, { headers: AUTH() });
        const data = await res.json();
        if (!data.success) return;
        const defMandatory = data.data.mandatory ?? [];
        const defOptional  = data.data.optional  ?? [];
        setMandatoryFields(defMandatory);
        setOptionalFields(defOptional);
        const iv = {};
        [...defMandatory, ...defOptional].forEach(f => { iv[f.variable_name] = { value: '', enabled: true }; });
        setFieldValues(iv);
        loadSavedFieldValues(defMandatory, defOptional);
      } catch (err) { console.error(err); }
    }
    fetchFields();
  }, [mode, mediaType, subType]);

  useEffect(() => { setCanGenerate(Boolean(mode && mediaType && subType)); }, [mode, mediaType, subType]);

  useEffect(() => {
    if (showFeedbackModal && feedbackBottomRef.current)
      feedbackBottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [feedbackList, showFeedbackModal]);


  // ==========================================================================
  //  HELPERS
  // ==========================================================================





  const refreshStage = async () => {

    try {

      const res = await fetch(
        `${API}/execute/current-stage/${docketId}`,
        {
          headers: AUTH()
        }
      );

      const data = await res.json();

      if (data.success) {

        setCurrentStage(data.stage);

        // REMOVE THIS LINE
        // setSelectedStage(data.stage);

      }

    } catch (err) {

      console.error(err);

    }
  };


  









  async function loadSavedFieldValues(defMandatory = [], defOptional = []) {
    try {
      const res  = await fetch(`${API}/planner/docket/${docketId}/fields`, { headers: AUTH() });
      const data = await res.json();
      if (!data.success) return;
      const saved = {};
      const newMand = [], newOpt = [];
      data.data.forEach(row => {
        const matchedField =
          [...defMandatory, ...defOptional]
            .find(f => f.label === row.label);

        const key =
          matchedField?.variable_name || row.label;

        saved[key] = {
          value: row.value,
          enabled: row.checkbox_clicked === 1
        };



        const exists =
          defMandatory.some(
            f => f.label === row.label
          ) ||
          defOptional.some(
            f => f.label === row.label
          );
        if (!exists && row.field_source === "custom") {
          const cf = { id: Date.now() + Math.random(), label: row.label, variable_name: row.label, box: row.box, isCustom: true };
          if (row.box === 'mandatory') newMand.push(cf); else newOpt.push(cf);
        }
      });
      setMandatoryFields(prev => [...prev, ...newMand]);
      setOptionalFields(prev  => [...prev, ...newOpt]);
      setFieldValues(prev     => ({ ...prev, ...saved }));
    } catch (err) { console.error(err); }
  }

  async function handleSave(section) {
    const sourceFields = section === 'mandatory' ? mandatoryFields : optionalFields;
    const fieldsToSave = sourceFields.reduce((acc, field) => {
      const fd = fieldValues[field.variable_name];
      if (!fd) return acc;
      acc.push({ label: field.label, value: fd.value ?? '', checkbox_clicked: fd.enabled ? 1 : 0, box: section, field_source: field.isCustom ? 'custom' : 'default' });
      return acc;
    }, []);
    try {
      const res  = await fetch(`${API}/planner/docket/${docketId}/fields`, { method: 'POST', headers: JSON_AUTH(), body: JSON.stringify({ fields: fieldsToSave }) });
      const data = await res.json();
      return data.success;
    } catch { return false; }
  }

  const handleFullSave = useCallback(async () => {
    await fetch(
      `${API}/planner/docket/${docketId}`,
      {
        method: 'PUT',
        headers: JSON_AUTH(),
        body: JSON.stringify({
          title: docketTitle,
          execute_description: executeDescription,
          visual_elements: visualElements,
          summary: summary
        })
      }
    );

    const [ms, os] = await Promise.all([handleSave('mandatory'), handleSave('optional')]);
    if (!ms || !os) {
      setSaveToastMessage('Please fill all required fields.');
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 3000);
      return;
    }
    if (assignedUser) {
      await fetch(`${API}/execute/assign`, {
        method: 'POST', headers: JSON_AUTH(),
        body: JSON.stringify({ docket_id: Number(docketId), user_id: assignedUser, stage: selectedStage }),
      });
    }
    setSaveToastMessage('Saved successfully!');
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  }, [mandatoryFields,
      optionalFields,
      fieldValues,
      assignedUser,
      selectedStage,
      docketId,
      docketTitle,
      executeDescription,
      visualElements,
      summary]);

  const handleFieldToggle = useCallback((varName, checked) => {
    setFieldValues(prev => ({ ...prev, [varName]: { ...prev[varName], enabled: checked } }));
  }, []);

  const handleFieldValue = useCallback((varNameOrField, val) => {
    if (val === null) {
      const field = varNameOrField;
      if (field.box === 'mandatory') setMandatoryFields(prev => prev.filter(f => f.id !== field.id));
      else setOptionalFields(prev => prev.filter(f => f.id !== field.id));
      setFieldValues(prev => { const next = { ...prev }; delete next[field.variable_name]; return next; });
      return;
    }
    setFieldValues(prev => ({ ...prev, [varNameOrField]: { ...prev[varNameOrField], value: val } }));
  }, []);

  // alias used in labels modal
  const handleDeleteCustomField = (field) => handleFieldValue(field, null);





  const reloadCarousel = async () => {
    try {
      // Always reload through the active filters, never unfiltered, so a
      // freshly created/updated execute still respects whatever filter is
      // currently applied (or drops out of view if it no longer matches).
      await fetchCarouselAndStageCounts(effectiveFilters);
    } catch (err) {
      console.error(err);
    }
  };




  const handleCreateExecute = async () => {

    if (
      !newDocketTitle ||
      !newMode ||
      !newMediaType ||
      !newSubType
    ) {
      alert("Please fill all required fields");
      return;
    }

    try {

      const res = await fetch(
        `${API}/planner/docket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TOKEN()}`
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
        }
      );

      const data = await res.json();


      if (data.success) {


        setNewDocketTitle("");
        setNewMode("");
        setNewMediaType("");
        setNewSubType("");

        setNewProductId("");
        setNewPersonaId("");
        setNewOccasionId("");

        setNewExecuteDescription("");
        setNewVisualElements("");
        setNewSummary("");




        await reloadCarousel();

        setShowCreateExecuteModal(false);

        navigate(`/docket-media/${data.docket_id}`);
      }


    } catch (err) {
      console.error(err);
    }
  };











  // ==========================================================================
  //  CHAT
  // ==========================================================================

  const handleSendMessage = useCallback(async () => {
    if (!userMessage.trim()) return;
    const fieldNames = [...mandatoryFields.map(f => f.variable_name), ...optionalFields.map(f => f.variable_name)];
    const userBubble = { id: Date.now(), text: userMessage, type: 'user', sender: 'user' };
    const loadingId  = Date.now() + 999;
    setConversationBubbles(prev => [...prev, userBubble, { id: loadingId, text: '...', type: 'ai', sender: 'ai', isLoading: true }]);
    setUserMessage('');
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST', headers: JSON_AUTH(),
        body: JSON.stringify({
          docket_id: Number(docketId), message: userBubble.text,
          mode, mediaType, subType,
          business: JSON.stringify(businessProfile  ?? {}),
          product:  JSON.stringify(selectedProductData ?? {}),
          persona:  JSON.stringify(finalPersonaData ?? {}),
          execute_title: docketTitle,
          execute_description: executeDescription,
          visual_elements: visualElements,
          summary: summary,
          fields: fieldNames,
        }),
      });
      setConversationBubbles(prev => prev.filter(b => b.id !== loadingId));
      if (handleUnauthorized(res)) return;
      const data = await res.json();
      if (data.success && data.fields) {
        setFieldValues(prev => {
          const updated = { ...prev };
          Object.entries(data.fields).forEach(([key, value]) => { if (updated[key]) updated[key] = { ...updated[key], value }; });
          return updated;
        });

        setSummary(
          data.summary || ""
        );



        setConversationBubbles(prev => [...prev, { id: Date.now() + 1, text: '✅ Fields updated based on your request.', type: 'ai', sender: 'ai' }]);
      } else {
        setConversationBubbles(prev => [...prev, { id: Date.now() + 1, text: '⚠️ AI could not generate field values.', type: 'ai', sender: 'ai' }]);
      }
    } catch {
      setConversationBubbles(prev => [...prev.filter(b => b.id !== loadingId), { id: Date.now() + 1, text: '⚠️ AI server not reachable.', type: 'ai', sender: 'ai' }]);
    }
  }, [userMessage, mandatoryFields, optionalFields, mode, mediaType, subType, businessProfile, selectedProductData, finalPersonaData, docketId, docketTitle, executeDescription, visualElements]);


  // ==========================================================================
  //  GENERATE
  // ==========================================================================

  const handleGenerate = useCallback(async () => {
    setIsGeneratingImage(true);
    setCurrentStage("generate");
    setSelectedStage("generate");

    const [ms, os] = await Promise.all([handleSave('mandatory'), handleSave('optional')]);
    if (!ms || !os) { setGeneratedPrompt('Error saving fields.'); setIsGeneratingImage(false); return; }

    const submittedRequest = `${mode} | ${mediaType} | ${subType}`;
    const finalOutput = {};

    if (mode || mediaType || subType)
      finalOutput.prompt_information = { mode, media_type: mediaType, media_sub_type: subType };

    if (businessProfile) {
      const filtered = Object.fromEntries(Object.entries(businessProfile).filter(([,v]) => v !== null && v !== ''));
      if (Object.keys(filtered).length) finalOutput.business_information = filtered;
    }

    if (finalPersonaData) finalOutput.persona_information = finalPersonaData;

    if (selectedProductData) {
      const product = { product_name: selectedProductData.product_name, description: selectedProductData.product_description, hashtags: selectedProductData.hashtags || [] };
      if (selectedProductData.features?.length) product.features = selectedProductData.features;
      if (selectedProductData.usps?.length)     product.USP      = selectedProductData.usps;
      if (selectedProductData.values?.length)   product.values   = selectedProductData.values;
      if (selectedProductData.images?.length)   product.images   = selectedProductData.images.map(img => img.img_url);
      finalOutput.product_information = product;
    }

    const dynamicFields = Object.entries(fieldValues)
      .filter(([,fd]) => fd.enabled && fd.value.trim())
      .reduce((acc, [key, fd]) => { acc[key] = fd.value; return acc; }, {});
    if (Object.keys(dynamicFields).length) finalOutput.creative_context = dynamicFields;

    setGeneratedPrompt(JSON.stringify(finalOutput, null, 2));

    try {

      setCurrentStage("generate");
        setSelectedStage("generate");

        await fetch(
          `${API}/execute/assign`,
          {
            method: "POST",
            headers: JSON_AUTH(),
            body: JSON.stringify({
              docket_id: Number(docketId),
              user_id: Number(assignedUser || 0),
              stage: "generate"
            })
          }
        );

        await refreshStage();





      const res  = await fetch(`${API}/planner/docket/${docketId}/media-result`, {
        method: 'POST', headers: JSON_AUTH(),
        body: JSON.stringify({

          visual_text:
            JSON.stringify(
              finalOutput
            ),

          submitted_request:
            submittedRequest,

          selected_logo:
            selectedLogo,

          selected_product_image:
            selectedProductImage

        }),
      });
      const data = await res.json();
      if (data.success) {
        fetch(`${API}/planner/docket/${docketId}/visual`, { headers: AUTH() })
          .then(r => r.json())
          .then(v => {
            if (v.success) {
              setVisualImage(v.url);
              setVisualMessage(v.message);
              setAdminMediaId(v.admin_media_id);
              setIsGeneratingImage(false);
            }
          });
        setShowSubmitToast(true);
        setTimeout(() => setShowSubmitToast(false), 3000);
        fetch(`${API}/planner/docket/${docketId}/media-history`, { headers: AUTH() })
          .then(r => r.json()).then(d => { if (d.success) setHistoryList(d.data); });
      }
    } catch (err) { setIsGeneratingImage(false); console.error(err); }
    setIsEditMode(false);
  }, [mode,
    mediaType,
    subType,
    businessProfile,
    finalPersonaData,
    selectedProductData,
    selectedProductImage,
    selectedLogo,
    fieldValues,
    docketId,
    mandatoryFields,
    optionalFields,
    assignedUser]);


  // ==========================================================================
  //  SUBMIT
  // ==========================================================================

  const handleSubmit = useCallback(async () => {
    const [ms, os] = await Promise.all([handleSave('mandatory'), handleSave('optional')]);
    if (!ms || !os) {
      setSaveToastMessage('Please fill all required fields.');
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 3000);
      return;
    }
    if (assignedUser || selectedStage) {
      await fetch(`${API}/execute/assign`, {
        method: 'POST', headers: JSON_AUTH(),
        body: JSON.stringify({ docket_id: Number(docketId), user_id: assignedUser, stage: selectedStage }),
      });
    }
    setSaveToastMessage('Submitted successfully!');
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
    setShowStageDropdown(false);
    setShowNamesDropdown(false);
  }, [mandatoryFields, optionalFields, fieldValues, assignedUser, selectedStage, docketId]);


  // ==========================================================================
  //  HISTORY / FEEDBACK
  // ==========================================================================

  const handleOpenHistory = useCallback(async () => {
    try {
      setVisualHistoryList([]); setSelectedHistoryPrompt(null);
      const res  = await fetch(`${API}/planner/docket/${docketId}/media-history`, { headers: AUTH() });
      const data = await res.json();
      if (data.success) { setHistoryList(data.data); setShowHistoryModal(true); }
    } catch (err) { console.error(err); }
  }, [docketId]);

  const handleOpenVisualHistory = useCallback(async () => {
    try {
      setHistoryList([]); setSelectedHistoryPrompt(null);
      const res  = await fetch(`${API}/admin/docket/${docketId}`, { headers: AUTH() });
      const data = await res.json();
      if (data.success) { setVisualHistoryList(data.data.visual_history ?? []); setShowHistoryModal(true); }
    } catch (err) { console.error(err); }
  }, [docketId]);

  const loadAssignHistory = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/execute/${docketId}/assignment-history`, { headers: AUTH() });
      const data = await res.json();
      if (data.success) { setAssignHistory(data.data); setShowAssignHistoryModal(true); }
    } catch (err) { console.error(err); }
  }, [docketId]);

  const loadFeedback = useCallback(async () => {
    if (!adminMediaId) return;
    try {
      const res  = await fetch(`${API}/feedback/${adminMediaId}`, { headers: AUTH() });
      const data = await res.json();
      if (data.success) setFeedbackList(data.data);
    } catch (err) { console.error(err); }
  }, [adminMediaId]);

  const loadDocketFeedback = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/feedback/docket/${docketId}`, { headers: AUTH() });
      const data = await res.json();
      if (data.success) setDocketFeedbackList(data.data);
    } catch (err) { console.error(err); }
  }, [docketId]);




  const handleSaveVisualMessage = async () => {

    try {

      const res = await fetch(
        `${API}/admin/docket/${docketId}/message`,
        {
          method: "POST",
          headers: JSON_AUTH(),
          body: JSON.stringify({
            message: visualMessage
          })
        }
      );

      const data = await res.json();

      if (data.success) {

        setIsEditMode(false);

      }

    } catch (err) {

      console.error(err);

    }

  };







  const submitFeedback = useCallback(async () => {
    if (!feedbackText.trim()) return;
    try {
      const res  = await fetch(`${API}/feedback`, {
        method: 'POST', headers: JSON_AUTH(),
        body: JSON.stringify({ docket_id: Number(docketId), admin_media_id: adminMediaId, feedback: feedbackText }),
      });
      const data = await res.json();
      if (data.success) { setFeedbackText(''); loadFeedback(); loadDocketFeedback(); }
    } catch (err) { console.error(err); }
  }, [feedbackText, docketId, adminMediaId, loadFeedback, loadDocketFeedback]);


  // ==========================================================================
  //  ADD CUSTOM FIELD MODAL
  // ==========================================================================

  const handleModalSave = useCallback(() => {
    if (!newFieldLabel.trim()) return;
    const variableKey = newFieldLabel.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const newField = { id: Date.now(), label: newFieldLabel, variable_name: variableKey, box: modalBoxType, isCustom: true };
    if (modalBoxType === 'mandatory') setMandatoryFields(prev => [...prev, newField]);
    else setOptionalFields(prev => [...prev, newField]);
    setFieldValues(prev => ({ ...prev, [variableKey]: { value: newFieldValue ?? '', enabled: true } }));
    setShowModal(false); setNewFieldLabel(''); setNewFieldValue('');
  }, [newFieldLabel, newFieldValue, modalBoxType]);


  // ==========================================================================
  //  CAROUSEL NAV
  // ==========================================================================

  const handleCarouselNav = (dir) => {
    const totalPages = Math.ceil(carouselTotal / CAROUSEL_PER_PAGE);
    const newPage = carouselPage + dir;
    if (newPage < 1 || newPage > totalPages) return;
    setCarouselPage(newPage);
    // NOTE: this no longer fires its own fetch — it used to call an
    // unfiltered `/planner/dockets-carousel` endpoint directly, which is
    // exactly the kind of stray call that let unfiltered data creep back
    // in. Pagination itself (page/page_size against the backend) isn't
    // wired up in the filtered endpoint yet — that's a separate, pre-existing
    // gap (carouselTotal is also never populated from the API today), not
    // part of this filter-persistence fix. Flagging it in case you want it
    // addressed next.
  };


  const descTitle = executeDescription.length;
  const descMax   = 5000;
  const veLen     = visualElements.length;
  const veMax     = 5000;
  const titleLen  = docketTitle.length;
  const titleMax  = 80;


  // ==========================================================================
  //  RENDER
  // ==========================================================================

  return (
    <div className="dm-page">

      {/* ════════ CAROUSEL ════════════════════════════════════════════════════ */}
      <div className="dm-carousel-new">
        <div className="dm-carousel-side-icons">
          <button
            className="dm-carousel-info-btn"
            title="Info"
            onClick={() => setLeftPanel(leftPanel === "info" ? null : "info")}
          >
            <InfoIconWhite />
          </button>
          <button
            className="dm-carousel-labels-btn"
            title="Labels"
            onClick={() => setLeftPanel(leftPanel === "labels" ? null : "labels")}
          >
            <LabelsIcon />
          </button>
        </div>

        <button
          className="dm-carousel-nav-btn"
          onClick={() => document.getElementById("executeCarousel")?.scrollBy({ left: -300, behavior: "smooth" })}
        >
          <PrevIcon />
        </button>

        <div className="dm-carousel-track-new" id="executeCarousel">
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

            const isActive = Number(item.docket_id) === Number(docketId);

            return (
              <div
                key={item.docket_id}
                className={`dm-carousel-item${isActive ? ' dm-carousel-item--active' : ''}`}
                onClick={() => navigate(`/docket-media/${item.docket_id}`)}
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

        <button
          className="dm-carousel-nav-btn"
          onClick={() => document.getElementById("executeCarousel")?.scrollBy({ left: 300, behavior: "smooth" })}
        >
          <NextIcon />
        </button>

        <div className="dm-carousel-pager-pill">
          {carouselPage}–{Math.min(carouselPage * CAROUSEL_PER_PAGE, carouselTotal || carouselDockets.length)} <ChevronDownIcon />
        </div>
      </div>

      {/* ════════ MAIN BODY ═══════════════════════════════════════════════════ */}
      <div className={`dm-body ${leftPanel ? "dm-body-info-open" : ""}`}>

          {/* ───────────────── INFO PANEL ───────────────── */}

          {leftPanel === "info" && (

          <div className="dm-info-panel">

              <div className="dm-info-card-new">

                  <div className="dm-info-header">

                      <h3>Execute Information</h3>

                  </div>

                  <div className="dm-info-body">

                      <div className="dm-info-grid">

                          <label>Topic</label>

                          <input
                              type="text"
                              value={selectedFilterOccasion || ""}
                              readOnly
                          />

                          <label>Date</label>

                          <input
                              type="text"
                              value={formattedDateTime}
                              readOnly
                          />

                          <label>Stage</label>

                          <input
                              type="text"
                              value={currentStage}
                              readOnly
                          />

                          <label>Media</label>

                          <input
                              type="text"
                              value={mediaType}
                              readOnly
                          />

                          <label>Sub Type</label>

                          <input
                              type="text"
                              value={subType}
                              readOnly
                          />

                          <label>Product</label>

                          <input
                              type="text"
                              value={selectedProductData?.product_name || ""}
                              readOnly
                          />

                          <label>Persona</label>

                          <input
                              type="text"
                              value={selectedPersonaData?.persona_name || ""}
                              readOnly
                          />

                      </div>

                  </div>

                  <div className="dm-info-footer">

                      <button
                          className="dm-info-save-btn"
                          onClick={handleFullSave}
                          disabled={!isCurrentOwner}
                      >
                          Save
                      </button>

                  </div>

              </div>

          </div>

          )}



    {/* ════════ LABELS MODAL ═════════════════════════════════════════════════ */}
      {leftPanel === "labels" && (

        <div className="dm-info-panel">

            <div className="dm-label-card">

                <div className="dm-info-header">

                    <h3>Labels</h3>

                    <button
                        className="dm-info-close"
                        onClick={() => setLeftPanel(null)}
                    >
                        <CloseIcon />
                    </button>

                </div>

                <div className="dm-label-body">
                  <div className="dm-label-sidebar">

                    {/* ===================== MANDATORY ===================== */}

                    <section className="docket-mandatory-section">

                        <div className="docket-optionals-header">

                            <h3 className="docket-column-title">
                                MANDATORY FIELDS
                            </h3>

                            <button
                                className="docket-add-more-btn"
                                onClick={() => {
                                    setModalBoxType("mandatory");
                                    setShowModal(true);
                                }}
                            >
                                Add More +
                            </button>

                        </div>

                        <div className="docket-form-section">

                            {mandatoryFields.map((field) => (

                                <div
                                    key={field.id}
                                    className="docket-field-row"
                                >

                                    <div className="docket-field-left">

                                        <input
                                            type="checkbox"
                                            className="docket-field-checkbox"
                                            checked={
                                                fieldValues[field.variable_name]?.enabled ||
                                                false
                                            }
                                            onChange={(e) =>
                                                setFieldValues(prev => ({
                                                    ...prev,
                                                    [field.variable_name]: {
                                                        ...prev[field.variable_name],
                                                        enabled: e.target.checked
                                                    }
                                                }))
                                            }
                                        />

                                        <label className="docket-field-label-text">
                                            {field.label}
                                        </label>

                                        {field.isCustom && (

                                            <button
                                                className="docket-delete-btn"
                                                onClick={() => handleDeleteCustomField(field)}
                                            >
                                                ×
                                            </button>

                                        )}

                                    </div>

                                    <textarea
                                        className="docket-field-textarea"
                                        value={
                                            fieldValues[field.variable_name]?.value || ""
                                        }
                                        rows={1}
                                        placeholder="Enter info..."
                                        onChange={(e) => {

                                            setFieldValues(prev => ({
                                                ...prev,
                                                [field.variable_name]: {
                                                    ...prev[field.variable_name],
                                                    value: e.target.value
                                                }
                                            }));

                                            const el = e.target;

                                            el.style.height = "auto";

                                            const lineH = 20;

                                            const pad = 16;

                                            const maxH = lineH * 3 + pad;

                                            const newH =
                                                Math.min(el.scrollHeight, maxH);

                                            el.style.height = `${newH}px`;

                                            el.style.overflowY =
                                                el.scrollHeight > maxH
                                                    ? "auto"
                                                    : "hidden";

                                        }}
                                    />

                                </div>

                            ))}

                        </div>

                    </section>

                    {/* ===================== OPTIONAL ===================== */}

                    <section className="docket-mandatory-section">

                        <div className="docket-optionals-header">

                            <h3 className="docket-column-title">
                                OPTIONAL FIELDS
                            </h3>

                            <button
                                className="docket-add-more-btn"
                                onClick={() => {
                                    setModalBoxType("optional");
                                    setShowModal(true);
                                }}
                            >
                                Add More +
                            </button>

                        </div>

                        <div className="docket-form-section">

                            {optionalFields.map((field) => (

                                <div
                                    key={field.id}
                                    className="docket-field-row"
                                >

                                    <div className="docket-field-left">

                                        <input
                                            type="checkbox"
                                            className="docket-field-checkbox"
                                            checked={
                                                fieldValues[field.variable_name]?.enabled ||
                                                false
                                            }
                                            onChange={(e) =>
                                                setFieldValues(prev => ({
                                                    ...prev,
                                                    [field.variable_name]: {
                                                        ...prev[field.variable_name],
                                                        enabled: e.target.checked
                                                    }
                                                }))
                                            }
                                        />

                                        <label className="docket-field-label-text">
                                            {field.label}
                                        </label>

                                        {field.isCustom && (

                                            <button
                                                className="docket-delete-btn"
                                                onClick={() => handleDeleteCustomField(field)}
                                            >
                                                ×
                                            </button>

                                        )}

                                    </div>

                                    <textarea
                                        className="docket-field-textarea"
                                        value={
                                            fieldValues[field.variable_name]?.value || ""
                                        }
                                        rows={1}
                                        placeholder="Enter info..."
                                        onChange={(e) => {

                                            setFieldValues(prev => ({
                                                ...prev,
                                                [field.variable_name]: {
                                                    ...prev[field.variable_name],
                                                    value: e.target.value
                                                }
                                            }));

                                            const el = e.target;

                                            el.style.height = "auto";

                                            const lineH = 20;

                                            const pad = 16;

                                            const maxH = lineH * 3 + pad;

                                            const newH =
                                                Math.min(el.scrollHeight, maxH);

                                            el.style.height = `${newH}px`;

                                            el.style.overflowY =
                                                el.scrollHeight > maxH
                                                    ? "auto"
                                                    : "hidden";

                                        }}
                                    />

                                </div>

                            ))}

                        </div>

                    </section>

                </div>
                </div>

                <div className="dm-label-footer">

                    <button
                        className="dm-info-save-btn"
                        onClick={handleFullSave}
                    >
                        Save Changes
                    </button>

                </div>

            </div>
          

        </div>

    )}








    {/* ───────────────── LEFT COLUMN ───────────────── */}

    <div className="dm-left-col">

          <div className="dm-left-content"></div>

          {/* ── SCROLLABLE FORM FIELDS (40%) ──────────────────────────────── */}
          <div className="dm-left-fields-scroll">

          {/* Top row: datetime + save icon */}
          <div className="dm-left-toprow">
            <span className="dm-datetime-text">{formattedDateTime}</span>
            <button className="dm-icon-sm" title="Save" onClick={handleFullSave} disabled={!isCurrentOwner}>
              <SaveIcon />
            </button>
          </div>

          {/* Title field */}
          <div className="dm-form-row">
            <label className="dm-form-label">Title</label>
            <div className="dm-form-field-wrap">
              <div className="dm-field-box">
                <input
                  className="dm-form-input"
                  type="text"
                  placeholder="Enter a catchy title"
                  disabled={!isCurrentOwner}
                  value={docketTitle}
                  maxLength={titleMax}
                  onChange={e => setDocketTitle(e.target.value)}
                />
                <div className="dm-field-overlay">
                  <span className="dm-char-count">{titleLen}/{titleMax}</span>
                  <button
                    type="button"
                    className="dm-expand-btn"
                    title="Expand"
                    onClick={() => setExpandField({ label: 'Title', value: docketTitle, onChange: setDocketTitle, maxLength: titleMax })}
                  >
                    <ExpandIcon/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Description field */}
          <div className="dm-form-row">
            <label className="dm-form-label">Description</label>
            <div className="dm-form-field-wrap">
              <div className="dm-field-box">
                <textarea
                  className="dm-form-textarea"
                  placeholder="Describe your visual"
                  disabled={!isCurrentOwner}
                  value={executeDescription}
                  maxLength={descMax}
                  rows={3}
                  onChange={e => setExecuteDescription(e.target.value)}
                />
                <div className="dm-field-overlay">
                  <span className="dm-char-count">{descTitle}/{descMax}</span>
                  <button
                    type="button"
                    className="dm-expand-btn"
                    title="Expand"
                    onClick={() => setExpandField({ label: 'Description', value: executeDescription, onChange: setExecuteDescription, maxLength: descMax })}
                  >
                    <ExpandIcon/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Visual elements field */}
          <div className="dm-form-row">
            <label className="dm-form-label">Visual elements</label>
            <div className="dm-form-field-wrap">
              <div className="dm-field-box">
                <textarea
                  className="dm-form-textarea"
                  placeholder="Add key elements to include"
                  disabled={!isCurrentOwner}
                  value={visualElements}
                  maxLength={veMax}
                  rows={3}
                  onChange={e => setVisualElements(e.target.value)}
                />
                <div className="dm-field-overlay">
                  <span className="dm-char-count">{veLen}/{veMax}</span>
                  <button
                    type="button"
                    className="dm-expand-btn"
                    title="Expand"
                    onClick={() => setExpandField({ label: 'Visual elements', value: visualElements, onChange: setVisualElements, maxLength: veMax })}
                  >
                    <ExpandIcon/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Summary field */}
          <div className="dm-form-row">
            <label className="dm-form-label">Summary</label>
            <div className="dm-form-field-wrap">
              <div className="dm-field-box">
                <textarea
                  className="dm-form-textarea"
                  placeholder="Enter summary"
                  disabled={!isCurrentOwner}
                  value={summary}
                  rows={3}
                  onChange={e => setSummary(e.target.value)}
                />
                <div className="dm-field-overlay">
                  <button
                    type="button"
                    className="dm-expand-btn"
                    title="Expand"
                    onClick={() => setExpandField({ label: 'Summary', value: summary, onChange: setSummary })}
                  >
                    <ExpandIcon/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          </div>{/* /dm-left-fields-scroll */}

          {/* ── AI / FEEDBACK CHAT ZONE (60%) ──────────────────── */}
          <div className="dm-left-chat-zone">

          {/* Tabs */}
          <div className="dm-tabs">
            <button className={`dm-tab${activeTab === 'ai' ? ' dm-tab--active' : ''}`} onClick={() => setActiveTab('ai')}>
              <SparkleIcon/> AI Assistant
            </button>
            <button className={`dm-tab${activeTab === 'designer' ? ' dm-tab--active' : ''}`} onClick={() => setActiveTab('designer')}>
              <PencilIcon/> Designer Feedback
            </button>
          </div>

          {/* AI Panel */}
          {activeTab === 'ai' && (
            <div className="dm-chat-panel">
              <div className="dm-chat-label"><SparkleIcon/> Chat with AI</div>
              <div className="dm-chat-bubbles">
                {conversationBubbles.map(b => <Bubble key={b.id} bubble={b}/>)}
                <div ref={chatEndRef}/>
              </div>
              <div className="dm-chat-footer">
                <div className="dm-chat-input-row">

                  <div className="dm-chat-input-wrap">

                    <input
                      className="dm-chat-input"
                      placeholder="Type your message"
                      disabled={!isCurrentOwner}
                      value={userMessage}
                      onChange={e => setUserMessage(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey && userMessage.trim()) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />

                    <button
                      className="dm-chat-send"
                      disabled={!isCurrentOwner}
                      onClick={isCurrentOwner && userMessage.trim() ? handleSendMessage : undefined}
                    >
                      <SendIcon active={Boolean(userMessage.trim())}/>
                    </button>

                  </div>

                  <button
                    className={`dm-generate-btn${canGenerate ? ' dm-generate-btn--on' : ''}`}
                    onClick={isCurrentOwner && canGenerate && !isGeneratingImage ? handleGenerate : undefined}
                    disabled={!isCurrentOwner || isGeneratingImage}
                  >
                    <SparkleIcon/>
                    {isGeneratingImage ? 'Generating…' : 'Generate'}
                    {!canGenerate && (
                      <div className="dm-tooltip">
                        <div className="dm-tooltip-title">Please fill:</div>
                        <ul>
                          {!mode && <li>Prompt Type</li>}
                          {mode && !mediaType && <li>Media Type</li>}
                          {mediaType && !subType && <li>Sub Type</li>}
                        </ul>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Designer Feedback Panel */}
          {activeTab === 'designer' && (
            <div className="dm-chat-panel">
              <div className="dm-chat-label"><PencilIcon/> Designer Feedback</div>
              <div className="dm-chat-bubbles">
                {groupedFeedback.length > 0 ? groupedFeedback.map((group, idx) => (
                  <div key={group.admin_media_id}>
                    <div className="dm-version-divider">
                      <span className="docket-hover-wrapper">
                        <span className="docket-hover-link">— Image Version {idx + 1} —</span>
                        {imageMap[group.admin_media_id] && (
                          <div className="docket-hover-popup docket-image-preview-popup">
                            <img src={imageMap[group.admin_media_id]} alt="preview"/>
                          </div>
                        )}
                      </span>
                    </div>
                    {group.messages.map(f => (
                      <div key={f.feedback_history_id} className={`docket-bubble-wrapper ${f.role === 'user' ? 'user-message' : 'ai-message'}`}>
                        <div className="docket-bubble">
                          <div style={{ fontSize: '10px', opacity: 0.7 }}>
                            {f.role === 'admin' ? 'Admin' : 'You'} • {new Date(f.created_at).toLocaleString()}
                          </div>
                          <div>{f.feedback}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )) : <div className="dm-chat-empty">No feedback yet.</div>}
              </div>
              <div className="dm-chat-footer">
                <div className="dm-chat-input-row">

                  <div className="dm-chat-input-wrap">

                    <input
                      className="dm-chat-input"
                      placeholder="Write feedback..."
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && feedbackText.trim()) {
                          e.preventDefault();
                          submitFeedback();
                        }
                      }}
                    />

                    <button
                      className="dm-chat-send"
                      onClick={feedbackText.trim() ? submitFeedback : undefined}
                    >
                      <SendIcon active={Boolean(feedbackText.trim())}/>
                    </button>

                  </div>

                </div>
              </div>
            </div>
          )}
          </div>{/* /dm-left-chat-zone */}
        </div>

        {/* ── MIDDLE THUMBNAIL STRIP ───────────────────────────────────────── */}
        <div className="dm-thumb-strip">
          <div className="dm-thumb-logo">
            {selectedLogo
              ? <img src={selectedLogo} alt="logo"/>
              : <div className="dm-thumb-empty-logo"/>
            }
          </div>

          {selectedProductData?.images?.length ? (
            selectedProductData.images.map((img, index) => (
              <div
                key={index}
                className={`dm-thumb-img${selectedProductImage === img.img_url ? ' dm-thumb-img--active' : ''}`}
                onClick={() => setSelectedProductImage(img.img_url)}
                onMouseEnter={() => setPreviewProductImage(img.img_url)}
                onMouseLeave={() => setPreviewProductImage(null)}
              >
                <img src={img.img_url} alt={`Product ${index + 1}`}/>
                {selectedProductImage === img.img_url && <div className="dm-thumb-selected-dot"/>}
                {previewProductImage === img.img_url && (
                  <div className="dm-thumb-preview-popup">
                    <img src={img.img_url} alt="preview"/>
                  </div>
                )}
              </div>
            ))
          ) : selectedProductImage ? (
            <div className="dm-thumb-img dm-thumb-img--active">
              <img src={selectedProductImage} alt="Product"/>
              <div className="dm-thumb-selected-dot"/>
            </div>
          ) : null}

          <label className="dm-thumb-upload">
            <input type="file" accept="image/*" hidden onChange={handleProductImageUpload}/>
            <span>+</span>
          </label>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────────── */}
        <div className="dm-right-col">

          <div className="dm-section-header">
            <span className="dm-section-title">Generated Visual</span>
            <button className="dm-icon-sm" onClick={handleOpenVisualHistory} title="Visual history"><ClockIcon/></button>
          </div>

          <div className="dm-visual-canvas">
            {isGeneratingImage ? (
              <div className="dm-visual-loading">
                <div className="dm-spinner"/>
                <span>AI is generating your visual…</span>
              </div>
            ) : visualImage ? (
              <img src={visualImage} className="dm-visual-img" alt="Generated visual"/>
            ) : (
              <div className="dm-visual-empty"/>
            )}
          </div>

          <div className="dm-visual-actions">
            <button
              className="dm-icon-sm"
              title="Expand"
              disabled={!visualImage}
              onClick={() => visualImage && setShowImagePreview(true)}
            >
              <ExpandIcon/>
            </button>
            <button
              className="dm-icon-sm"
              title="Download"
              disabled={!visualImage}
              onClick={() => visualImage && downloadImage(visualImage, docketId)}
            >
              <DownloadIcon/>
            </button>
            <button className="dm-upload-btn" onClick={() => fileInputRef.current?.click()}>Upload</button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleManualImageUpload}
            />
          </div>

          <div className="dm-message-section">
            <div className="dm-section-header">
              <span className="dm-section-title">Message</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  className="dm-icon-sm"
                  title="Expand"
                  onClick={() => setExpandField({ label: 'Message', value: visualMessage, onChange: setVisualMessage })}
                >
                  <ExpandIcon/>
                </button>
                <button
                  className="dm-icon-sm"
                  title="Copy message"
                  onClick={() => {
                    navigator.clipboard.writeText(visualMessage || '');
                    setShowCopyToast(true);
                    setTimeout(() => setShowCopyToast(false), 2000);
                  }}
                >
                  <CopyIcon/>
                </button>
              </div>
            </div>
            <div className="dm-message-body">
              {isEditMode
                ? <textarea className="dm-message-editor" value={visualMessage} onChange={e => setVisualMessage(e.target.value)}/>
                : (visualMessage || '')}
            </div>
            <div className="dm-message-edit-row">
              {isEditMode
                ? <button className="dm-msg-save-btn" onClick={handleSaveVisualMessage}>Save</button>
                : <button className="dm-msg-edit-btn" onClick={() => setIsEditMode(true)}>✏️ Edit</button>
              }
            </div>
          </div>

          <div className="dm-bottom-actions">
            <div className="dm-action-wrap">
              <button
                className="dm-action-btn"
                onClick={() => { setShowStageDropdown(p => !p); setShowNamesDropdown(false); }}
              >
                <StagesIcon/> Stages
              </button>
              {showStageDropdown && (
                <div className="dm-dropdown">
                  <div className="dm-dropdown-title">Select Stage</div>
                  <div className="dm-dropdown-current">{currentStage} (current)</div>
                  {nextStages.map(stage => (
                    <div
                      key={stage}
                      className={`dm-dropdown-item${selectedStage === stage ? ' dm-dropdown-item--active' : ''}`}
                      onClick={() => { setSelectedStage(stage); setShowStageDropdown(false); }}
                    >
                      {stage}
                    </div>
                  ))}
                  {nextStages.length === 0 && (
                    <div className="dm-dropdown-empty">No next stages available</div>
                  )}
                </div>
              )}
            </div>

            <div className="dm-action-wrap">
              <button
                className="dm-action-btn"
                onClick={() => { setShowNamesDropdown(p => !p); setShowStageDropdown(false); }}
              >
                <NamesIcon/> {assignedUser ? networkUsers.find(u => u.user_id === assignedUser)?.email?.split('@')[0] || 'Names' : 'Names'}
              </button>
              {showNamesDropdown && (
                <div className="dm-dropdown">
                  <div className="dm-dropdown-title">Assign To</div>
                  {networkUsers.length > 0 ? networkUsers.map(u => (
                    <div
                      key={u.user_id}
                      className={`dm-dropdown-item${assignedUser === u.user_id ? ' dm-dropdown-item--active' : ''}`}
                      onClick={() => { setAssignedUser(u.user_id); setShowNamesDropdown(false); }}
                    >
                      {u.email}
                    </div>
                  )) : (
                    <div className="dm-dropdown-empty">No users in network</div>
                  )}
                </div>
              )}
            </div>

            <div className="dm-action-wrap">
              <button className="dm-action-btn dm-action-btn--submit" onClick={handleSubmit}>
                <SubmitIcon/> Submit
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* END MAIN BODY */}

      {/* ════════ CREATE EXECUTE MODAL ════════════════════════════════════════ */}
      {showCreateExecuteModal && (
        <div className="dm-overlay" onClick={() => setShowCreateExecuteModal(false)}>
          <div className="dm-modal" onClick={e => e.stopPropagation()}>
            <div className="dm-modal-header">
              <h3>Create Execute</h3>
              <button className="dm-modal-close" onClick={() => setShowCreateExecuteModal(false)}><CloseIcon/></button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-modal-group">
                <label>Execute Title</label>
                <input type="text" value={newDocketTitle} onChange={e => setNewDocketTitle(e.target.value)}/>
              </div>
              <div className="dm-modal-group">
                <label>Upload Schedule</label>
                <DatePicker
                  selected={newUploadedDateTime}
                  popperPlacement="bottom-end"
                  onChange={(date) => setNewUploadedDateTime(date)}
                  showTimeSelect
                  dateFormat="MMM d, yyyy h:mm aa"
                  timeFormat="hh:mm aa"
                  timeIntervals={15}
                  className="planner-datepicker"
                  placeholderText="Select upload time"
                />
              </div>
              <div className="dm-modal-group">
                <label>Execute Description</label>
                <textarea value={newExecuteDescription} onChange={e => setNewExecuteDescription(e.target.value)} placeholder="Enter execute description..."/>
              </div>
              <div className="dm-modal-group">
                <label>Visual Elements</label>
                <textarea value={newVisualElements} onChange={e => setNewVisualElements(e.target.value)} placeholder="Enter visual elements..."/>
              </div>
              <div className="dm-modal-group">
                <label>Prompt Type</label>
                <select
                  value={newMode}
                  onChange={(e) => { setNewMode(e.target.value); setNewMediaType(""); setNewSubType(""); }}
                >
                  <option value="">Select Prompt Type</option>
                  <option value="message">Message</option>
                  <option value="visuals">Visuals</option>
                </select>
              </div>
              {newMode && (
                <div className="dm-modal-group">
                  <label>{newMode === "message" ? "Message Type" : "Visual Type"}</label>
                  <select
                    value={newMediaType}
                    onChange={(e) => { setNewMediaType(e.target.value); setNewSubType(""); }}
                  >
                    <option value="">Select Type</option>
                    {createMediaTypes.map((t) => (
                      <option key={t.media_type} value={t.media_type}>{t.media_type}</option>
                    ))}
                  </select>
                </div>
              )}
              {newMediaType && (
                <div className="dm-modal-group">
                  <label>{newMode === "message" ? "Message Sub Type" : "Visual Sub Type"}</label>
                  <select value={newSubType} onChange={(e) => setNewSubType(e.target.value)}>
                    <option value="">Select Sub Type</option>
                    {createSubTypes.map((s) => (
                      <option key={s.subtype_name} value={s.subtype_name}>{s.subtype_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="dm-modal-group">
                <label>Product</label>
                <select value={newProductId} onChange={(e) => setNewProductId(e.target.value)}>
                  <option value="">Select Product</option>
                  {productList.map((p) => (
                    <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                  ))}
                </select>
              </div>
              <div className="dm-modal-group">
                <label>Persona</label>
                <select value={newPersonaId} onChange={(e) => setNewPersonaId(e.target.value)}>
                  <option value="">Select Persona</option>
                  {personaList.map((p) => (
                    <option key={p.persona_id} value={p.persona_id}>{p.persona_name}</option>
                  ))}
                </select>
              </div>
              <div className="dm-modal-group">
                <label>Topic</label>
                <select value={newOccasionId} onChange={(e) => setNewOccasionId(e.target.value)}>
                  <option value="">Select Topic</option>
                  {occasionList.map((event) => (
                    <option key={event.occasion_id} value={event.occasion_id}>{event.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-modal-btn dm-modal-btn--cancel" onClick={() => setShowCreateExecuteModal(false)}>Cancel</button>
              <button className="dm-modal-btn dm-modal-btn--save" onClick={handleCreateExecute}>Create Execute</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ EXPAND FIELD MODAL ═══════════════════════════════════════════ */}
      {expandField && (
        <div className="dm-overlay" onClick={() => setExpandField(null)}>
          <div className="dm-modal dm-modal--expand" onClick={e => e.stopPropagation()}>
            <div className="dm-modal-header">
              <h3>{expandField.label}</h3>
              <button className="dm-modal-close" onClick={() => setExpandField(null)}><CloseIcon/></button>
            </div>
            <div className="dm-modal-body">
              <textarea
                className="dm-expand-textarea"
                value={expandField.value}
                maxLength={expandField.maxLength}
                disabled={!isCurrentOwner}
                autoFocus
                onChange={e => {
                  const val = e.target.value;
                  expandField.onChange(val);
                  setExpandField(f => (f ? { ...f, value: val } : f));
                }}
              />
              {typeof expandField.maxLength === 'number' && (
                <div className="dm-char-count" style={{ marginTop: 6 }}>
                  {expandField.value.length}/{expandField.maxLength}
                </div>
              )}
            </div>
            <div className="dm-modal-footer">
              <button className="dm-modal-btn dm-modal-btn--save" onClick={() => setExpandField(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ HISTORY MODAL ════════════════════════════════════════════════ */}
      {showHistoryModal && (
        <div className="dm-overlay" onClick={() => { setShowHistoryModal(false); setSelectedHistoryPrompt(null); }}>
          <div className="dm-modal dm-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="dm-modal-header">
              {!selectedHistoryPrompt ? <h3>Visual Information History</h3> : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button className="dm-modal-back" onClick={() => setSelectedHistoryPrompt(null)}>←</button>
                  <div>
                    <h3>Version {selectedHistoryPrompt.version}</h3>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(selectedHistoryPrompt.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              )}
              <button className="dm-modal-close" onClick={() => { setShowHistoryModal(false); setSelectedHistoryPrompt(null); }}><CloseIcon/></button>
            </div>
            <div className="dm-modal-body">
              {visualHistoryList.length > 0 ? (
                visualHistoryList.map((item, idx) => (
                  <div key={item.admin_media_id} className="dm-history-item">
                    <strong>Version {visualHistoryList.length - idx}</strong>
                    <div className="dm-history-time">{new Date(item.created_at).toLocaleString()}</div>
                    <img src={item.uploaded_url} alt="visual" style={{ width: '100%', marginTop: 10, borderRadius: 6 }}/>
                    {item.message && <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{item.message}</div>}
                  </div>
                ))
              ) : !selectedHistoryPrompt ? (
                historyList.map((item, idx) => (
                  <div
                    key={item.docket_result_id}
                    className="dm-history-item dm-history-item--btn"
                    onClick={() => setSelectedHistoryPrompt({ text: item.visual_text, version: historyList.length - idx, createdAt: item.created_at })}
                  >
                    <strong>Version {historyList.length - idx}</strong>
                    <div className="dm-history-time">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                ))
              ) : (
                <pre className="dm-history-pre">{(() => { try { return JSON.stringify(JSON.parse(selectedHistoryPrompt.text), null, 2); } catch { return selectedHistoryPrompt.text; } })()}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════ ADD CUSTOM FIELD MODAL ═══════════════════════════════════════ */}
      {showModal && (
        <div className="dm-overlay" onClick={() => setShowModal(false)}>
          <div className="dm-modal" onClick={e => e.stopPropagation()}>
            <div className="dm-modal-header">
              <h3>Add Custom Field</h3>
              <button className="dm-modal-close" onClick={() => setShowModal(false)}><CloseIcon/></button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-modal-group">
                <label>Field Name</label>
                <input type="text" autoFocus value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="e.g. Special Instructions"/>
              </div>
              <div className="dm-modal-group">
                <label>Field Value (Optional)</label>
                <input type="text" value={newFieldValue} onChange={e => setNewFieldValue(e.target.value)} placeholder="e.g. Handle with care"/>
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-modal-btn dm-modal-btn--cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="dm-modal-btn dm-modal-btn--save" onClick={handleModalSave} disabled={!newFieldLabel.trim()}>Save Field</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ FEEDBACK MODAL ═══════════════════════════════════════════════ */}
      {showFeedbackModal && (
        <div className="dm-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="dm-modal dm-modal--feedback" onClick={e => e.stopPropagation()}>
            <div className="dm-modal-header">
              <h3>Feedback</h3>
              <button className="dm-modal-close" onClick={() => setShowFeedbackModal(false)}><CloseIcon/></button>
            </div>
            <div className="dm-modal-body dm-modal-body--scroll">
              {feedbackList.length === 0
                ? <div className="dm-empty">No messages yet. Start the conversation!</div>
                : feedbackList.map(f => (
                  <div key={f.feedback_history_id} className={`docket-bubble-wrapper ${f.role === 'admin' ? 'ai-message' : 'user-message'}`}>
                    <div className="docket-bubble">
                      <div className="docket-bubble-meta">{f.role === 'admin' ? 'Admin' : 'You'} • {new Date(f.created_at).toLocaleString()}</div>
                      <div>{f.feedback}</div>
                    </div>
                  </div>
                ))
              }
              <div ref={feedbackBottomRef}/>
            </div>
            <div className="dm-modal-footer">
              <textarea
                className="dm-feedback-input"
                placeholder="Write feedback..."
                value={feedbackText}
                rows={3}
                onChange={e => setFeedbackText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && feedbackText.trim()) { e.preventDefault(); submitFeedback(); } }}
              />
              <button
                className={`dm-modal-btn dm-modal-btn--save${!feedbackText.trim() ? ' dm-modal-btn--disabled' : ''}`}
                onClick={feedbackText.trim() ? submitFeedback : undefined}
                disabled={!feedbackText.trim()}
              >
                <SendIcon active={Boolean(feedbackText.trim())}/> Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ ASSIGNMENT HISTORY MODAL ═════════════════════════════════════ */}
      {showAssignHistoryModal && (
        <div className="dm-overlay" onClick={() => setShowAssignHistoryModal(false)}>
          <div className="dm-modal" onClick={e => e.stopPropagation()}>
            <div className="dm-modal-header">
              <h3>Assignment Flow</h3>
              <button className="dm-modal-close" onClick={() => setShowAssignHistoryModal(false)}><CloseIcon/></button>
            </div>
            <div className="dm-modal-body">
              {assignHistory.length === 0
                ? <div className="dm-empty">No assignment history.</div>
                : (
                  <div className="dm-assign-flow">
                    {assignHistory.map((item, idx) => (
                      <div key={item.assignment_id} className="dm-assign-row">
                        <div className="dm-assign-users">
                          <strong>{item.assigned_by_email}</strong> → <strong>{item.assigned_to_email}</strong>
                        </div>
                        <div className="dm-assign-meta">
                          <span className="dm-assign-stage">{item.stage}</span>
                          <span className="dm-assign-time">{new Date(item.created_at).toLocaleString()}</span>
                        </div>
                        {idx < assignHistory.length - 1 && <div className="dm-assign-arrow">↓</div>}
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          </div>
        </div>
      )}

      {/* Dropdown backdrop */}
      {(showStageDropdown || showNamesDropdown) && (
        <div className="dm-dropdown-backdrop" onClick={() => { setShowStageDropdown(false); setShowNamesDropdown(false); }}/>
      )}

      {/* ════════ TOASTS ════════════════════════════════════════════════════ */}
      {showCopyToast && (
        <div className="dm-toast dm-toast--success">
          <CheckIcon/> <span>Copied to clipboard!</span>
        </div>
      )}
      {showSaveToast && (
        <div className={`dm-toast ${saveToastMessage.includes('Please fill') ? 'dm-toast--error' : 'dm-toast--success'}`}>
          {saveToastMessage.includes('Please fill') ? <WarnIcon/> : <CheckIcon/>}
          <span>{saveToastMessage}</span>
        </div>
      )}
      {showSubmitToast && (
        <div className="dm-toast dm-toast--success">
          <CheckIcon/> <span>Submitted successfully!</span>
        </div>
      )}

      {showImagePreview && visualImage && (
        <div className="dm-image-preview-overlay" onClick={() => setShowImagePreview(false)}>
          <img src={visualImage} alt="Preview" className="dm-image-preview" onClick={(e) => e.stopPropagation()}/>
        </div>
      )}

    </div>
  );
};

export default DocketMedia;