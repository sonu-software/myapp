import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";

import '../styles/docket.css';

const API = import.meta.env.VITE_BACKEND_URL;

/* ---------------- TooltipLabel ---------------- */
const TooltipLabel = ({ text, tooltip }) => (
  <div className="docket-label-with-tooltip">
    <label>{text}</label>
    <div className="docket-info-wrapper">
      <span className="docket-info-icon">?</span>
      <div className="docket-tooltip">{tooltip}</div>
    </div>
  </div>
);

/* ---------------- FormField ---------------- */
const FormField = ({ label, field, value, onChange, type = 'input', rows = 3, tooltip }) => (
  <div className="docket-form-group">
    {tooltip ? (
      <TooltipLabel text={label} tooltip={tooltip} />
    ) : (
      <label>{label}</label>
    )}
    {type === 'textarea' ? (
      <textarea
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}...`}
        rows={rows}
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
    )}
  </div>
);

/* ---------------- SelectField ---------------- */
const SelectField = ({ label, field, value, onChange, options, tooltip }) => (
  <div className="docket-form-group">
    {tooltip ? (
      <TooltipLabel text={label} tooltip={tooltip} />
    ) : (
      <label>{label}</label>
    )}
    <select value={value} onChange={(e) => onChange(field, e.target.value)}>
      <option value="">Select {label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

/* ================= MAIN COMPONENT ================= */
const Docket = () => {
  const API_URL = API;





  // ── MODE & SUB-MODE ──────────────────────────────
  const [mode, setMode] = useState('');
  const [subMode, setSubMode] = useState(""); // ✅ ADD THIS


  const { docketId } = useParams();



  const [mediaTypes, setMediaTypes] = useState([]);
  const [mediaType, setMediaType] = useState("");
  const [subTypes, setSubTypes] = useState([]);
  const [subType, setSubType] = useState("");

  



  // ── DOCKET TITLE ─────────────────────────────
  const [docketTitle, setDocketTitle] = useState("");




  // ── PRODUCTS ─────────────────────────────
  const [productList, setProductList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProductData, setSelectedProductData] = useState(null);


  // ── PERSONAS ─────────────────────────────
  const [personaList, setPersonaList] = useState([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [selectedPersonaData, setSelectedPersonaData] = useState(null);


  // Dynamic fields from DB
  const [mandatoryFields, setMandatoryFields] = useState([]);
  const [optionalFields, setOptionalFields] = useState([]);

  // Dynamic values
  const [fieldValues, setFieldValues] = useState({});

  // Prompt History
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [selectedHistoryPrompt, setSelectedHistoryPrompt] = useState(null);




  async function handleOpenHistory() {
    try {
      const res = await fetch(`${API_URL}/planner/docket/${docketId}/history`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      const data = await res.json();

      if (data.success) {
        setHistoryList(data.data);
        setShowHistoryModal(true);
      }

    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  }



  async function loadLatestPrompt(docketId) {
    try {
      const res = await fetch(`${API_URL}/planner/docket/${docketId}/history`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      const data = await res.json();

      if (data.success && data.data.length > 0) {
        // First item is latest (because ordered DESC)
        setGeneratedPrompt(data.data[0].prompt_text);
      }

    } catch (err) {
      console.error("Failed to load latest prompt:", err);
    }
  }









  useEffect(() => {
    if (!docketId) return;

    async function loadDocket() {
      try {
        const res = await fetch(`${API_URL}/planner/docket/${docketId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });

        const data = await res.json();

        if (!data.success) return;

        const d = data.data;

        setDocketTitle(d.title);
        setMode(d.media_name);
        setMediaType(d.media_type);
        setSubType(d.subtype_name);
        setSelectedProductId(d.product_id || "");
        setSelectedPersonaId(d.persona_id || "");

        // 🔥 Now load latest prompt
        await loadLatestPrompt(docketId);

      } catch (err) {
        console.error("Failed to load docket:", err);
      }
    }

    loadDocket();

  }, [docketId]);





  useEffect(() => {
    if (!mode) {
      setMediaTypes([]);
      return;
    }


    fetch(`${API_URL}/media-types?mode=${mode}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMediaTypes(data.data);
        }
      });
  }, [mode]);





  useEffect(() => {
    if (!mediaType) return;

    fetch(`${API_URL}/media-subtypes?mode=${mode}&mediaType=${mediaType}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSubTypes(data.data);
        }
      });
  }, [mediaType]);






 


  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`${API_URL}/products`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });

        const data = await res.json();
        if (data.success) {
          setProductList(data.data);
        }

      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    }

    fetchProducts();
  }, []);



  useEffect(() => {
  if (!selectedProductId || productList.length === 0) return;

  loadProduct(selectedProductId);

}, [selectedProductId, productList]);




  useEffect(() => {
  async function fetchPersonas() {
    try {
      const res = await fetch(`${API_URL}/personas`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      const data = await res.json();
      if (data.success) {
        setPersonaList(data.data);
      }

    } catch (err) {
      console.error("Failed to fetch personas:", err);
    }
  }

  fetchPersonas();
}, []);



useEffect(() => {
  if (!selectedPersonaId || personaList.length === 0) return;

  loadPersona(selectedPersonaId);

}, [selectedPersonaId, personaList]);


  useEffect(() => {
    async function fetchFields() {
      if (!mode || !mediaType || !subType) return;

      try {
        const res = await fetch(
        `${API_URL}/media-fields?mode=${mode}&mediaType=${mediaType}&subType=${subType}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );


        const data = await res.json();

        if (data.success) {
          const defaultMandatory = data.data.mandatory || [];
          const defaultOptional = data.data.optional || [];

          setMandatoryFields(defaultMandatory);
          setOptionalFields(defaultOptional);

          const initialValues = {};

          [...defaultMandatory, ...defaultOptional].forEach(field => {
            initialValues[field.variable_name] = {
              value: "",
              enabled: true
            };
          });

          setFieldValues(initialValues);

          // 🔥 PASS defaults into loader
          loadSavedFieldValues(defaultMandatory, defaultOptional);

        }
      } catch (err) {
        console.error("Failed to load media subtype fields", err);
      }
    }

    fetchFields();
  }, [mode, mediaType, subType]);









  // ── PROMPT TAB (auto-syncs with mode) ────────────
  const [activePromptTab, setActivePromptTab] = useState('message');

  useEffect(() => {
    if (mode === 'visuals') {
      setActivePromptTab('image');
    } else if (mode === 'message') {
      setActivePromptTab('message');
    }
  }, [mode]);

  // ── MANDATORY FORM DATA ──────────────────────────
  const [formData, setFormData] = useState({
    businessName: '',
    businessCategory: '',
    subCategory: '',
    customCategory: '',
    aboutProduct: '',
    targetPersona: '',
    natureOfPrompt: '',
    imageStyle: '',
    // Before fields (auto-filled from /rules)
    beforePersona: '',
    beforeProblem: '',
    beforeEmotion: '',
    beforeEnvironment: '',
    beforeText: '',
    // After fields (auto-filled from /rules)
    afterPersona: '',
    afterSupport: '',
    afterOutcome: '',
    afterEmotion: '',
    afterText: ''
  });




  // ── CATEGORIES & SUBCATEGORIES ───────────────────
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

  // ── CHAT STATE ───────────────────────────────────
  const [userMessage, setUserMessage] = useState('');
  const [conversationBubbles, setConversationBubbles] = useState([
    {
      id: 1,
      text: "Hello! I'm your personal assistant. How can I help you today?",
      type: 'ai',
      sender: 'ai'
    }
  ]);

  // ── PROMPT STATE ─────────────────────────────────
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState('');

  // ── TOAST STATE ──────────────────────────────────
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [saveToastMessage, setSaveToastMessage] = useState('');

  // ── VALIDATION ───────────────────────────────────
  const [canGenerate, setCanGenerate] = useState(false);

  // ── MODAL STATE ──────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [modalBoxType, setModalBoxType] = useState("optional"); // "mandatory" | "optional"
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // ── OPTIONS ──────────────────────────────────────
  const imageStyles = [
    'Professional', 'Modern', 'Minimalistic', 'Elegant', 'Bold & Vibrant',
    'Clean & Simple', 'Luxury', 'Playful', 'Corporate', 'Dark Theme', 'Light Theme'
  ];

  const natureOfPromptOptions = [
    'Calm & Reassuring',
    'Friendly & Approachable',
    'Professional & Polished',
    'Confident & Authoritative',
    'Supportive & Empathetic',
    'Aspirational & Forward-Looking',
    'Trust-Focused & Conservative',
    'Direct & No-Nonsense',
    'Premium & Refined',
    'Conversational & Human'
  ];

  /* ============== HELPERS ============== */

  function handleUnauthorized(res) {
    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/';
      return true;
    }
    return false;
  }



  async function loadSavedFieldValues(defaultMandatory = [], defaultOptional = []) {
    try {
      const res = await fetch(`${API_URL}/planner/docket/${docketId}/fields`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      const data = await res.json();
      if (!data.success) return;

      const savedValues = {};
      const newMandatoryCustom = [];
      const newOptionalCustom = [];

      data.data.forEach(row => {

        savedValues[row.label] = {
          value: row.value,
          enabled: row.checkbox_clicked === 1
        };

        // 🔥 If field does not exist in defaults, rebuild it
        const existsInDefaults =
          defaultMandatory.some(f => f.variable_name === row.label) ||
          defaultOptional.some(f => f.variable_name === row.label);

        if (!existsInDefaults) {
          const customField = {
            id: Date.now() + Math.random(),
            label: row.label,
            variable_name: row.label,
            box: row.box,
            isCustom: true
          };

          if (row.box === "mandatory") {
            newMandatoryCustom.push(customField);
          } else {
            newOptionalCustom.push(customField);
          }
        }
      });

      // 🔥 Merge custom fields into state
      setMandatoryFields(prev => [...prev, ...newMandatoryCustom]);
      setOptionalFields(prev => [...prev, ...newOptionalCustom]);

      setFieldValues(prev => ({
        ...prev,
        ...savedValues
      }));

    } catch (err) {
      console.error("Failed to load saved fields:", err);
    }
  }











  // ── Nature of Prompt and Image Style moved to optional,
  //    so they are no longer required for validation
  const isMandatoryFormValid = () =>
    Boolean(
      mode &&
      mediaType &&
      subType
    );



  /* ============== API CALLS ============== */

  const [businessProfile, setBusinessProfile] = useState(null);
  // Auto-fill business info from BusinessSetup
  useEffect(() => {
    async function loadBusinessProfile() {
      try {
        const res = await fetch(`${API_URL}/me/business`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (handleUnauthorized(res)) return;

        const data = await res.json();

        if (data.exists) {
          const b = data.data;

          setFormData(prev => ({
            ...prev,
            businessName: b.business_name || "",
            businessCategory: b.business_type || "",
            subCategory: b.industry || ""
          }));
        }

      } catch (err) {
        console.error("Failed to load business profile:", err);
      }
    }

    loadBusinessProfile();
  }, []);


  // Load categories on mount
  useEffect(() => {
    fetch(`${API_URL}/categories`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then((res) => {
        if (handleUnauthorized(res)) return;
        return res.json();
      })
      .then((data) => data && setCategories(data))
      .catch(console.error);
  }, []);

  // Load subcategories when category changes
  useEffect(() => {
    if (!formData.businessCategory) return;
    fetch(`${API_URL}/subcategories/${formData.businessCategory}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then((res) => {
        if (handleUnauthorized(res)) return;
        return res.json();
      })
      .then((data) => data && setSubCategories(data))
      .catch(console.error);
  }, [formData.businessCategory]);

  

  // Re-validate whenever form/mode/subMode changes
  useEffect(() => {
    setCanGenerate(isMandatoryFormValid());
  }, [formData, mode, mediaType, subType]);


  /* ============== HANDLERS ============== */

  const handleFormChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleOptionalChange = (field, value) =>
    setOptionalData((prev) => ({ ...prev, [field]: value }));


  function buildFinalPersona() {
    const rulePersona = formData.targetPersona || "";

    const dropdownPersona = selectedPersonaData
      ? `
  Strictly Persona in Details:
  ${selectedPersonaData.persona_name}

  ${selectedPersonaData.segments
    .filter(seg => seg.is_active)
    .map(seg => `${seg.segment_type.toUpperCase()} - ${seg.label}: ${seg.value}`)
    .join("\n")}
  `
      : "";

    return `
  Over All PERSONA:
  ${rulePersona}

  ${dropdownPersona}
  `;
  }





  function buildFinalProduct() {
    if (!selectedProductData) {
      return formData.aboutProduct || "";
    }

    return `
  Product Name:
  ${selectedProductData.product_name || ""}

  Description:
  ${selectedProductData.product_description || ""}

  Features:
  ${(selectedProductData.features || []).join("\n")}

  USP:
  ${(selectedProductData.usps || []).join("\n")}

  Values:
  ${(selectedProductData.values || []).join("\n")}
    `;
  }



  // Real generate via backend
  async function handleGenerate() {
    setGeneratedPrompt('Generating...');

    try {
      // STEP 1 — Save mandatory fields
      const mandatorySaved = await handleSave("mandatory");

      // STEP 2 — Save optional fields
      const optionalSaved = await handleSave("optional");

      if (!mandatorySaved || !optionalSaved) {
        setGeneratedPrompt("Error saving fields.");
        return;
      }

      // STEP 3 — Generate prompt
      const res = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          docket_id: Number(docketId),
          dynamicFields: Object.fromEntries(
            Object.entries(fieldValues)
              .filter(([_, field]) => field.enabled)
              .map(([key, field]) => [key, field.value])
          ),
          name: formData.businessName,
          category: formData.businessCategory,
          customCategory: formData.customCategory,
          subCategory: formData.subCategory,
          product: buildFinalProduct(),
          persona: buildFinalPersona(),
          imageType: formData.natureOfPrompt,
          imageStyle: formData.imageStyle,
          mode,
          mediaType,
          subType
        })
      });

      const data = await res.json();
      setGeneratedPrompt(data.success ? data.output : "Error generating prompt");
      setIsEditMode(false);

    } catch (err) {
      console.error("Generate error:", err);
      setGeneratedPrompt("Error generating prompt.");
    }
  }



  function loadPersona(personaId) {
    if (!personaId) {
      setSelectedPersonaId("");
      setSelectedPersonaData(null);
      return;
    }

    const persona = personaList.find(p => p.persona_id == personaId);
    if (!persona) return;

    setSelectedPersonaId(personaId);
    setSelectedPersonaData(persona);
  }






  const handleDynamicFieldChange = (label, value) => {
    setFieldValues(prev => ({
      ...prev,
      [label]: value
    }));
  };



  async function loadProduct(productId) {
    if (!productId) {
      setSelectedProductId("");
      setSelectedProductData(null);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      const data = await res.json();

      if (data.success) {
        setSelectedProductId(productId);
        setSelectedProductData(data.data);
      }

    } catch (err) {
      console.error("Failed to load product:", err);
    }
  }


  // Real chat via backend
  async function handleSendMessage() {
    if (!userMessage.trim()) return;

    const newUserMessage = {
      id: Date.now(),
      text: userMessage,
      type: 'user',
      sender: 'user'
    };

    setConversationBubbles((prev) => [...prev, newUserMessage]);
    setUserMessage('');

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: newUserMessage.text,
          mode,
          mediaType,
          subType,

          business: formData.businessName,
          category: formData.businessCategory
        })
      });

      if (handleUnauthorized(res)) return;
      const data = await res.json();
      setConversationBubbles((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: data.reply || 'No response from AI.',
          type: 'ai',
          sender: 'ai'
        }
      ]);
    } catch {
      setConversationBubbles((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: '⚠️ AI server not reachable.',
          type: 'ai',
          sender: 'ai'
        }
      ]);
    }
  }

  // Copy generated prompt
  const handleCopy = () => {
    if (!generatedPrompt) return;
    const textarea = document.createElement('textarea');
    textarea.value = generatedPrompt;
    textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 3000);
  };

  const handleEdit = () => {
    setEditablePrompt(generatedPrompt);
    setIsEditMode(true);
  };

  const handleSaveEdit = () => {
    setGeneratedPrompt(editablePrompt);
    setIsEditMode(false);
  };








  async function handleSave(section) {
    const fieldsToSave = [];

    const sourceFields =
      section === "mandatory"
        ? mandatoryFields
        : optionalFields;

    sourceFields.forEach(field => {
      const fieldData = fieldValues[field.variable_name];
      if (!fieldData) return;

      fieldsToSave.push({
        label: field.variable_name,
        value: fieldData.value || "",
        checkbox_clicked: fieldData.enabled ? 1 : 0,
        box: section,
        field_source: field.isCustom ? "custom" : "default"
      });
    });

    try {
      const res = await fetch(`${API_URL}/planner/docket/${docketId}/fields`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ fields: fieldsToSave })
      });

      const data = await res.json();
      return data.success;

    } catch (err) {
      console.error("Save failed:", err);
      return false;
    }
  }







  const handleModalSave = () => {
    if (!newFieldLabel.trim()) return;

    const variableKey = newFieldLabel
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();

    const newField = {
      id: Date.now(),
      label: newFieldLabel,
      variable_name: variableKey,
      box: modalBoxType,
      isCustom: true
    };

    if (modalBoxType === "mandatory") {
      setMandatoryFields(prev => [...prev, newField]);
    } else {
      setOptionalFields(prev => [...prev, newField]);
    }

    // 🔥 ADD INTO fieldValues (THIS MAKES IT GO TO BACKEND)
    setFieldValues(prev => ({
      ...prev,
      [variableKey]: {
        value: newFieldValue || "",
        enabled: true
      }
    }));

    setShowModal(false);
    setNewFieldLabel('');
    setNewFieldValue('');
  };


  const handleDeleteCustomField = (field) => {
    // Remove from correct list
    if (field.box === "mandatory") {
      setMandatoryFields(prev =>
        prev.filter(f => f.id !== field.id)
      );
    } else {
      setOptionalFields(prev =>
        prev.filter(f => f.id !== field.id)
      );
    }

    // Remove from fieldValues
    setFieldValues(prev => {
      const updated = { ...prev };
      delete updated[field.variable_name];
      return updated;
    });
  };



  const handleUpdateCustomField = (fieldId, newValue) =>
    setCustomOptionalFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, value: newValue } : f))
    );

  /* ============== RENDER ============== */
  return (
    <div className="docket-container">
      {/* ───────── TOP DOCKET HEADER ───────── */}

      <div className="docket-header-view">
      <h2>{docketTitle}</h2>

      <div className="docket-meta">
        
        <span>{mode}</span>
        <span> | {mediaType}</span>
        <span> | {subType}</span>
        <span> | {selectedProductData?.product_name}</span>
        <span> | {selectedPersonaData?.persona_name}</span>
      </div>
    </div>
          


      

      {/* ── MAIN GRID ── */}
      <div className="docket-content">

        {/* ══════════ COLUMN 1 – FORMS ══════════ */}
        <div className="docket-column docket-column-1">

          {/* MANDATORY FIELDS */}
          <section className="docket-mandatory-section">
            <div className="docket-optionals-header">
              <h3 className="docket-column-title">MANDATORY FIELDS</h3>
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



            <div className="docket-scroll-wrapper">
              <div className="docket-form-section">
                {mandatoryFields.map((field) => (
                  <div key={field.id} className="docket-form-group">
                    <div className="docket-field-header">
                      <input
                        type="checkbox"
                        checked={fieldValues[field.variable_name]?.enabled || false}
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


                      <label>{field.label}</label>
                      {field.isCustom && (
                        <button
                          className="docket-delete-btn"
                          onClick={() => handleDeleteCustomField(field)}
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={fieldValues[field.variable_name]?.value || ""}

                      onChange={(e) =>
                        setFieldValues(prev => ({
                          ...prev,
                          [field.variable_name]: {
                            ...prev[field.variable_name],
                            value: e.target.value
                          }
                        }))
                      }

                      placeholder={`Enter ${field.label}...`}
                    />
                  </div>
                ))}




              </div>
            </div>

            <button
              className="docket-save-btn docket-sticky-save"
              onClick={() => handleSave('mandatory')}
              disabled={!canGenerate}
            >
              Save
            </button>
          </section>

          <div className="docket-section-divider" />

          {/* OPTIONAL FIELDS */}
          <section className="docket-optional-section">
            <div className="docket-optionals-header">
              <h3>OPTIONALS</h3>
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

            <div className="docket-scroll-wrapper">
              <div className="docket-form-section">

                {optionalFields.map((field) => (
                  <div key={field.id} className="docket-form-group">
                    <div className="docket-field-header">

                      <input
                        type="checkbox"
                        checked={fieldValues[field.variable_name]?.enabled || false}
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

                      <label>{field.label}</label>
                      {field.isCustom && (
                        <button
                          className="docket-delete-btn"
                          onClick={() => handleDeleteCustomField(field)}
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={fieldValues[field.variable_name]?.value || ""}
                      onChange={(e) =>
                        setFieldValues(prev => ({
                          ...prev,
                          [field.variable_name]: {
                            ...prev[field.variable_name],
                            value: e.target.value
                          }
                        }))
                      }
                      placeholder={`Enter ${field.label}...`}
                    />
                  </div>
                ))}

              </div>

            </div>

            <button
              className="docket-save-btn docket-sticky-save"
              onClick={() => handleSave('optional')}
            >
              Save
            </button>
          </section>
        </div>

        {/* ══════════ COLUMN 2 – CHATBOT ══════════ */}
        <div className="docket-column docket-column-2">
          <div className="docket-chatbot-header">
            <h3>CHATBOT</h3>
          </div>

          <div className="docket-conversation">
            <div className="docket-conversation-background">
              <img src="/robo-bg.svg" alt="Chatbot" className="docket-robot-bg" />
            </div>

            <div className="docket-conversation-bubbles">
              {conversationBubbles.map((bubble) => (
                <div
                  key={bubble.id}
                  className={`docket-bubble-wrapper ${
                    bubble.sender === 'user' ? 'user-message' : 'ai-message'
                  }`}
                >
                  <div className="docket-bubble">{bubble.text}</div>
                </div>
              ))}
            </div>

            <div className="docket-message-input">
              <textarea
                placeholder="Type your Message..."
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && userMessage.trim()) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={3}
              />
              {/* CHANGED: Bigger send button */}
              <button
                className={`docket-send-btn ${!userMessage.trim() ? 'disabled' : ''}`}
                onClick={userMessage.trim() ? handleSendMessage : undefined}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                    stroke={userMessage.trim() ? '#4A90E2' : '#9CA3AF'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>


        {/* ══════════ COLUMN 3 – PROMPT ENGINE ══════════ */}
        <div className="docket-column docket-column-3">
          <div className="docket-prompt-section">

            <div className="docket-prompt-header">
              <h3>PROMPT</h3>
              <div className="docket-history-icon" onClick={handleOpenHistory}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#6B7280" strokeWidth="2" />
                  <path d="M12 7V12L15 15" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Tabs */}
            <div className="docket-prompt-tabs">
              {['message', 'image', 'video'].map((tab) => (
                <button
                  key={tab}
                  className={`docket-prompt-tab ${activePromptTab === tab ? 'active' : ''}`}
                  onClick={() => setActivePromptTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Prompt content */}
            <div className="docket-prompt-content">
              {isEditMode ? (
                <textarea
                  className="docket-prompt-editor"
                  value={editablePrompt}
                  onChange={(e) => setEditablePrompt(e.target.value)}
                />
              ) : (
                <pre>
                  {generatedPrompt ||
                    `Click "Generate" to create a ${mode} prompt...`}
                </pre>
              )}
            </div>


            {/* Action buttons */}
            <div className="docket-prompt-actions">
              {isEditMode ? (
                <>
                  <button className="docket-action-btn docket-save-edit-btn" onClick={handleSaveEdit}>
                    SAVE
                  </button>
                  <button className="docket-action-btn docket-cancel-edit-btn" onClick={() => setIsEditMode(false)}>
                    CANCEL
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="docket-action-btn docket-copy-btn"
                    onClick={handleCopy}
                    disabled={!generatedPrompt}
                  >
                    COPY
                  </button>
                  <button
                    className="docket-action-btn docket-edit-btn"
                    onClick={handleEdit}
                    disabled={!generatedPrompt}
                  >
                    EDIT
                  </button>
                </>
              )}
            </div>



            {/* Visual output panel (image tab only) */}
            {activePromptTab === 'image' && (
              <div className="docket-visual-output">
                <div className="docket-visual-header">
                  <h3>VISUAL OUTPUT</h3>
                  <div className="docket-history-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="#6B7280" strokeWidth="2" />
                      <path d="M12 7V12L15 15" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div className="docket-visual-content">
                  <div className="docket-visual-placeholder">
                    Generated image will appear here
                  </div>
                </div>
                <button className="docket-download-btn" onClick={() => console.log('Downloading...')}>
                  Download
                </button>
              </div>
            )}

          </div>
        </div>



        {/* ══════════ GENERATE BUTTON ══════════ */}
        <div className="docket-generate-wrapper">
          <div className="docket-generate-container">
            <button
              className={`docket-generate-btn ${!canGenerate ? 'disabled' : ''}`}
              onClick={canGenerate ? handleGenerate : undefined}
              disabled={!canGenerate}
            >
              Generate
              {!canGenerate && (
                <div className="docket-generate-tooltip">
                  <div className="docket-generate-tooltip-header">
                    Please fill all mandatory fields:
                  </div>
                  <ul className="docket-generate-tooltip-list">
                    {!mode && <li>Prompt Type</li>}
                    {mode && !mediaType && (
                      <li>{mode === 'message' ? 'Message Type' : 'Visual Type'}</li>
                    )}
                    {mediaType && !subType && (
                      <li>{mode === 'message' ? 'Message Sub Type' : 'Visual Sub Type'}</li>
                    )}

                                        {!formData.businessName && <li>Business Name</li>}
                    {!formData.businessCategory && <li>Business Category</li>}
                    {formData.businessCategory === 'Others' && !formData.customCategory && (
                      <li>Custom Category</li>
                    )}
                    {!formData.subCategory && <li>Sub Category</li>}
                    {!formData.targetPersona && <li>Target Persona</li>}
                  </ul>
                </div>
              )}
            </button>
          </div>
        </div>

      </div>
      {/* END docket-content */}

      {/* ══════════ ADD FIELD MODAL ══════════ */}
      {showModal && (
        <div className="docket-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="docket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="docket-modal-header">
              <h3>Add Custom Field</h3>
              <button className="docket-modal-close" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="docket-modal-body">
              <div className="docket-modal-form-group">
                <label>Field Name</label>
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="e.g., Special Instructions"
                  autoFocus
                />
              </div>
              <div className="docket-modal-form-group">
                <label>Field Value (Optional)</label>
                <input
                  type="text"
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                  placeholder="e.g., Handle with care"
                />
              </div>
            </div>
            <div className="docket-modal-footer">
              <button
                className="docket-modal-btn docket-modal-cancel"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="docket-modal-btn docket-modal-save"
                onClick={handleModalSave}
                disabled={!newFieldLabel.trim()}
              >
                Save Field
              </button>
            </div>
          </div>
        </div>
      )}




      {/* ══════════ HISTORY MODAL ══════════ */}
      {showHistoryModal && (
        <div className="docket-modal-overlay" onClick={() => {
            setShowHistoryModal(false);
            setSelectedHistoryPrompt(null);
        }}>
          <div className="docket-modal" onClick={(e) => e.stopPropagation()}>

            <div className="docket-modal-header">

              {!selectedHistoryPrompt ? (
                <h3>Prompt History</h3>
              ) : (
                <div className="docket-history-header-with-back">
                  <button
                    className="docket-history-header-back"
                    onClick={() => setSelectedHistoryPrompt(null)}
                  >
                    ←
                  </button>

                  <div className="docket-history-title-block">
                    <h3>
                      Version {selectedHistoryPrompt.version}
                    </h3>
                    <div className="docket-history-date">
                      {new Date(selectedHistoryPrompt.createdAt).toLocaleString()}
                    </div>
                  </div>

                </div>
              )}

              <button
                className="docket-modal-close"
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedHistoryPrompt(null);
                }}
              >
                ✕
              </button>

            </div>

            <div className="docket-modal-body">

              {!selectedHistoryPrompt ? (
                historyList.map((item, index) => (
                  <div
                    key={item.docket_result_id}
                    className="docket-history-item"
                    onClick={() => setSelectedHistoryPrompt({
                      text: item.prompt_text,
                      version: historyList.length - index,
                      createdAt: item.created_at
                    })}
                                      >
                    <strong>Version {historyList.length - index}</strong>
                    <div className="docket-history-time">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="docket-history-preview-wrapper">

                  <div className="docket-history-prompt-view">
                    <pre>{selectedHistoryPrompt.text}</pre>
                  </div>

                </div>
              )
              }

            </div>

          </div>
        </div>
      )}









      {/* ══════════ TOASTS ══════════ */}
      {showCopyToast && (
        <div className="docket-copy-toast">
          <div className="docket-copy-toast-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span>Prompt copied to clipboard!</span>
        </div>
      )}

      {showSaveToast && (
        <div className={`docket-save-toast ${saveToastMessage.includes('Please fill') ? 'error' : 'success'}`}>
          <div className="docket-save-toast-icon">
            {saveToastMessage.includes('Please fill') ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
                <path d="M12 8V12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1" fill="white" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span>{saveToastMessage}</span>
        </div>
      )}

    </div>
  );
};

export default Docket;