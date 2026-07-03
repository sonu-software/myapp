import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/businessSetup.css";

const API   = import.meta.env.VITE_BACKEND_URL;
const TOKEN = () => localStorage.getItem("token");
const AUTH  = () => ({ Authorization: `Bearer ${TOKEN()}` });
const JSON_AUTH = () => ({ "Content-Type": "application/json", ...AUTH() });

// ─── helpers ─────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  brandName: "", businessType: "", industry: "", yearEstablished: "",
  logoPlacement: "", ownerName: "", email: "", phone: "",
  street: "", city: "", state: "", country: "", zip: "",
  registrationNumber: "", taxId: "",
  currency: "", timeZone: "", fiscalYear: "",
  website: "", brandColor: "", tagline: "",
  language: "", notifications: "",
  description: "", descriptionFileUrl: "",
  agreeTerms: false, agreePrivacy: false,
};

function getInitials(email = "") {
  const name = email.split("@")[0];
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(email = "") {
  const colors = [
    "#4A90E2", "#7B68EE", "#20B2AA", "#FF6B6B",
    "#FFA500", "#32CD32", "#FF69B4", "#9370DB",
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Field Row component ──────────────────────────────────────────────────────
function FieldRow({ label, name, value, onChange, placeholder, disabled, type = "text" }) {
  return (
    <div className="bs-row">
      <label className="bs-label">{label}</label>
      <div className={disabled ? "bs-tooltip-wrap" : ""} data-tooltip="Click Edit to modify">
        <input
          name={name} type={type} value={value}
          onChange={onChange} className="bs-input"
          disabled={disabled} placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function SelectRow({ label, name, value, onChange, disabled, options, placeholder }) {
  return (
    <div className="bs-row">
      <label className="bs-label">{label}</label>
      <div className={disabled ? "bs-tooltip-wrap" : ""} data-tooltip="Click Edit to modify">
        <select name={name} value={value} onChange={onChange}
          className="bs-input" disabled={disabled}>
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Hashtag Input component ──────────────────────────────────────────────────
function HashtagInput({ tags, onChange, disabled }) {
  const [inputVal,    setInputVal]    = useState("");
  const [limitToast,  setLimitToast]  = useState(false);
  const inputRef  = useRef(null);
  const toastTimer = useRef(null);

  const showLimitToast = () => {
    setLimitToast(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setLimitToast(false), 2500);
  };

  const addTag = (raw) => {
    const cleaned = raw.trim().replace(/^#+/, "").toLowerCase();
    if (!cleaned) return;
    if (tags.includes(cleaned)) { setInputVal(""); return; }
    if (tags.length >= 5) { showLimitToast(); setInputVal(""); return; }
    onChange([...tags, cleaned]);
    setInputVal("");
  };

  const removeTag = (tag) => {
    onChange(tags.filter(t => t !== tag));
    setLimitToast(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === "Backspace" && !inputVal && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleBlur = () => {
    if (inputVal.trim()) addTag(inputVal);
  };

  const remaining = 5 - tags.length;

  return (
    <div className="bs-hashtag-outer">
      <div
        className={`bs-hashtag-wrap ${disabled ? "bs-hashtag-wrap--disabled" : ""} ${limitToast ? "bs-hashtag-wrap--limit" : ""}`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        <div className="bs-hashtag-scroll">
          {tags.map(tag => (
            <span key={tag} className="bs-hashtag-chip">
              <span className="bs-hashtag-hash">#</span>{tag}
              {!disabled && (
                <button
                  type="button"
                  className="bs-hashtag-remove"
                  onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                >✕</button>
              )}
            </span>
          ))}
          {!disabled && tags.length < 5 && (
            <input
              ref={inputRef}
              type="text"
              className="bs-hashtag-input"
              value={inputVal}
              placeholder={tags.length === 0 ? "e.g. startup, tech, innovation…" : "Add more…"}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              disabled={disabled}
            />
          )}
          {disabled && tags.length === 0 && (
            <span className="bs-hashtag-empty">No hashtags added</span>
          )}
        </div>
      </div>

      {/* ── Below-box row: remaining count (left) + limit toast (right) ── */}
      {!disabled && (
        <div className="bs-hashtag-footer">
          <span className={`bs-hashtag-remaining ${remaining === 0 ? "bs-hashtag-remaining--zero" : ""}`}>
            {remaining === 0 ? "Max reached" : `${remaining} remaining`}
          </span>
          {limitToast && (
            <span className="bs-hashtag-toast">
              ⚠ Max 5 hashtags allowed
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
//  MAIN COMPONENT
// =============================================================================
export default function BusinessSetup() {
  const navigate = useNavigate();

  const [isEditing,    setIsEditing]    = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [hasBusiness,  setHasBusiness]  = useState(false);
  const [categories,   setCategories]   = useState([]);
  const [subCategories,setSubCategories]= useState([]);
  const [logoPreview,  setLogoPreview]  = useState(null);
  const [formData,     setFormData]     = useState(EMPTY_FORM);
  const [hashtags,     setHashtags]     = useState([]);
  const [popup,        setPopup]        = useState({ show: false, type: "success", title: "", message: "" });

  // ── Team members state ──────────────────────────────────────────────────────
  const [teamMembers,    setTeamMembers]    = useState([]);
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [addingMember,   setAddingMember]   = useState(false);
  const [memberStatus,   setMemberStatus]   = useState(null);
  const [removingId,     setRemovingId]     = useState(null);
  const [linkedinConnected, setLinkedinConnected] = useState(false);

  // ── Load business ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadBusiness() {
      try {
        const res  = await fetch(`${API}/me/business`, { headers: AUTH() });
        const data = await res.json();
        if (data.exists) {
          const b = data.data;
          setFormData({
            brandName: b.business_name || "", businessType: b.business_type || "",
            industry: b.industry || "", yearEstablished: b.year_established || "",
            logoPlacement: b.logo_placement || "", ownerName: b.owner_name || "",
            email: b.email || "", phone: b.phone || "",
            street: b.street_address || "", city: b.city || "", state: b.state || "",
            country: b.country || "", zip: b.postal_code || "",
            registrationNumber: b.registration_number || "", taxId: b.tax_id || "",
            currency: b.default_currency || "", timeZone: b.timezone || "",
            fiscalYear: b.fiscal_year_start || "", website: b.website_url || "",
            brandColor: b.brand_color || "", tagline: b.tagline || "",
            language: b.language_preference || "",
            notifications: b.notification_preference || "",
            description: b.description || "", descriptionFileUrl: b.description_file_url || "",
            agreeTerms: Boolean(b.terms_accepted), agreePrivacy: Boolean(b.privacy_accepted),
          });
          // Load hashtags — stored as comma-separated string or array
          if (b.hashtags) {
            const parsed = Array.isArray(b.hashtags)
              ? b.hashtags
              : b.hashtags.split(",").map(t => t.trim()).filter(Boolean);
            setHashtags(parsed);
          }
          if (b.logo_url) setLogoPreview(b.logo_url);
          setHasBusiness(true);
          setIsEditing(false);
        }
      } catch (err) { console.error("Error loading business:", err); }
      finally { setLoading(false); }
    }
    loadBusiness();
  }, []);




  useEffect(() => {
    async function checkLinkedIn() {
      try {
        const res = await fetch(`${API}/linkedin/status`, {
          headers: AUTH()
        });
        const data = await res.json();
        setLinkedinConnected(data.connected);
      } catch {}
    }

    checkLinkedIn();
  }, []);

  // ── Load categories ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/categories`, { headers: AUTH() })
      .then(r => r.json())
      .then(data => { if (data) setCategories(data); })
      .catch(console.error);
  }, []);

  // ── Load subcategories ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!formData.businessType) return;
    fetch(`${API}/subcategories/${formData.businessType}`, { headers: AUTH() })
      .then(r => r.json())
      .then(data => { if (data) setSubCategories(data); })
      .catch(console.error);
  }, [formData.businessType]);

  // ── Load team members ─────────────────────────────────────────────────────────
  const fetchTeamMembers = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/network/secondary-users`, { headers: AUTH() });
      const data = await res.json();
      if (data.success) setTeamMembers(data.data);
    } catch (err) { console.error("Failed to load team members:", err); }
  }, []);

  useEffect(() => { fetchTeamMembers(); }, [fetchTeamMembers]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const connectLinkedIn = async () => {
    try {
      const res = await fetch(`${API}/linkedin/auth`, {
        headers: AUTH()
      });

      const data = await res.json();

      if (!data.url) {
        alert("Failed to connect LinkedIn");
        return;
      }

      window.location.href = data.url;

    } catch (err) {
      console.error("LinkedIn connect error:", err);
      alert("Something went wrong");
    }
  };





  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch(`${API}/upload-image`, { method: "POST", headers: AUTH(), body: fd });
    const data = await res.json();
    if (data.success) {
      setLogoPreview(data.url);
      setFormData(prev => ({ ...prev, logoUrl: data.url }));
    }
  };

  const handleDescriptionUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch(`${API}/upload-description`, { method: "POST", headers: AUTH(), body: fd });
    const data = await res.json();
    if (data.success) setFormData(prev => ({ ...prev, descriptionFileUrl: data.url }));
  };

  const handleAddMember = async () => {
    if (!secondaryEmail.trim()) return;
    setAddingMember(true);
    setMemberStatus(null);
    try {
      const res  = await fetch(`${API}/network/add-user`, {
        method: "POST", headers: JSON_AUTH(),
        body: JSON.stringify({ email: secondaryEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setMemberStatus({ type: "success", msg: `${secondaryEmail} added successfully.` });
        setSecondaryEmail("");
        fetchTeamMembers();
      } else {
        setMemberStatus({ type: "error", msg: data.detail || "Failed to add member." });
      }
    } catch {
      setMemberStatus({ type: "error", msg: "Network error. Please try again." });
    } finally {
      setAddingMember(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.brandName.trim()) {
      setPopup({ show: true, type: "warning", title: "Missing Business Name", message: "Please enter your business name before saving." });
      return;
    }
    if (!formData.agreeTerms || !formData.agreePrivacy) {
      setPopup({ show: true, type: "warning", title: "Agreement Required", message: "Please agree to both the Terms & Conditions and Privacy Policy before saving." });
      return;
    }
    if (!isEditing) return;

    const payload = {
      business_name: formData.brandName, business_type: formData.businessType,
      industry: formData.industry,
      year_established: formData.yearEstablished ? Number(formData.yearEstablished) : null,
      logo_placement: formData.logoPlacement, owner_name: formData.ownerName,
      email: formData.email, phone: formData.phone, logo_url: formData.logoUrl,
      website_url: formData.website, brand_color: formData.brandColor,
      tagline: formData.tagline,
      hashtags: hashtags.join(","),
      street_address: formData.street, city: formData.city, state: formData.state,
      country: formData.country, postal_code: formData.zip,
      registration_number: formData.registrationNumber, tax_id: formData.taxId,
      default_currency: formData.currency, timezone: formData.timeZone,
      fiscal_year_start: formData.fiscalYear,
      language_preference: formData.language, notification_preference: formData.notifications,
      description: formData.description, description_file_url: formData.descriptionFileUrl,
      terms_accepted: formData.agreeTerms, privacy_accepted: formData.agreePrivacy,
    };

    try {
      const res  = await fetch(`${API}/setup-business`, {
        method: "POST", headers: JSON_AUTH(), body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setPopup({ show: true, type: "warning", title: "Save Failed", message: data.detail || "Failed to save business profile." });
        return;
      }
      setIsEditing(false);
      setHasBusiness(true);
      setPopup({ show: true, type: "success", title: "Business Profile Saved", message: "Your business profile has been saved successfully." });
    } catch (err) {
      console.error(err);
      setPopup({ show: true, type: "warning", title: "Server Error", message: "Something went wrong. Please try again." });
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bs-wrapper">
        <div className="bs-loading">
          <div className="bs-spinner" />
          <p>Loading business profile...</p>
        </div>
      </div>
    );
  }

  // =============================================================================
  //  RENDER
  // =============================================================================
  return (
    <div className="bs-wrapper">

      {/* ── HEADER ── */}
      <div className="bs-header">
        <div className="bs-header-spacer" />
        <button type="button" className="bs-edit-btn"
          onClick={() => setIsEditing(e => !e)}
          title={isEditing ? "Close editing" : "Edit profile"}>
          {isEditing ? "Close" : "Edit"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bs-form">

        {/* ══ ROW 1  ── BUSINESS NAME  |  BUSINESS DESCRIPTION ══ */}

        {/* BUSINESS NAME */}
        <div className="bs-section">
          <h2 className="bs-section-title">BUSINESS NAME</h2>

          {/* 🔗 LinkedIn Connect Button (hidden) */}
          <div className="bs-linkedin-hidden" style={{ marginBottom: "12px" }}>
            <button
              type="button"
              onClick={connectLinkedIn}
              className="bs-edit-btn"
              style={{
                background: linkedinConnected ? "#28a745" : "#0A66C2",
                color: "#fff"
              }}
            >
              {linkedinConnected ? "LinkedIn Connected ✓" : "Connect LinkedIn"}
            </button>
          </div>

          <div className="bs-row">
            <label className="bs-label">Brand / Trade Name *</label>
            <div className={!isEditing ? "bs-tooltip-wrap" : ""} data-tooltip="Click Edit to modify">
              <input name="brandName" value={formData.brandName} onChange={handleInputChange}
                className="bs-input" disabled={!isEditing} placeholder="e.g. Acme Corp" />
            </div>
          </div>

          <SelectRow label="Business Type *" name="businessType" value={formData.businessType}
            onChange={handleInputChange} disabled={!isEditing}
            options={[...categories, "Others"]} placeholder="Select Category" />

          <SelectRow label="Industry / Category *" name="industry" value={formData.industry}
            onChange={handleInputChange} disabled={!isEditing}
            options={subCategories} placeholder="Select Sub Category" />

          <FieldRow label="Year of Establishment" name="yearEstablished"
            value={formData.yearEstablished} onChange={handleInputChange}
            disabled={!isEditing} placeholder="e.g. 2010" />
        </div>

        {/* BUSINESS DESCRIPTION */}
        <div className="bs-section">
          <div className="bs-desc-header">
            <h2 className="bs-section-title">BUSINESS DESCRIPTION</h2>
            <label className={`bs-upload-btn ${!isEditing ? "bs-upload-btn--disabled" : ""}`}>
              ⬆ Upload from File
              <input type="file" accept=".txt,.doc,.docx,.pdf,.md"
                onChange={handleDescriptionUpload} disabled={!isEditing} hidden />
            </label>
          </div>

          <div className="bs-textarea-container">
            <div className={!isEditing ? "bs-tooltip-wrap bs-tooltip-wrap--full" : "bs-textarea-wrap"}
              data-tooltip="Click Edit to modify">
              <textarea name="description" value={formData.description}
                onChange={handleInputChange} className="bs-textarea"
                disabled={!isEditing} rows={8}
                placeholder="Describe your business — what you do, your mission, your values, and what sets you apart." />
            </div>
          </div>

          {formData.description && (
            <div className="bs-desc-meta">
              <span>{formData.description.length} characters</span>
              {isEditing && (
                <button type="button" className="bs-desc-clear"
                  onClick={() => setFormData(prev => ({ ...prev, description: "" }))}>
                  Clear
                </button>
              )}
            </div>
          )}

          {formData.descriptionFileUrl && (
            <div className="bs-file-preview">
              <span>Uploaded File:</span>
              <a href={formData.descriptionFileUrl} target="_blank"
                rel="noopener noreferrer" className="bs-file-link">View File</a>
              {isEditing && (
                <button type="button" className="bs-desc-remove"
                  onClick={() => setFormData(prev => ({ ...prev, descriptionFileUrl: "" }))}>
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* ══ ROW 2  ── BUSINESS DETAILS & CONTACT  |  BUSINESS ADDRESS ══ */}

        {/* BUSINESS DETAILS & CONTACT */}
        <div className="bs-section">
          <div className="bs-logo-header">
            <h2 className="bs-section-title">BUSINESS DETAILS</h2>
            <label className={`bs-upload-btn ${!isEditing ? "bs-upload-btn--disabled" : ""}`}>
              ⬆ Upload Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload}
                disabled={!isEditing} hidden />
            </label>
          </div>

          {logoPreview && (
            <div className="bs-logo-preview">
              <button type="button" className="bs-remove-logo"
                onClick={() => setLogoPreview(null)} disabled={!isEditing}>✕</button>
              <img src={logoPreview} alt="Logo Preview" />
            </div>
          )}

          <div className="bs-row">
            <label className="bs-label">Logo Placement</label>
            <div className={!isEditing ? "bs-tooltip-wrap" : ""} data-tooltip="Click Edit to modify">
              <select name="logoPlacement" value={formData.logoPlacement}
                onChange={handleInputChange} className="bs-input" disabled={!isEditing}>
                <option value="">Select Placement</option>
                <option value="LEFT_TOP">Left Top</option>
                <option value="LEFT_BOTTOM">Left Bottom</option>
                <option value="RIGHT_TOP">Right Top</option>
                <option value="RIGHT_BOTTOM">Right Bottom</option>
              </select>
            </div>
          </div>

          <h3 className="bs-subsection">OWNER / PRIMARY CONTACT</h3>
          {[
            ["Owner / Founder Name", "ownerName",  "e.g. John Smith"],
            ["Email Address",        "email",       "e.g. john@acme.com"],
            ["Phone Number",         "phone",       "e.g. +1 555 000 0000"],
          ].map(([label, name, placeholder]) => (
            <FieldRow key={name} label={label} name={name}
              value={formData[name]} onChange={handleInputChange}
              disabled={!isEditing} placeholder={placeholder} />
          ))}
        </div>

        {/* BUSINESS ADDRESS */}
        <div className="bs-section">
          <h2 className="bs-section-title">BUSINESS ADDRESS</h2>
          {[
            ["Street Address",    "street",  "e.g. 123 Main St"],
            ["City",              "city",    "e.g. New York"],
            ["State / Province",  "state",   "e.g. NY"],
            ["Country",           "country", "e.g. United States"],
            ["ZIP / Postal Code", "zip",     "e.g. 10001"],
          ].map(([label, name, placeholder]) => (
            <FieldRow key={name} label={label} name={name}
              value={formData[name]} onChange={handleInputChange}
              disabled={!isEditing} placeholder={placeholder} />
          ))}
        </div>

        {/* ══ ROW 3  ── FINANCIAL PREFERENCES (hidden)  |  BRANDING ══ */}

        {/* FINANCIAL (hidden) */}
        <div className="bs-section bs-hidden-section">
          <h2 className="bs-section-title">FINANCIAL PREFERENCES</h2>
          {[
            ["Default Currency",        "currency",   "e.g. USD"],
            ["Time Zone",               "timeZone",   "e.g. America/New_York"],
            ["Fiscal Year Start Month", "fiscalYear", "e.g. January"],
          ].map(([label, name, placeholder]) => (
            <FieldRow key={name} label={label} name={name}
              value={formData[name]} onChange={handleInputChange}
              disabled={!isEditing} placeholder={placeholder} />
          ))}
        </div>

        {/* BRANDING */}
        <div className="bs-section">
          <h2 className="bs-section-title">BRANDING</h2>
          {[
            ["Website URL",       "website",    "e.g. https://acme.com"],
            ["Brand Color Theme", "brandColor", "e.g. #1e3a5f"],
            ["Tagline",           "tagline",    "e.g. Empowering businesses worldwide"],
          ].map(([label, name, placeholder]) => (
            <FieldRow key={name} label={label} name={name}
              value={formData[name]} onChange={handleInputChange}
              disabled={!isEditing} placeholder={placeholder} />
          ))}

          {/* ── HASHTAGS ── */}
          <div className="bs-row bs-row--top">
            <label className="bs-label">
              Hashtags
              <span className="bs-hashtag-hint">
                {hashtags.length}/5
              </span>
            </label>
            <div className={!isEditing ? "bs-tooltip-wrap" : ""} data-tooltip="Click Edit to modify">
              <HashtagInput
                tags={hashtags}
                onChange={setHashtags}
                disabled={!isEditing}
              />
            </div>
          </div>
          {isEditing && (
            <p className="bs-hashtag-tip">
              Press <kbd>Enter</kbd>, <kbd>Space</kbd> or <kbd>,</kbd> to add · <kbd>Backspace</kbd> to remove last
            </p>
          )}
        </div>

        {/* ══ ROW 4  ── PREFERENCES (hidden)  |  LEGAL ══ */}

        {/* PREFERENCES (hidden) */}
        <div className="bs-section bs-hidden-section">
          <h2 className="bs-section-title">PREFERENCES</h2>
          {[
            ["Language Preference",     "language",      "e.g. English"],
            ["Notification Preference", "notifications", "e.g. Email"],
          ].map(([label, name, placeholder]) => (
            <FieldRow key={name} label={label} name={name}
              value={formData[name]} onChange={handleInputChange}
              disabled={!isEditing} placeholder={placeholder} />
          ))}
        </div>

        {/* LEGAL */}
        <div className="bs-section">
          <h2 className="bs-section-title">LEGAL &amp; REGISTRATION DETAILS</h2>
          {[
            ["Business Registration Number", "registrationNumber", "e.g. REG123456"],
            ["Tax ID / VAT / GST Number",    "taxId",              "e.g. VAT9876543"],
          ].map(([label, name, placeholder]) => (
            <FieldRow key={name} label={label} name={name}
              value={formData[name]} onChange={handleInputChange}
              disabled={!isEditing} placeholder={placeholder} />
          ))}
        </div>

        {/* ══ TEAM MEMBERS  (full width) ══ */}
        <div className="bs-section bs-section--full">
          <div className="bs-team-header">
            <div className="bs-team-header-left">
              <h2 className="bs-section-title">TEAM MEMBERS</h2>
              <span className="bs-team-count">{teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* ── Add member input row ── */}
          <div className="bs-add-member-row">
            <div className="bs-add-member-field">
              <span className="bs-add-member-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                type="email"
                className="bs-add-member-input"
                placeholder="Enter email address to invite..."
                value={secondaryEmail}
                onChange={e => { setSecondaryEmail(e.target.value); setMemberStatus(null); }}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddMember(); } }}
              />
            </div>
            <button
              type="button"
              className="bs-add-member-btn"
              disabled={!secondaryEmail.trim() || addingMember}
              onClick={handleAddMember}
            >
              {addingMember ? (
                <span className="bs-btn-spinner" />
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Member
                </>
              )}
            </button>
          </div>

          {/* ── Status message ── */}
          {memberStatus && (
            <div className={`bs-member-status bs-member-status--${memberStatus.type}`}>
              {memberStatus.type === "success" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              {memberStatus.msg}
            </div>
          )}

          {/* ── Members list ── */}
          {teamMembers.length > 0 ? (
            <div className="bs-team-grid">
              {teamMembers.map((member, index) => (
                <div
                  key={member.user_id}
                  className="bs-member-card"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="bs-member-avatar" style={{ background: getAvatarColor(member.email) }}>
                    {getInitials(member.email)}
                  </div>
                  <div className="bs-member-info">
                    <span className="bs-member-email">{member.email}</span>
                    <span className="bs-member-role">Team Member</span>
                  </div>
                  <div className="bs-member-badge">Active</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bs-team-empty">
              <div className="bs-team-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <p className="bs-team-empty-title">No team members yet</p>
              <p className="bs-team-empty-sub">Invite your team by entering their email address above.</p>
            </div>
          )}
        </div>

        {/* ══ AGREEMENT ══ */}
        <div className="bs-section bs-section--full">
          <h2 className="bs-section-title">AGREEMENT</h2>
          <div className="bs-agreement-row">
            {[
              ["agreeTerms",   "I agree to the Terms & Conditions"],
              ["agreePrivacy", "I agree to the Privacy Policy"],
            ].map(([name, label]) => (
              <label key={name}
                className={`bs-agreement-tab ${formData[name] ? "bs-checked" : ""} ${!isEditing ? "bs-disabled" : ""}`}>
                <input type="checkbox" name={name} checked={formData[name]}
                  onChange={handleInputChange} disabled={!isEditing} hidden />
                <span className="bs-agreement-icon">{formData[name] ? "✓" : ""}</span>
                <span className="bs-agreement-label">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ══ SAVE ══ */}
        <div className="bs-actions">
          <button type="submit" className="bs-save-btn" disabled={!isEditing}>
            SAVE
          </button>
        </div>

      </form>

      {/* ── POPUP ── */}
      {popup.show && (
        <div className="bs-popup-overlay">
          <div className={`bs-popup bs-popup--${popup.type}`}>
            <div className="bs-popup-icon">
              {popup.type === "success" ? "✓" : "⚠"}
            </div>
            <h3 className="bs-popup-title">{popup.title}</h3>
            <p className="bs-popup-msg">{popup.message}</p>
            <button className="bs-popup-btn" onClick={() => {
              if (popup.type === "success") {
                sessionStorage.setItem("showInit", "true");
                sessionStorage.setItem("refreshAccount", "true");
                navigate("/initializing", { replace: true });
              } else {
                setPopup(p => ({ ...p, show: false }));
              }
            }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}