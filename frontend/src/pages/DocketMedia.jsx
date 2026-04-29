// =============================================================================
//  DocketMedia.jsx  —  Elevantia PACE
//  Enhanced: parallel data fetching, extracted sub-components, deduplicated
//  auto-grow logic, memoised helpers, stable token helper, no behaviour change.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/docket.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_BACKEND_URL;
const TOKEN = () => localStorage.getItem('token');
const AUTH  = () => ({ Authorization: `Bearer ${TOKEN()}` });
const JSON_AUTH = () => ({ 'Content-Type': 'application/json', ...AUTH() });

const TEXTAREA_LINE_H = 20;
const TEXTAREA_PAD    = 16;
const TEXTAREA_MAX_H  = TEXTAREA_LINE_H * 3 + TEXTAREA_PAD;

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Auto-resize a textarea element up to TEXTAREA_MAX_H. */
function resizeTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';
  const newH = Math.min(el.scrollHeight, TEXTAREA_MAX_H);
  el.style.height = `${newH}px`;
  el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_H ? 'auto' : 'hidden';
}

/** Redirect to login on 401. Returns true if unauthorised. */
function handleUnauthorized(res) {
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/';
    return true;
  }
  return false;
}

/** Build a structured persona object grouped by segment_type. */
function buildStructuredPersona(persona) {
  if (!persona) return null;
  const grouped = {};
  persona.segments
    ?.filter(seg => seg.is_active)
    .forEach(seg => {
      if (!grouped[seg.segment_type]) grouped[seg.segment_type] = {};
      const key = seg.label
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      grouped[seg.segment_type][key] = seg.value;
    });
  return { persona_name: persona.persona_name, segments: grouped, hashtags: persona.hashtags || []};
}

/** Download an image via fetch → blob → anchor, with canvas fallback. */
async function downloadImage(url, docketId) {
  const parts   = url.split(/[?#]/)[0].split('/');
  const rawName = parts[parts.length - 1] || `visual-output-${docketId}`;
  const fileName = /\.[a-z]{2,5}$/i.test(rawName) ? rawName : `${rawName}.png`;

  const triggerDownload = (href, download = fileName) => {
    const a = Object.assign(document.createElement('a'), { href, download, style: 'display:none' });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const objectUrl = URL.createObjectURL(await res.blob());
    triggerDownload(objectUrl);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    return;
  } catch { /* fall through to canvas */ }

  // Canvas fallback
  try {
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          const objectUrl = URL.createObjectURL(blob);
          triggerDownload(objectUrl);
          setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
          resolve();
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    });
  } catch {
    // Last resort — open in new tab
    triggerDownload(url);
  }
}


// =============================================================================
//  SMALL PURE COMPONENTS  (extracted to avoid re-defining on every render)
// =============================================================================

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const ClockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#6B7280" strokeWidth="2" />
    <path d="M12 7V12L15 15" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M15 5L5 15M5 5L15 15" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const SendIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
      stroke={active ? '#4A90E2' : '#9CA3AF'}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HamburgerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M4 6h16M4 12h16M4 18h16" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Tooltip Label ───────────────────────────────────────────────────────────
const TooltipLabel = ({ text, tooltip }) => (
  <div className="docket-label-with-tooltip">
    <label>{text}</label>
    <div className="docket-info-wrapper">
      <span className="docket-info-icon">?</span>
      <div className="docket-tooltip">{tooltip}</div>
    </div>
  </div>
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
      <input
        type="checkbox"
        className="docket-field-checkbox"
        checked={fieldData?.enabled ?? false}
        onChange={e => onToggle(field.variable_name, e.target.checked)}
      />
      <label className="docket-field-label-text">{field.label}</label>
      {field.isCustom && (
        <button className="docket-delete-btn" onClick={() => onValueChange(field, null)}>×</button>
      )}
    </div>
    <AutoTextarea
      value={fieldData?.value ?? ''}
      onChange={val => onValueChange(field.variable_name, val)}
    />
  </div>
));

