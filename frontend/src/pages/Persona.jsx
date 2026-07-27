import { useState, useEffect, useRef, useCallback } from "react";
import "../styles/persona.css";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_BACKEND_URL;

const MAX_HASHTAGS = 5;

const SECTION_LABEL_PLACEHOLDER = {
  demographic:   "Enter the Demographic Label",
  geographic:    "Enter the Geographic Label",
  psychographic: "Enter the Psychographic Label",
  behavioural:   "Enter the Behavioural Label",
};

const SECTIONS = [
  { key: "demographic",   title: "Demographic",   subtitle: "Who they are",   fields: ["Age","Gender","Income","Family Type","Education","Occupation"] },
  { key: "geographic",    title: "Geographic",    subtitle: "Where they are", fields: ["Country","State","City","Climate","Region","Buying Motivation"] },
  { key: "psychographic", title: "Psychographic", subtitle: "How they think", fields: ["Interests","Lifestyle","Personality"] },
  { key: "behavioural",   title: "Behavioural",   subtitle: "How they act",   fields: ["Buying Behaviour","Usage Rate","Brand Loyalty","Decision Triggers"] },
];

const uid = () => `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function makeEntry()                      { return { id: uid(), value: "", checked: false }; }
function makeField(label, isCustom=false) { return { fieldId: uid(), label, isCustom, entries: [makeEntry()] }; }
function buildInitialState() {
  const s = {};
  SECTIONS.forEach(sec => { s[sec.key] = sec.fields.map(l => makeField(l, false)); });
  return s;
}

/* ── Auto-grow textarea constants ── */
const LINE_HEIGHT = 20;
const V_PADDING   = 16;
const MAX_LINES   = 2;
const MAX_HEIGHT  = LINE_HEIGHT * MAX_LINES + V_PADDING;  // 56px — 2 lines
const MIN_HEIGHT  = LINE_HEIGHT + V_PADDING;              // 36px — 1 line

/* ═══════════════════════════════
   AUTO-GROW TEXTAREA
═══════════════════════════════ */
function AutoTextarea({ value, placeholder, onChange, onFocus, disabled }) {
  const taRef = useRef(null);
  const resize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    const scrollH = el.scrollHeight;
    if (scrollH <= MAX_HEIGHT) {
      el.style.height = `${Math.max(scrollH, MIN_HEIGHT)}px`;
      el.style.overflowY = "hidden";
    } else {
      el.style.height = `${MAX_HEIGHT}px`;
      el.style.overflowY = "scroll";
    }
  }, []);
  useEffect(() => { resize(); }, [value, resize]);
  return (
    <textarea
      ref={taRef}
      className="pn-value-autogrow"
      value={value}
      placeholder={placeholder || "Enter info…"}
      onChange={e => { onChange(e); resize(); }}
      onFocus={onFocus}
      disabled={disabled}
      rows={1}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
    />
  );
}

/* ═══════════════════════════════
   ICONS
═══════════════════════════════ */
function PlusIcon({ size = 14 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
/* ═══════════════════════════════
   LABEL TOOLTIP
═══════════════════════════════ */
function LabelTooltip({ text, children }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  return (
    <span
      ref={ref}
      className="pn-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && text && (
        <span className="pn-label-tooltip">{text}</span>
      )}
    </span>
  );
}

/* ═══════════════════════════════
   HASHTAG INPUT
═══════════════════════════════ */
function HashtagInput({ hashtags, onChange }) {
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef(null);
  const tagsRef  = useRef(null);
  const remaining = MAX_HASHTAGS - hashtags.length;
  const atLimit = hashtags.length >= MAX_HASHTAGS;

  // Scroll the tags row to the end whenever a tag is added
  useEffect(() => {
    if (tagsRef.current) {
      tagsRef.current.scrollLeft = tagsRef.current.scrollWidth;
    }
  }, [hashtags]);

  const addTag = (raw) => {
    const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32);
    if (!cleaned) return;
    const tag = `#${cleaned}`;
    if (hashtags.includes(tag) || hashtags.length >= MAX_HASHTAGS) return;
    onChange([...hashtags, tag]);
  };

  const removeTag = (tag) => {
    onChange(hashtags.filter(t => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === ",") {
      e.preventDefault();
      addTag(inputVal.trim().replace(/^#/, ""));
      setInputVal("");
    } else if (e.key === "Backspace" && inputVal === "" && hashtags.length > 0) {
      removeTag(hashtags[hashtags.length - 1]);
    }
  };

  return (
    <div className="pn-hashtag-section">
      <span className="pn-hashtag-label">
            Add key hashtags (optional)
        </span>
      <div
        className={`pn-hashtag-field${atLimit ? " pn-hashtag-field--limit" : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        <span className="pn-hashtag-hash-icon">#</span>
        <div className="pn-hashtag-tags" ref={tagsRef}>
          {hashtags.map(tag => (
            <span key={tag} className="pn-hashtag-pill">
              <span className="pn-hashtag-pill-text">{tag}</span>
              <span
                className="pn-hashtag-pill-remove"
                onClick={e => { e.stopPropagation(); removeTag(tag); }}
              >×</span>
            </span>
          ))}
          {!atLimit && (
            <input
              ref={inputRef}
              className="pn-hashtag-input"
              value={inputVal}
              placeholder={hashtags.length === 0 ? "Add hashtags…" : ""}
              onChange={e => setInputVal(e.target.value.replace(/\s/g, ""))}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                const v = inputVal.trim().replace(/^#/, "");
                if (v) { addTag(v); setInputVal(""); }
              }}
              maxLength={33}
            />
          )}
        </div>
        <div className={`pn-hashtag-counter ${remaining === 0 ? "pn-hashtag-counter--full" : remaining === 1 ? "pn-hashtag-counter--warn" : ""}`}>
          <span className="pn-hashtag-count-num">{hashtags.length}</span>
          <span className="pn-hashtag-count-sep">/</span>
          <span className="pn-hashtag-count-max">{MAX_HASHTAGS}</span>
        </div>
      </div>
      <p className="pn-hashtag-hint">
        {atLimit
          ? "✓ Maximum hashtags reached"
          : `${remaining} remaining — press Space, Enter or , to add`}
      </p>
    </div>
  );
}

/* ═══════════════════════════════
   ENTRY ROW
═══════════════════════════════ */
function EntryRow({ sectionKey, field, entry, entryIndex,
  onToggle, onValueChange, onExpand, isExpanded }) {
  const { fieldId, label } = field;
  const hasValue = entry.value.trim().length > 0;

  return (
    <div className="pn-entry-group">
      {entryIndex > 0 && <span className="pn-add-badge">ADD</span>}
      <div className="pn-field-row">
        <label
          className={`pn-field-label${hasValue ? " pn-field-label--active" : ""}`}
          onClick={e => { if (!isExpanded) { e.stopPropagation(); onExpand(); } else e.stopPropagation(); }}
        >
          {entryIndex === 0 ? (
            <>
              <input
                type="checkbox"
                className={`pn-checkbox${hasValue ? " pn-checkbox--has-value" : ""}`}
                checked={entry.checked}
                onChange={() => onToggle(sectionKey, fieldId, entry.id)}
              />
              <LabelTooltip text={label}>
                <span className="pn-label-text">{label}</span>
              </LabelTooltip>
            </>
          ) : (
            <span className="pn-label-indent" />
          )}
        </label>

        <AutoTextarea
          value={entry.value}
          placeholder="Enter info…"
          onChange={e => {
            const val = e.target.value;
            onValueChange(sectionKey, fieldId, entry.id, val);
            if (val.trim().length > 0 && !entry.checked)
              onToggle(sectionKey, fieldId, entry.id);
            else if (val.trim().length === 0 && entry.checked)
              onToggle(sectionKey, fieldId, entry.id);
          }}
          onFocus={() => { if (!isExpanded) onExpand(); }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   CUSTOM FIELD BLOCK
═══════════════════════════════ */
function CustomFieldBlock({ sectionKey, field, onLabelChange, onToggle,
  onValueChange, isExpanded, onExpand, onRequestDelete }) {
  const { fieldId, label, entries } = field;
  const entry    = entries[0];
  const hasValue = entry.value.trim().length > 0;

  return (
    <div className="pn-field-row">
      <label
        className={`pn-field-label${hasValue ? " pn-field-label--active" : ""}`}
        onClick={e => e.stopPropagation()}
      >
        <input
          type="checkbox"
          className={`pn-checkbox${hasValue ? " pn-checkbox--has-value" : ""}`}
          checked={entry.checked}
          onChange={() => onToggle(sectionKey, fieldId, entry.id)}
        />
        <div className="pn-custom-label-wrap">
          <input
            type="text"
            className="pn-custom-label-input"
            value={label}
            placeholder={SECTION_LABEL_PLACEHOLDER[sectionKey] || "Enter Label…"}
            onChange={e => onLabelChange(sectionKey, fieldId, e.target.value)}
            onFocus={() => { if (!isExpanded) onExpand(); }}
          />
          <span
            className="pn-field-remove-x"
            onClick={e => { e.stopPropagation(); onRequestDelete(sectionKey, fieldId, label); }}
            title="Remove field"
          >×</span>
        </div>
      </label>

      <AutoTextarea
        value={entry.value}
        placeholder="Enter info…"
        onChange={e => {
          const val = e.target.value;
          onValueChange(sectionKey, fieldId, entry.id, val);
          if (val.trim().length > 0 && !entry.checked)
            onToggle(sectionKey, fieldId, entry.id);
          else if (val.trim().length === 0 && entry.checked)
            onToggle(sectionKey, fieldId, entry.id);
        }}
        onFocus={() => { if (!isExpanded) onExpand(); }}
      />
    </div>
  );
}

/* ═══════════════════════════════
   SEGMENT CARD
═══════════════════════════════ */
function SegmentCard({
  section, sectionFields, isExpanded, onCardClick,
  onAddCustomField, onLabelChange,
  onToggle, onValueChange, onAddEntry, onRemoveEntry,
  onRequestDelete,
}) {
  return (
    <div
      className={`pn-card ${isExpanded ? "pn-card--expanded" : ""}`}
      onClick={!isExpanded ? onCardClick : undefined}
    >
      <div className="pn-card-header">
        <div className="pn-card-header-text">
          <h3 title={section.title}>{section.title}</h3>
          <span className="pn-card-subtitle">{section.subtitle}</span>
        </div>
        {/* Always rendered — visible in both hovered and non-hovered / expanded and collapsed states */}
        <div className="pn-card-actions">
          <button className="icon-action-btn"
            onClick={e => { e.stopPropagation(); if (!isExpanded) onCardClick(); onAddCustomField(section.key); }}
            title="Add custom field"><PlusIcon /></button>
        </div>
      </div>

      <div className="pn-card-body">
        {[...sectionFields]
          .sort((a, b) => {
            const aFilled = a.entries.some(e => e.value.trim().length > 0) ? 0 : 1;
            const bFilled = b.entries.some(e => e.value.trim().length > 0) ? 0 : 1;
            return aFilled - bFilled;
          })
          .map(field =>
            field.isCustom ? (
              <CustomFieldBlock
                key={field.fieldId}
                sectionKey={section.key}
                field={field}
                onLabelChange={onLabelChange}
                onRequestDelete={onRequestDelete}
                onToggle={onToggle}
                onValueChange={onValueChange}
                isExpanded={isExpanded}
                onExpand={onCardClick}
              />
            ) : (
              <div key={field.fieldId} className="pn-field-block">
                {field.entries.map((entry, idx) => (
                  <EntryRow
                    key={entry.id}
                    sectionKey={section.key}
                    field={field}
                    entry={entry}
                    entryIndex={idx}
                    isLastEntry={idx === field.entries.length - 1}
                    isOnlyEntry={field.entries.length === 1}
                    onToggle={onToggle}
                    onValueChange={onValueChange}
                    onAddEntry={onAddEntry}
                    onRemoveEntry={onRemoveEntry}
                    isExpanded={isExpanded}
                    onExpand={onCardClick}
                  />
                ))}
              </div>
            )
          )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   CONFIRM MODAL
═══════════════════════════════ */
function ConfirmModal({ config, onConfirm, onCancel }) {
  if (!config.show) return null;
  return (
    <div className="ai-popup-overlay">
      <div className={`ai-popup ai-popup--confirm ${config.variant || ""}`}>
        {config.icon && <div className="ai-popup-icon">{config.icon}</div>}
        <h3>{config.title}</h3>
        <p>{config.message}</p>
        <div className="ai-popup-actions">
          <button className="ai-btn ai-popup-cancel" onClick={onCancel}>
            {config.cancelLabel || "Cancel"}
          </button>
          <button className={`ai-btn ai-popup-confirm-btn ${config.confirmClass || ""}`} onClick={onConfirm}>
            {config.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   MAIN PAGE
═══════════════════════════════ */
export default function Persona() {
  const navigate = useNavigate();
  const boardRef = useRef(null);

  const [personaName,       setPersonaName]       = useState("");
  const [hashtags,          setHashtags]          = useState([]);
  const [saving,            setSaving]            = useState(false);
  const [personaList,       setPersonaList]       = useState([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [expandedCard,      setExpandedCard]      = useState(null);
  const [segmentsData,      setSegmentsData]      = useState(buildInitialState);
  const [infoPopup,         setInfoPopup]         = useState({ show: false, type: "success", title: "", message: "" });
  const [confirmModal,      setConfirmModal]      = useState({ show: false });

  useEffect(() => {
    const onDown = e => {
      if (boardRef.current && !boardRef.current.contains(e.target)) setExpandedCard(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => { fetchPersonas(); }, []);

  const fetchPersonas = async () => {
    try {
      const res  = await fetch(`${API}/personas`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const data = await res.json();
      if (data.success) setPersonaList(data.data);
    } catch (err) { console.error(err); }
  };

  const loadPersona = personaId => {
    if (personaId === "new") {
      setSelectedPersonaId("");
      setPersonaName("");
      setHashtags([]);
      setSegmentsData(buildInitialState());
      return;
    }
    if (!personaId) return;
    const persona = personaList.find(p => p.persona_id == personaId);
    if (!persona) return;
    setSelectedPersonaId(personaId);
    setPersonaName(persona.persona_name);
    setHashtags(persona.hashtags || []);
    const newState = buildInitialState();
    persona.segments.forEach(seg => {
      const secFields = newState[seg.segment_type];
      if (!secFields) return;
      const field = secFields.find(f => f.label === seg.label);
      if (field) {
        const e = field.entries[0];
        e.checked = seg.is_active;
        e.value   = seg.value || "";
      } else {
        secFields.push({ fieldId: uid(), label: seg.label, isCustom: true,
          entries: [{ id: uid(), value: seg.value || "", checked: seg.is_active }] });
      }
    });
    setSegmentsData(newState);
  };

  const mut = fn => setSegmentsData(prev => {
    const next = {};
    Object.keys(prev).forEach(k => {
      next[k] = prev[k].map(f => ({ ...f, entries: f.entries.map(e => ({ ...e })) }));
    });
    fn(next);
    return next;
  });

  const onToggle         = (secKey, fieldId, entryId)        => mut(s => { const e = s[secKey].find(f=>f.fieldId===fieldId).entries.find(e=>e.id===entryId); e.checked = !e.checked; });
  const onValueChange    = (secKey, fieldId, entryId, value) => mut(s => { const e = s[secKey].find(f=>f.fieldId===fieldId).entries.find(e=>e.id===entryId); e.value = value; });
  const onLabelChange    = (secKey, fieldId, newLabel)       => mut(s => { const f = s[secKey].find(f=>f.fieldId===fieldId); if(f) f.label = newLabel; });
  const onAddEntry       = (secKey, fieldId)                 => mut(s => { s[secKey].find(f=>f.fieldId===fieldId).entries.push(makeEntry()); });
  const onRemoveEntry    = (secKey, fieldId, entryId)        => mut(s => { const f = s[secKey].find(f=>f.fieldId===fieldId); f.entries = f.entries.filter(e=>e.id!==entryId); });
  const onAddCustomField = secKey                            => mut(s => { s[secKey].push(makeField("", true)); });
  const onRemoveField    = (secKey, fieldId)                 => mut(s => { s[secKey] = s[secKey].filter(f=>f.fieldId!==fieldId); });

  /* ── Delete confirmation ── */
  const onRequestDelete = (secKey, fieldId, label) => {
    setConfirmModal({
      show: true,
      variant: "danger",
      icon: "🗑️",
      title: "Delete Field?",
      message: `"${label || "This field"}" will be permanently removed. This cannot be undone.`,
      confirmLabel: "Yes, Delete",
      cancelLabel: "Keep It",
      confirmClass: "ai-popup-confirm-btn--danger",
      onConfirm: () => { onRemoveField(secKey, fieldId); setConfirmModal({ show: false }); },
    });
  };

  /* ── Duplicate persona ── */
  const handleDuplicate = () => {
    const copyName = personaName.trim() ? `${personaName} (Copy)` : "Unnamed Persona (Copy)";
    setPersonaName(copyName);
    setSelectedPersonaId("");
    const cloned = {};
    Object.keys(segmentsData).forEach(k => {
      cloned[k] = segmentsData[k].map(f => ({
        ...f, fieldId: uid(),
        entries: f.entries.map(e => ({ ...e, id: uid() })),
      }));
    });
    setSegmentsData(cloned);
    setInfoPopup({ show: true, type: "success", title: "Persona Duplicated", message: `A copy has been created as "${copyName}". Save it to keep it.` });
  };

  /* ── Clear all fields ── */
  const handleClearAll = () => {
    setConfirmModal({
      show: true,
      variant: "warning",
      icon: "🧹",
      title: "Clear All Fields?",
      message: "All entered data on this persona will be cleared. This cannot be undone.",
      confirmLabel: "Clear All",
      cancelLabel: "Cancel",
      confirmClass: "ai-popup-confirm-btn--warning",
      onConfirm: () => {
        setPersonaName("");
        setHashtags([]);
        setSegmentsData(buildInitialState());
        setConfirmModal({ show: false });
      },
    });
  };

  function buildPayload() {
    const segments = [];
    Object.entries(segmentsData).forEach(([secType, fields]) => {
      fields.forEach(field => {
        field.entries.forEach(entry => {
          if (!entry.checked || !field.label?.trim()) return;
          const val = (entry.value || "").trim();
          if (!val) return;
          segments.push({ segment_type: secType, label: field.label.trim(), value: val, is_active: true });
        });
      });
    });
    return segments;
  }

  async function handleSave(navigateAfter = true) {
    if (!personaName.trim()) { setInfoPopup({ show: true, type: "warning", title: "Missing Persona Name", message: "Please enter a persona name before saving." }); return; }
    const segments = buildPayload();
    if (!segments.length) { setInfoPopup({ show: true, type: "warning", title: "No Segments Selected", message: "Please check at least one field with a value." }); return; }
    setSaving(true);
    try {
      const res    = await fetch(`${API}/personas`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({
      persona_id: selectedPersonaId || null,
      persona_name: personaName,
      hashtags,
      segments
    }) });

      const result = await res.json();
      if (!res.ok) { setInfoPopup({ show: true, type: "warning", title: "Save Failed", message: result.detail || "Failed to save persona" }); return; }
      fetchPersonas();
      if (navigateAfter) {
        navigate("/planner", { replace: true });
      } else {
        setInfoPopup({ show: true, type: "success", title: "Persona Saved", message: "Your persona has been saved successfully." });
      }
    } catch { setInfoPopup({ show: true, type: "warning", title: "Server Error", message: "Something went wrong. Please try again." }); }
    finally { setSaving(false); }
  }

  return (
    <div className="persona-page">

      {/* ── HEADER ── */}
      <div className="product-header">
        <div className="product-header-left">
          <select className="product-dropdown" value={selectedPersonaId} onChange={e => loadPersona(e.target.value)}>
            <option value="">Persona</option>
            <option value="new">+ Add New Persona</option>
            {personaList.map(p => <option key={p.persona_id} value={p.persona_id}>{p.persona_name}</option>)}
          </select>
          <div className="product-title-wrapper">
            <input type="text" className="product-title-input" placeholder="Enter Persona Name"
              value={personaName} onChange={e => setPersonaName(e.target.value)} />
          </div>
        </div>

        {/* Top-right action buttons */}
        <div className="product-header-right">
          <button className="product-action-btn product-duplicate-btn" onClick={handleDuplicate} title="Duplicate this persona">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Duplicate
          </button>
        </div>
      </div>

      {/* ── BOARD ── */}
      <div className="product-board" ref={boardRef}>
        {SECTIONS.map(section => (
          <SegmentCard key={section.key} section={section}
            sectionFields={segmentsData[section.key]}
            isExpanded={expandedCard === section.key}
            onCardClick={() => setExpandedCard(prev => prev === section.key ? null : section.key)}
            onAddCustomField={onAddCustomField}
            onLabelChange={onLabelChange}
            onRequestDelete={onRequestDelete}
            onToggle={onToggle} onValueChange={onValueChange}
            onAddEntry={onAddEntry} onRemoveEntry={onRemoveEntry} />
        ))}
      </div>

      {/* ── SAVE BAR ── */}
      <div className="save-wrapper">
        <HashtagInput hashtags={hashtags} onChange={setHashtags} />
        <div className="save-wrapper-btns">
          <button className="ai-btn ai-btn-clearall" onClick={handleClearAll} disabled={saving}>
            Clear all
          </button>
          <button className="ai-btn ai-btn-sticky" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* ── INFO POPUP ── */}
      {infoPopup.show && (
        <div className="ai-popup-overlay">
          <div className={`ai-popup ${infoPopup.type}`}>
            <h3>{infoPopup.title}</h3>
            <p>{infoPopup.message}</p>
            <button className="ai-btn ai-popup-close"
              onClick={() => setInfoPopup({ ...infoPopup, show: false })}>OK</button>
          </div>
        </div>
      )}

      {/* ── CONFIRM MODAL ── */}
      <ConfirmModal
        config={confirmModal}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ show: false })}
      />

    </div>
  );
}