// ─── Product Preview ─────────────────────────────────────────────────────────
const ProductPreview = React.memo(({ product }) => {
  if (!product) return null;
  return (
    <div className="docket-preview-card">
      <h4>{product.product_name}</h4>
      <p className="preview-desc">{product.product_description}</p>
      {product.features?.length > 0 && (<><strong>Features</strong><ul>{product.features.map((f, i) => <li key={i}>{f}</li>)}</ul></>)}
      {product.usps?.length > 0    && (<><strong>USP</strong>    <ul>{product.usps.map((u, i) => <li key={i}>{u}</li>)}</ul></>)}
      {product.values?.length > 0  && (<><strong>Values</strong> <ul>{product.values.map((v, i) => <li key={i}>{v}</li>)}</ul></>)}
      {product.images?.length > 0  && (
        <div className="preview-images">
          {product.images.map((img, i) => <img key={i} src={img.img_url} alt="" />)}
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
            {Object.entries(vals).map(([label, value], i) => (
              <li key={i}><strong>{label}</strong>: {value}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
});

// ─── Conversation Bubble ─────────────────────────────────────────────────────
const Bubble = React.memo(({ bubble }) => (
  <div className={`docket-bubble-wrapper ${bubble.sender === 'user' ? 'user-message' : 'ai-message'}`}>
    <div className="docket-bubble">
      {bubble.isLoading
        ? <div className="docket-bubble-loading"><span /><span /><span /></div>
        : bubble.text}
    </div>
  </div>
));

// ─── Toast ───────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const WarnIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
    <path d="M12 8V12" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1" fill="white" />
  </svg>
);


// =============================================================================
//  MAIN COMPONENT
// =============================================================================
const DocketMedia = () => {
  const { docketId } = useParams();

  // ── Mode / Media ──────────────────────────────────────────────────────────
  const [mode,      setMode]      = useState('');
  const [subMode,   setSubMode]   = useState('');
  const [mediaType, setMediaType] = useState('');
  const [subType,   setSubType]   = useState('');
  const [mediaTypes, setMediaTypes] = useState([]);
  const [subTypes,   setSubTypes]   = useState([]);

  // ── Docket info ──────────────────────────────────────────────────────────
  const [docketTitle, setDocketTitle] = useState('');

  // ── Product / Persona ─────────────────────────────────────────────────────
  const [productList,          setProductList]          = useState([]);
  const [selectedProductId,    setSelectedProductId]    = useState('');
  const [selectedProductData,  setSelectedProductData]  = useState(null);
  const [personaList,          setPersonaList]          = useState([]);
  const [selectedPersonaId,    setSelectedPersonaId]    = useState('');
  const [selectedPersonaData,  setSelectedPersonaData]  = useState(null);

  // ── Fields ────────────────────────────────────────────────────────────────
  const [mandatoryFields, setMandatoryFields] = useState([]);
  const [optionalFields,  setOptionalFields]  = useState([]);
  const [fieldValues,     setFieldValues]     = useState({});

  // ── Network / Assignment ─────────────────────────────────────────────────
  const [networkUsers,  setNetworkUsers]  = useState([]);
  const [assignedUser,  setAssignedUser]  = useState('');

  // ── Stage ─────────────────────────────────────────────────────────────────
  const [currentStage,  setCurrentStage]  = useState('draft');
  const [selectedStage, setSelectedStage] = useState('');
  const [nextStages,    setNextStages]    = useState([]);

  // ── History ───────────────────────────────────────────────────────────────
  const [showHistoryModal,      setShowHistoryModal]      = useState(false);
  const [historyList,           setHistoryList]           = useState([]);
  const [selectedHistoryPrompt, setSelectedHistoryPrompt] = useState(null);
  const [visualHistoryList,     setVisualHistoryList]     = useState([]);

  // ── Visual output ─────────────────────────────────────────────────────────
  const [visualImage,   setVisualImage]   = useState(null);
  const [visualMessage, setVisualMessage] = useState('');

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
    id: 1,
    text: 'Use AI to Automatically fill in all Fields Based on your Needs.',
    type: 'ai',
    sender: 'ai',
  }]);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [showCopyToast,   setShowCopyToast]   = useState(false);
  const [showSaveToast,   setShowSaveToast]   = useState(false);
  const [saveToastMessage,setSaveToastMessage]= useState('');
  const [showSubmitToast, setShowSubmitToast] = useState(false);

  // ── Validation / prompt ───────────────────────────────────────────────────
  const [canGenerate,     setCanGenerate]     = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isEditMode,      setIsEditMode]      = useState(false);

  // ── Add-field modal ───────────────────────────────────────────────────────
  const [showModal,     setShowModal]     = useState(false);
  const [modalBoxType,  setModalBoxType]  = useState('optional');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // ── Column expand ─────────────────────────────────────────────────────────
  const [expandedCol, setExpandedCol] = useState(null);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const [businessProfile, setBusinessProfile] = useState(null);
  const [categories,      setCategories]      = useState([]);

  // ── Memoised derived values ────────────────────────────────────────────────
  const finalPersonaData = useMemo(
    () => buildStructuredPersona(selectedPersonaData),
    [selectedPersonaData]
  );

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


  // ===========================================================================
  //  DATA FETCHING
  // ===========================================================================

  // ── Bootstrap: load everything that depends only on docketId in parallel ──
  useEffect(() => {
    if (!docketId) return;

    const headers = AUTH();

    // All parallel fetches that kick off at once
    Promise.allSettled([
      // 1. Docket info
      fetch(`${API}/planner/docket/${docketId}`, { headers })
        .then(r => r.json())
        .then(data => {
          if (!data.success) return;
          const d = data.data;
          setDocketTitle(d.title);
          setMode(d.media_name);
          setMediaType(d.media_type);
          setSubType(d.subtype_name);
          setSelectedProductId(d.product_id || '');
          setSelectedPersonaId(d.persona_id || '');
        }),

      // 2. Business profile
      fetch(`${API}/docket/${docketId}/business`, { headers })
        .then(r => { handleUnauthorized(r); return r.json(); })
        .then(data => { if (data.success) setBusinessProfile(data.data); }),

      // 3. Product data
      fetch(`${API}/docket/${docketId}/product`, { headers })
        .then(r => r.json())
        .then(data => { if (data.success) setSelectedProductData(data.data); }),

      // 4. Persona data
      fetch(`${API}/docket/${docketId}/persona`, { headers })
        .then(r => r.json())
        .then(data => { if (data.success) setSelectedPersonaData(data.data); }),

      // 5. Visual output
      fetch(`${API}/planner/docket/${docketId}/visual`, { headers })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setVisualImage(data.url);
            setVisualMessage(data.message);
            setAdminMediaId(data.admin_media_id);
          }
        }),

      // 6. Media history list
      fetch(`${API}/planner/docket/${docketId}/media-history`, { headers })
        .then(r => r.json())
        .then(data => { if (data.success) setHistoryList(data.data); }),

      // 7. Docket feedback
      fetch(`${API}/feedback/docket/${docketId}`, { headers })
        .then(r => r.json())
        .then(data => { if (data.success) setDocketFeedbackList(data.data); }),

      // 8. Chat history
      fetch(`${API}/planner/docket/${docketId}/chat-history`, { headers })
        .then(r => r.json())
        .then(data => {
          if (!data.success) return;
          const bubbles = [];
          data.data.forEach((item, i) => {
            bubbles.push({ id: Date.now() + i,        text: item.user,                                    sender: 'user', type: 'user' });
            bubbles.push({ id: Date.now() + i + 1000, text: 'Fields updated based on previous request.', sender: 'ai',   type: 'ai'   });
          });
          setConversationBubbles(prev => [...prev, ...bubbles]);
        }),

      // 9. Stage
      fetch(`${API}/execute/current-stage/${docketId}`, { headers })
        .then(r => r.json())
        .then(data => { if (data.success) { setCurrentStage(data.stage); setSelectedStage(data.stage); } }),

      // 10. Network users
      fetch(`${API}/network/secondary-users?docket_id=${docketId}`, { headers })
        .then(r => r.json())
        .then(data => { if (data.success) setNetworkUsers(data.data); }),
    ]).catch(err => console.error('Bootstrap fetch error:', err));

    // 11. Categories (does not need docketId)
    fetch(`${API}/categories`, { headers: AUTH() })
      .then(r => { handleUnauthorized(r); return r.json(); })
      .then(data => data && setCategories(data))
      .catch(console.error);

    // 12. Personas list
    fetch(`${API}/personas`, { headers: AUTH() })
      .then(r => r.json())
      .then(data => { if (data.success) setPersonaList(data.data); })
      .catch(console.error);

  }, [docketId]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch next stages whenever current stage changes ──────────────────────
  useEffect(() => {
    if (!currentStage) return;
    fetch(`${API}/process-stages/${currentStage}`, { headers: AUTH() })
      .then(r => r.json())
      .then(data => { if (data.success) setNextStages(data.data); })
      .catch(console.error);
  }, [currentStage]);

  // ── Media types when mode changes ─────────────────────────────────────────
  useEffect(() => {
    if (!mode) { setMediaTypes([]); return; }
    fetch(`${API}/media-types?mode=${mode}`, { headers: AUTH() })
      .then(r => r.json())
      .then(data => { if (data.success) setMediaTypes(data.data); })
      .catch(console.error);
  }, [mode]);

  // ── Subtypes when mediaType changes ───────────────────────────────────────
  useEffect(() => {
    if (!mediaType) return;
    fetch(`${API}/media-subtypes?mode=${mode}&mediaType=${mediaType}`, { headers: AUTH() })
      .then(r => r.json())
      .then(data => { if (data.success) setSubTypes(data.data); })
      .catch(console.error);
  }, [mediaType]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Field definitions when mode/mediaType/subType all ready ──────────────
  useEffect(() => {
    if (!mode || !mediaType || !subType) return;

    async function fetchFields() {
      try {
        const res  = await fetch(
          `${API}/media-fields?mode=${mode}&mediaType=${mediaType}&subType=${subType}`,
          { headers: AUTH() }
        );
        const data = await res.json();
        if (!data.success) return;

        const defaultMandatory = data.data.mandatory ?? [];
        const defaultOptional  = data.data.optional  ?? [];
        setMandatoryFields(defaultMandatory);
        setOptionalFields(defaultOptional);

        const initialValues = {};
        [...defaultMandatory, ...defaultOptional].forEach(f => {
          initialValues[f.variable_name] = { value: '', enabled: true };
        });
        setFieldValues(initialValues);

        loadSavedFieldValues(defaultMandatory, defaultOptional);
      } catch (err) {
        console.error('Failed to load media subtype fields', err);
      }
    }
    fetchFields();
  }, [mode, mediaType, subType]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── canGenerate ───────────────────────────────────────────────────────────
  useEffect(() => {
    setCanGenerate(Boolean(mode && mediaType && subType));
  }, [mode, mediaType, subType]);

  // ── Feedback scroll to bottom ─────────────────────────────────────────────
  useEffect(() => {
    if (showFeedbackModal && feedbackBottomRef.current) {
      feedbackBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [feedbackList, showFeedbackModal]);


  // ===========================================================================
  //  HELPERS
  // ===========================================================================

  async function loadSavedFieldValues(defaultMandatory = [], defaultOptional = []) {
    try {
      const res  = await fetch(`${API}/planner/docket/${docketId}/fields`, { headers: AUTH() });
      const data = await res.json();
      if (!data.success) return;

      const savedValues       = {};
      const newMandatoryCustom = [];
      const newOptionalCustom  = [];

      data.data.forEach(row => {
        savedValues[row.label] = { value: row.value, enabled: row.checkbox_clicked === 1 };
        const existsInDefaults =
          defaultMandatory.some(f => f.variable_name === row.label) ||
          defaultOptional.some(f => f.variable_name === row.label);

        if (!existsInDefaults) {
          const customField = {
            id: Date.now() + Math.random(),
            label: row.label,
            variable_name: row.label,
            box: row.box,
            isCustom: true,
          };
          if (row.box === 'mandatory') newMandatoryCustom.push(customField);
          else newOptionalCustom.push(customField);
        }
      });

      setMandatoryFields(prev => [...prev, ...newMandatoryCustom]);
      setOptionalFields(prev  => [...prev, ...newOptionalCustom]);
      setFieldValues(prev     => ({ ...prev, ...savedValues }));
    } catch (err) {
      console.error('Failed to load saved fields:', err);
    }
  }

  /** Save one section (mandatory | optional) to the API. Returns success bool. */
  async function handleSave(section) {
    const sourceFields = section === 'mandatory' ? mandatoryFields : optionalFields;
    const fieldsToSave = sourceFields.reduce((acc, field) => {
      const fd = fieldValues[field.variable_name];
      if (!fd) return acc;
      acc.push({
        label:           field.variable_name,
        value:           fd.value  ?? '',
        checkbox_clicked: fd.enabled ? 1 : 0,
        box:             section,
        field_source:    field.isCustom ? 'custom' : 'default',
      });
      return acc;
    }, []);

    try {
      const res  = await fetch(`${API}/planner/docket/${docketId}/fields`, {
        method: 'POST',
        headers: JSON_AUTH(),
        body: JSON.stringify({ fields: fieldsToSave }),
      });
      const data = await res.json();
      return data.success;
    } catch (err) {
      console.error('Save failed:', err);
      return false;
    }
  }

  const handleFullSave = useCallback(async () => {
    const [mandSaved, optSaved] = await Promise.all([
      handleSave('mandatory'),
      handleSave('optional'),
    ]);

    if (!mandSaved || !optSaved) {
      setSaveToastMessage('Please fill all required fields.');
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 3000);
      return;
    }

    if (assignedUser) {
      await fetch(`${API}/execute/assign`, {
        method: 'POST',
        headers: JSON_AUTH(),
        body: JSON.stringify({
          docket_id: Number(docketId),
          user_id:   assignedUser,
          stage:     selectedStage,
        }),
      });
    }

    setSaveToastMessage('Saved successfully!');
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  }, [mandatoryFields, optionalFields, fieldValues, assignedUser, selectedStage, docketId]);


  // ===========================================================================
  //  FIELD VALUE CALLBACKS  (stable references with useCallback)
  // ===========================================================================

  const handleFieldToggle = useCallback((varName, checked) => {
    setFieldValues(prev => ({
      ...prev,
      [varName]: { ...prev[varName], enabled: checked },
    }));
  }, []);

  const handleFieldValue = useCallback((varNameOrField, val) => {
    // If val === null → it's a delete-custom-field call
    if (val === null) {
      const field = varNameOrField;
      if (field.box === 'mandatory') setMandatoryFields(prev => prev.filter(f => f.id !== field.id));
      else setOptionalFields(prev => prev.filter(f => f.id !== field.id));
      setFieldValues(prev => { const next = { ...prev }; delete next[field.variable_name]; return next; });
      return;
    }
    setFieldValues(prev => ({
      ...prev,
      [varNameOrField]: { ...prev[varNameOrField], value: val },
    }));
  }, []);


  // ===========================================================================
  //  CHAT
  // ===========================================================================

  const handleSendMessage = useCallback(async () => {
    if (!userMessage.trim()) return;

    const fieldNames = [
      ...mandatoryFields.map(f => f.variable_name),
      ...optionalFields.map(f => f.variable_name),
    ];

    const userBubble = { id: Date.now(), text: userMessage, type: 'user', sender: 'user' };
    const loadingId  = Date.now() + 999;
    setConversationBubbles(prev => [
      ...prev,
      userBubble,
      { id: loadingId, text: '...', type: 'ai', sender: 'ai', isLoading: true },
    ]);
    setUserMessage('');

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: JSON_AUTH(),
        body: JSON.stringify({
          docket_id: Number(docketId),
          message:   userBubble.text,
          mode, mediaType, subType,
          business: JSON.stringify(businessProfile  ?? {}),
          product:  JSON.stringify(selectedProductData ?? {}),
          persona:  JSON.stringify(finalPersonaData ?? {}),
          fields:   fieldNames,
        }),
      });

      setConversationBubbles(prev => prev.filter(b => b.id !== loadingId));
      if (handleUnauthorized(res)) return;

      const data = await res.json();

      if (data.success && data.fields) {
        setFieldValues(prev => {
          const updated = { ...prev };
          Object.entries(data.fields).forEach(([key, value]) => {
            if (updated[key]) updated[key] = { ...updated[key], value };
          });
          return updated;
        });
        setConversationBubbles(prev => [
          ...prev,
          { id: Date.now() + 1, text: '✅ Fields updated based on your request.', type: 'ai', sender: 'ai' },
        ]);
      } else {
        setConversationBubbles(prev => [
          ...prev,
          { id: Date.now() + 1, text: '⚠️ AI could not generate field values.', type: 'ai', sender: 'ai' },
        ]);
      }
    } catch {
      setConversationBubbles(prev => [
        ...prev.filter(b => b.id !== loadingId),
        { id: Date.now() + 1, text: '⚠️ AI server not reachable.', type: 'ai', sender: 'ai' },
      ]);
    }
  }, [userMessage, mandatoryFields, optionalFields, mode, mediaType, subType, businessProfile, selectedProductData, finalPersonaData, docketId]);


  // ===========================================================================
  //  GENERATE / SUBMIT
  // ===========================================================================

  const handleGenerate = useCallback(async () => {
    const [mandSaved, optSaved] = await Promise.all([
      handleSave('mandatory'),
      handleSave('optional'),
    ]);
    if (!mandSaved || !optSaved) { setGeneratedPrompt('Error saving fields.'); return; }

    const submittedRequest = `${mode} | ${mediaType} | ${subType}`;
    const finalOutput      = {};

    if (mode || mediaType || subType)
      finalOutput.prompt_information = { mode, media_type: mediaType, media_sub_type: subType };

    if (businessProfile) {
      const filtered = Object.fromEntries(
        Object.entries(businessProfile).filter(([, v]) => v !== null && v !== '')
      );
      if (Object.keys(filtered).length) finalOutput.business_information = filtered;
    }

    if (finalPersonaData) finalOutput.persona_information = finalPersonaData;

    if (selectedProductData) {
      const product = {
        product_name: selectedProductData.product_name,
        description:  selectedProductData.product_description,
        hashtags: selectedProductData.hashtags || []
      };
      if (selectedProductData.features?.length) product.features = selectedProductData.features;
      if (selectedProductData.usps?.length)     product.USP      = selectedProductData.usps;
      if (selectedProductData.values?.length)   product.values   = selectedProductData.values;
      if (selectedProductData.images?.length)   product.images   = selectedProductData.images.map(img => img.img_url);
      finalOutput.product_information = product;
    }

    const dynamicFields = Object.entries(fieldValues)
      .filter(([, fd]) => fd.enabled && fd.value.trim())
      .reduce((acc, [key, fd]) => { acc[key] = fd.value; return acc; }, {});
    if (Object.keys(dynamicFields).length) finalOutput.creative_context = dynamicFields;

    setGeneratedPrompt(JSON.stringify(finalOutput, null, 2));

    try {
      const res  = await fetch(`${API}/planner/docket/${docketId}/media-result`, {
        method:  'POST',
        headers: JSON_AUTH(),
        body:    JSON.stringify({
          visual_text:       JSON.stringify(finalOutput),
          submitted_request: submittedRequest,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSubmitToast(true);
        setTimeout(() => setShowSubmitToast(false), 3000);
        // Refresh history list
        fetch(`${API}/planner/docket/${docketId}/media-history`, { headers: AUTH() })
          .then(r => r.json())
          .then(d => { if (d.success) setHistoryList(d.data); })
          .catch(console.error);
      }
    } catch (err) {
      console.error('Submit failed:', err);
    }
    setIsEditMode(false);
  }, [mode, mediaType, subType, businessProfile, finalPersonaData, selectedProductData, fieldValues, docketId, mandatoryFields, optionalFields]);


  // ===========================================================================
  //  HISTORY MODALS
  // ===========================================================================

  const handleOpenHistory = useCallback(async () => {
    try {
      setVisualHistoryList([]);
      setSelectedHistoryPrompt(null);
      const res  = await fetch(`${API}/planner/docket/${docketId}/media-history`, { headers: AUTH() });
      const data = await res.json();
      if (data.success) { setHistoryList(data.data); setShowHistoryModal(true); }
    } catch (err) { console.error('Failed to fetch history', err); }
  }, [docketId]);

  const handleOpenVisualHistory = useCallback(async () => {
    try {
      setHistoryList([]);
      setSelectedHistoryPrompt(null);
      const res  = await fetch(`${API}/admin/docket/${docketId}`, { headers: AUTH() });
      const data = await res.json();
      if (data.success) { setVisualHistoryList(data.data.visual_history ?? []); setShowHistoryModal(true); }
    } catch (err) { console.error('Failed to fetch visual history', err); }
  }, [docketId]);

  const loadAssignHistory = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/execute/${docketId}/assignment-history`, { headers: AUTH() });
      const data = await res.json();
      if (data.success) { setAssignHistory(data.data); setShowAssignHistoryModal(true); }
    } catch (err) { console.error('Failed to load assignment history', err); }
  }, [docketId]);


  // ===========================================================================
  //  FEEDBACK
  // ===========================================================================

  const loadFeedback = useCallback(async () => {
    if (!adminMediaId) return;
    try {
      const res  = await fetch(`${API}/feedback/${adminMediaId}`, { headers: AUTH() });
      const data = await res.json();
      if (data.success) setFeedbackList(data.data);
    } catch (err) { console.error('Load feedback error:', err); }
  }, [adminMediaId]);

  const loadDocketFeedback = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/feedback/docket/${docketId}`, { headers: AUTH() });
      const data = await res.json();
      if (data.success) setDocketFeedbackList(data.data);
    } catch (err) { console.error('Load docket feedback error:', err); }
  }, [docketId]);

  const submitFeedback = useCallback(async () => {
    if (!feedbackText.trim()) return;
    try {
      const res  = await fetch(`${API}/feedback`, {
        method:  'POST',
        headers: JSON_AUTH(),
        body:    JSON.stringify({ docket_id: Number(docketId), admin_media_id: adminMediaId, feedback: feedbackText }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackText('');
        loadFeedback();
        loadDocketFeedback();
      }
    } catch (err) { console.error('Submit feedback error:', err); }
  }, [feedbackText, docketId, adminMediaId, loadFeedback, loadDocketFeedback]);


  // ===========================================================================
  //  ADD CUSTOM FIELD MODAL
  // ===========================================================================

  const handleModalSave = useCallback(() => {
    if (!newFieldLabel.trim()) return;
    const variableKey = newFieldLabel
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
    const newField = { id: Date.now(), label: newFieldLabel, variable_name: variableKey, box: modalBoxType, isCustom: true };
    if (modalBoxType === 'mandatory') setMandatoryFields(prev => [...prev, newField]);
    else setOptionalFields(prev => [...prev, newField]);
    setFieldValues(prev => ({ ...prev, [variableKey]: { value: newFieldValue ?? '', enabled: true } }));
    setShowModal(false);
    setNewFieldLabel('');
    setNewFieldValue('');
  }, [newFieldLabel, newFieldValue, modalBoxType]);


  // ===========================================================================
  //  RENDER
  // ===========================================================================
  return (
    <div className="docket-container">

      {/* ── HEADER ── */}
      <div className="docket-header-view" style={{ position: 'relative' }}>
        <h2>{docketTitle}</h2>

        <div
          style={{ position: 'absolute', right: '20px', top: '1px', cursor: 'pointer' }}
          onClick={loadAssignHistory}
        >
          <HamburgerIcon />
        </div>

        <div className="docket-meta" />

        <div className="docket-meta">
          <span>{mode}</span>
          <span> | {mediaType}</span>
          <span> | {subType}</span>

          {selectedProductData && (
            <span className="docket-hover-wrapper" onClick={e => e.stopPropagation()}>
              {' '}|{' '}
              <span className="docket-hover-link">{selectedProductData.product_name}</span>
              <div className="docket-hover-popup"><ProductPreview product={selectedProductData} /></div>
            </span>
          )}

          {selectedPersonaData && (
            <span className="docket-hover-wrapper" onClick={e => e.stopPropagation()}>
              {' '}|{' '}
              <span className="docket-hover-link">{selectedPersonaData.persona_name}</span>
              <div className="docket-hover-popup"><PersonaPreview persona={selectedPersonaData} /></div>
            </span>
          )}
        </div>
      </div>

      {/* ── COLUMN BACKDROP ── */}
      {expandedCol !== null && (
        <div className="docket-col-backdrop" onClick={() => setExpandedCol(null)} />
      )}

      {/* ── MAIN GRID ── */}
      <div className={`docket-content${expandedCol !== null ? ' has-expanded' : ''}`}>

        {/* ══════════ COLUMN 1 – CHATBOT ══════════ */}
        <div
          className={`docket-column docket-column-1${expandedCol === 1 ? ' docket-column--expanded' : ''}`}
          onClick={() => setExpandedCol(1)}
        >
          <div className="docket-chatbot-header"><h3>CHATBOT</h3></div>

          <div className="docket-conversation">
            <div className="docket-conversation-background">
              <img src="/chatbot2.gif" alt="Chatbot" className="docket-robot-bg" />
            </div>

            <div className="docket-conversation-bubbles">
              {conversationBubbles.map(bubble => <Bubble key={bubble.id} bubble={bubble} />)}
            </div>

            <div className="docket-message-input">
              <textarea
                placeholder="Type your Message..."
                value={userMessage}
                rows={3}
                onChange={e => setUserMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && userMessage.trim()) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button
                className={`docket-send-btn${!userMessage.trim() ? ' disabled' : ''}`}
                onClick={userMessage.trim() ? handleSendMessage : undefined}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                    stroke={userMessage.trim() ? '#4A90E2' : '#9CA3AF'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ══════════ COLUMN 2 – MANDATORY + OPTIONAL FIELDS ══════════ */}
        <div
          className={`docket-column docket-column-2${expandedCol === 2 ? ' docket-column--expanded' : ''}`}
          onClick={() => setExpandedCol(2)}
        >
          {/* MANDATORY */}
          <section className="docket-mandatory-section">
            <div className="docket-optionals-header">
              <h3 className="docket-column-title">MANDATORY FIELDS</h3>
              <button className="docket-add-more-btn" onClick={() => { setModalBoxType('mandatory'); setShowModal(true); }}>
                Add More +
              </button>
            </div>
            <div className="docket-scroll-wrapper">
              <div className="docket-form-section">
                {mandatoryFields.map(field => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    fieldData={fieldValues[field.variable_name]}
                    onToggle={handleFieldToggle}
                    onValueChange={handleFieldValue}
                  />
                ))}
              </div>
            </div>
          </section>

          <div className="docket-section-divider" />

          {/* OPTIONAL */}
          <section className="docket-optional-section">
            <div className="docket-optionals-header">
              <h3>OPTIONAL FIELDS</h3>
              <button className="docket-add-more-btn" onClick={() => { setModalBoxType('optional'); setShowModal(true); }}>
                Add More +
              </button>
            </div>
            <div className="docket-scroll-wrapper">
              <div className="docket-form-section">
                {optionalFields.map(field => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    fieldData={fieldValues[field.variable_name]}
                    onToggle={handleFieldToggle}
                    onValueChange={handleFieldValue}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ══════════ COLUMN 3 – FEEDBACK HISTORY ══════════ */}
        <div
          className={`docket-column docket-column-3${expandedCol === 3 ? ' docket-column--expanded' : ''}`}
          onClick={() => setExpandedCol(3)}
        >
          <div className="docket-visual-info-history-section">
            <div className="docket-visual-info-history-header">
              <h3>FEEDBACK HISTORY</h3>
              <div className="docket-history-icon" onClick={handleOpenHistory}><ClockIcon /></div>
            </div>

            <div className="docket-visual-info-history-content docket-visual-info-history-content--full">
              {docketFeedbackList.length > 0 ? (
                <div className="docket-feedback-chat">
                  {groupedFeedback.map((group, index) => (
                    <div key={group.admin_media_id}>
                      <div className="docket-version-divider docket-hover-wrapper">
                        <span className="docket-hover-link">
                          ----------- Image Version {index + 1} -----------
                        </span>
                        {imageMap[group.admin_media_id] && (
                          <div className="docket-hover-popup docket-image-preview-popup">
                            <img src={imageMap[group.admin_media_id]} alt="preview" />
                          </div>
                        )}
                      </div>
                      {group.messages.map(f => (
                        <div
                          key={f.feedback_history_id}
                          className={`docket-bubble-wrapper ${f.role === 'user' ? 'user-message' : 'ai-message'}`}
                        >
                          <div className="docket-bubble">
                            <div style={{ fontSize: '10px', opacity: 0.7 }}>
                              {f.role === 'admin' ? 'Admin' : 'You'} • {new Date(f.created_at).toLocaleString()}
                            </div>
                            <div>{f.feedback}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="docket-visual-info-history-empty">No feedback yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════ COLUMN 4 – VISUAL OUTPUT ══════════ */}
        <div
          className={`docket-column docket-column-4${expandedCol === 4 ? ' docket-column--expanded' : ''}`}
          onClick={() => setExpandedCol(4)}
        >
          <div className="docket-visual-output">
            <div className="docket-visual-header">
              <h3>VISUAL OUTPUT</h3>
              <div className="docket-history-icon" onClick={handleOpenVisualHistory}><ClockIcon /></div>
            </div>

            <div className="docket-visual-body">
              <div className="docket-visual-content docket-visual-content--full">
                {visualImage
                  ? <img src={visualImage} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Visual output" />
                  : <div className="docket-visual-placeholder">Waiting for admin upload</div>
                }
              </div>

              <div className="docket-visual-message-box">
                <div className="docket-visual-message-title">Message with Visual</div>
                <div className={`docket-visual-message${visualMessage ? ' has-message' : ''}`}>
                  {visualMessage || 'No message from admin yet.'}
                </div>
              </div>
            </div>

            <div className="docket-visual-footer">
              <button
                className={`docket-download-btn${!visualImage ? ' disabled' : ''}`}
                disabled={!visualImage}
                onClick={() => visualImage && downloadImage(visualImage, docketId)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M12 3v13M7 11l5 5 5-5M3 18h18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Download
              </button>

              <button
                className={`docket-feedback-btn${!visualImage ? ' disabled' : ''}`}
                disabled={!visualImage}
                title={!visualImage ? 'Wait for admin upload' : ''}
                onClick={() => { setShowFeedbackModal(true); loadFeedback(); }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Feedback
              </button>
            </div>
          </div>
        </div>

        {/* ══════════ ACTION BAR ══════════ */}
        <div className="docket-generate-wrapper">
          <div className="docket-generate-container" style={{ display: 'flex', gap: '10px' }}>

            {/* Stage */}
            <select
              className="docket-generate-btn"
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}
            >
              <option value={currentStage} disabled>{currentStage} (current)</option>
              {nextStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
            </select>

            {/* Assign */}
            <select
              className="docket-generate-btn"
              value={assignedUser}
              onChange={e => setAssignedUser(e.target.value)}
            >
              <option value="">Assign To</option>
              {networkUsers.map(u => <option key={u.user_id} value={u.user_id}>{u.email}</option>)}
            </select>

            {/* Save */}
            <button className="docket-generate-btn" onClick={handleFullSave}>SAVE</button>

            {/* Submit */}
            <button
              className={`docket-generate-btn${!canGenerate ? ' disabled' : ''}`}
              onClick={canGenerate ? handleGenerate : undefined}
              disabled={!canGenerate}
            >
              SUBMIT
              {!canGenerate && (
                <div className="docket-generate-tooltip">
                  <div className="docket-generate-tooltip-header">Please fill all mandatory fields:</div>
                  <ul className="docket-generate-tooltip-list">
                    {!mode           && <li>Prompt Type</li>}
                    {mode && !mediaType && <li>{mode === 'message' ? 'Message Type' : 'Visual Type'}</li>}
                    {mediaType && !subType && <li>{mode === 'message' ? 'Message Sub Type' : 'Visual Sub Type'}</li>}
                  </ul>
                </div>
              )}
            </button>

          </div>
        </div>

      </div>{/* END docket-content */}


      {/* ══════════ ADD FIELD MODAL ══════════ */}
      {showModal && (
        <div className="docket-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="docket-modal" onClick={e => e.stopPropagation()}>
            <div className="docket-modal-header">
              <h3>Add Custom Field</h3>
              <button className="docket-modal-close" onClick={() => setShowModal(false)}><CloseIcon /></button>
            </div>
            <div className="docket-modal-body">
              <div className="docket-modal-form-group">
                <label>Field Name</label>
                <input
                  type="text" autoFocus
                  value={newFieldLabel}
                  onChange={e => setNewFieldLabel(e.target.value)}
                  placeholder="e.g., Special Instructions"
                />
              </div>
              <div className="docket-modal-form-group">
                <label>Field Value (Optional)</label>
                <input
                  type="text"
                  value={newFieldValue}
                  onChange={e => setNewFieldValue(e.target.value)}
                  placeholder="e.g., Handle with care"
                />
              </div>
            </div>
            <div className="docket-modal-footer">
              <button className="docket-modal-btn docket-modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="docket-modal-btn docket-modal-save" onClick={handleModalSave} disabled={!newFieldLabel.trim()}>
                Save Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ HISTORY MODAL ══════════ */}
      {showHistoryModal && (
        <div
          className="docket-modal-overlay"
          onClick={() => { setShowHistoryModal(false); setSelectedHistoryPrompt(null); }}
        >
          <div className="docket-modal" onClick={e => e.stopPropagation()}>
            <div className="docket-modal-header">
              {!selectedHistoryPrompt ? (
                <h3>Visual Information History</h3>
              ) : (
                <div className="docket-history-header-with-back">
                  <button className="docket-history-header-back" onClick={() => setSelectedHistoryPrompt(null)}>←</button>
                  <div className="docket-history-title-block">
                    <h3>Version {selectedHistoryPrompt.version}</h3>
                    <div className="docket-history-date">{new Date(selectedHistoryPrompt.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              )}
              <button
                className="docket-modal-close"
                onClick={() => { setShowHistoryModal(false); setSelectedHistoryPrompt(null); }}
              >✕</button>
            </div>

            <div className="docket-modal-body">
              {visualHistoryList.length > 0 ? (
                visualHistoryList.map((item, index) => (
                  <div key={item.admin_media_id} className="docket-history-item">
                    <strong>Version {visualHistoryList.length - index}</strong>
                    <div className="docket-history-time">{new Date(item.created_at).toLocaleString()}</div>
                    <img src={item.uploaded_url} alt="visual" style={{ width: '100%', marginTop: '10px', borderRadius: '6px' }} />
                    {item.message && (
                      <div style={{ marginTop: '6px', fontSize: '12px', opacity: 0.7 }}>{item.message}</div>
                    )}
                  </div>
                ))
              ) : !selectedHistoryPrompt ? (
                historyList.map((item, index) => (
                  <div
                    key={item.docket_result_id}
                    className="docket-history-item"
                    onClick={() => setSelectedHistoryPrompt({
                      text:      item.visual_text,
                      version:   historyList.length - index,
                      createdAt: item.created_at,
                    })}
                  >
                    <strong>Version {historyList.length - index}</strong>
                    <div className="docket-history-time">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                ))
              ) : (
                <div className="docket-history-preview-wrapper">
                  <div className="docket-history-prompt-view">
                    <pre>{(() => {
                      try { return JSON.stringify(JSON.parse(selectedHistoryPrompt.text), null, 2); }
                      catch { return selectedHistoryPrompt.text; }
                    })()}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ FEEDBACK MODAL ══════════ */}
      {showFeedbackModal && (
        <div className="docket-modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="docket-modal docket-feedback-modal" onClick={e => e.stopPropagation()}>
            <div className="docket-modal-header">
              <h3>Feedback</h3>
              <button className="docket-modal-close" onClick={() => setShowFeedbackModal(false)}><CloseIcon /></button>
            </div>

            <div className="docket-feedback-modal-body">
              {feedbackList.length === 0 ? (
                <div className="docket-feedback-empty">No messages yet. Start the conversation!</div>
              ) : (
                feedbackList.map(f => (
                  <div
                    key={f.feedback_history_id}
                    className={`docket-bubble-wrapper ${f.role === 'admin' ? 'ai-message' : 'user-message'}`}
                  >
                    <div className="docket-bubble">
                      <div className="docket-bubble-meta">
                        {f.role === 'admin' ? 'Admin' : 'You'} • {new Date(f.created_at).toLocaleString()}
                      </div>
                      <div>{f.feedback}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={feedbackBottomRef} />
            </div>

            <div className="docket-feedback-modal-footer">
              <textarea
                className="docket-feedback-input"
                placeholder="Write feedback..."
                value={feedbackText}
                rows={3}
                onChange={e => setFeedbackText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && feedbackText.trim()) {
                    e.preventDefault();
                    submitFeedback();
                  }
                }}
              />
              <button
                className={`docket-feedback-send-btn${!feedbackText.trim() ? ' disabled' : ''}`}
                onClick={feedbackText.trim() ? submitFeedback : undefined}
                disabled={!feedbackText.trim()}
              >
                <SendIcon active={Boolean(feedbackText.trim())} />
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ASSIGNMENT HISTORY MODAL ══════════ */}
      {showAssignHistoryModal && (
        <div className="docket-modal-overlay" onClick={() => setShowAssignHistoryModal(false)}>
          <div className="docket-modal" onClick={e => e.stopPropagation()}>
            <div className="docket-modal-header">
              <h3>Assignment Flow</h3>
              <button className="docket-modal-close" onClick={() => setShowAssignHistoryModal(false)}>✕</button>
            </div>
            <div className="docket-modal-body">
              {assignHistory.length === 0 ? (
                <div>No assignment history</div>
              ) : (
                <div className="assignment-flow">
                  {assignHistory.map((item, index) => (
                    <div key={item.assignment_id} className="assignment-row">
                      <div className="assignment-users">
                        <strong>{item.assigned_by_email}</strong>
                        {' → '}
                        <strong>{item.assigned_to_email}</strong>
                      </div>
                      <div className="assignment-meta">
                        <span className="assignment-stage">{item.stage}</span>
                        <span className="assignment-time">{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      {index < assignHistory.length - 1 && <div className="assignment-arrow">↓</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ══════════ TOASTS ══════════ */}
      {showCopyToast && (
        <div className="docket-copy-toast">
          <div className="docket-copy-toast-icon"><CheckIcon /></div>
          <span>Prompt copied to clipboard!</span>
        </div>
      )}

      {showSaveToast && (
        <div className={`docket-save-toast ${saveToastMessage.includes('Please fill') ? 'error' : 'success'}`}>
          <div className="docket-save-toast-icon">
            {saveToastMessage.includes('Please fill') ? <WarnIcon /> : <CheckIcon />}
          </div>
          <span>{saveToastMessage}</span>
        </div>
      )}

      {showSubmitToast && (
        <div className="docket-submit-toast">
          <div className="docket-submit-toast-icon"><CheckIcon /></div>
          <span>Submitted successfully!</span>
        </div>
      )}

    </div>
  );
};

export default DocketMedia;