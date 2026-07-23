import React, {useState,useEffect,useMemo,useRef,useCallback} from "react";

import { useParams } from "react-router-dom";

import "../styles/design.css";



// ─── Constants ────────────────────────────────────────────────────────────────
const API       = import.meta.env.VITE_BACKEND_URL;
const TOKEN     = () => localStorage.getItem('token');
const AUTH      = () => ({ Authorization: `Bearer ${TOKEN()}` });
const JSON_AUTH = () => ({ 'Content-Type': 'application/json', ...AUTH() });



function handleUnauthorized(res) {
  if (res.status === 401) { localStorage.clear(); window.location.href = '/'; return true; }
  return false;
}



// ─── Date Formatting Function ────────────────────────────────────────────────────────────────
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




// ─── Detail Panel (Labels) ───────────────────────────────────────────────────────
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






export default function Design() {

  const { docketId } = useParams();
  console.log("Design docketId:", docketId);

  // ─── Information ────────────────────────────────────────────────────────────────
const [mode, setMode] = useState("");
const [subMode, setSubMode] = useState("");

const [mediaType, setMediaType] = useState("");
const [subType, setSubType] = useState("");

const [mediaTypes, setMediaTypes] = useState([]);
const [subTypes, setSubTypes] = useState([]);

const [docketTitle, setDocketTitle] = useState("");
const [executeDescription, setExecuteDescription] = useState("");
const [visualElements, setVisualElements] = useState("");
const [uploadedDateTime, setUploadedDateTime] = useState(null);


  // ─── Basic Panel ────────────────────────────────────────────────────────────────
const [summary, setSummary] = useState("");

// ─── Detail Panel ────────────────────────────────────────────────────────────────
const [mandatoryFields, setMandatoryFields] = useState([]);
const [optionalFields, setOptionalFields] = useState([]);
const [fieldValues, setFieldValues] = useState({});

const [showModal, setShowModal] = useState(false);
const [modalBoxType, setModalBoxType] = useState("optional");

const [newFieldLabel, setNewFieldLabel] = useState("");
const [newFieldValue, setNewFieldValue] = useState("");

const [expandField, setExpandField] = useState(null);


const fileInputRef = useRef(null);


// ─── Products ────────────────────────────────────────────────────────────────
const [productList, setProductList] = useState([]);

const [selectedProductId, setSelectedProductId] = useState("");

const [selectedProductData, setSelectedProductData] = useState(null);


// ─── Persona ────────────────────────────────────────────────────────────────
const [personaList, setPersonaList] = useState([]);

const [selectedPersonaId, setSelectedPersonaId] = useState("");

const [selectedPersonaData, setSelectedPersonaData] = useState(null);



// ─── Stages ────────────────────────────────────────────────────────────────
const [currentStage, setCurrentStage] = useState("");

const [selectedStage, setSelectedStage] = useState("");

const [nextStages, setNextStages] = useState([]);


// ─── Owner ────────────────────────────────────────────────────────────────
const [isCurrentOwner, setIsCurrentOwner] = useState(true);



// ─── Images ────────────────────────────────────────────────────────────────
const [selectedLogo, setSelectedLogo] = useState(null);

const [selectedProductImage, setSelectedProductImage] = useState(null);

const [previewProductImage, setPreviewProductImage] = useState(null);

const [visualImage, setVisualImage] = useState(null);

const [visualMessage, setVisualMessage] = useState("");


// ─── Business ────────────────────────────────────────────────────────────────
const [businessProfile, setBusinessProfile] = useState(null);

const [categories, setCategories] = useState([]);

// ─── Occasion ────────────────────────────────────────────────────────────────
const [occasionList, setOccasionList] = useState([]);


// ─────────────────────────────────────────────
// Designer Feedback States
// ─────────────────────────────────────────────



const [feedbackText, setFeedbackText] = useState("");



const [adminMediaId, setAdminMediaId] = useState(null);

const [feedbackList, setFeedbackList] = useState([]);

const [docketFeedbackList, setDocketFeedbackList] = useState([]);


const [showFeedbackModal, setShowFeedbackModal] = useState(false);

const feedbackBottomRef = useRef(null);

const feedbackContainerRef = useRef(null);


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



// ─── Functions ────────────────────────────────────────────────────────────────

const formattedDateTime = useMemo(() => {
    if (!uploadedDateTime) return '';
    const d = new Date(uploadedDateTime);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  }, [uploadedDateTime]);




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







  const handleSave = async (section) => {

    const sourceFields =
        section === "mandatory"
            ? mandatoryFields
            : optionalFields;

    const fieldsToSave = sourceFields.reduce((acc, field) => {

        const fd = fieldValues[field.variable_name];

        if (!fd) return acc;

        acc.push({
            label: field.label,
            value: fd.value ?? "",
            checkbox_clicked: fd.enabled ? 1 : 0,
            box: section,
            field_source: field.isCustom ? "custom" : "default"
        });

        return acc;

    }, []);

    try {

        const res = await fetch(
            `${API}/planner/docket/${docketId}/fields`,
            {
                method: "POST",
                headers: JSON_AUTH(),
                body: JSON.stringify({
                    fields: fieldsToSave
                })
            }
        );

        const data = await res.json();

        return data.success;

    } catch (err) {

        console.error(err);

        return false;

    }

};



const handleFullSave = useCallback(async () => {

    await fetch(
        `${API}/planner/docket/${docketId}`,
        {
            method: "PUT",
            headers: JSON_AUTH(),
            body: JSON.stringify({
                title: docketTitle,
                execute_description: executeDescription,
                visual_elements: visualElements,
                summary
            })
        }
    );

    const [ms, os] = await Promise.all([
        handleSave("mandatory"),
        handleSave("optional")
    ]);

    if (!ms || !os) {
        alert("Please fill all required fields.");
        return;
    }

    alert("Saved Successfully");

}, [
    mandatoryFields,
    optionalFields,
    fieldValues,
    docketId,
    docketTitle,
    executeDescription,
    visualElements,
    summary
]);



// ───Interaction Panel (FeedBack)  ────────────────────────────────────────────────────────────────


const groupedFeedback = useMemo(() => {
    const grouped = {};
    docketFeedbackList.forEach(item => {
      if (!grouped[item.admin_media_id]) grouped[item.admin_media_id] = [];
      grouped[item.admin_media_id].push(item);
    });
    return Object.entries(grouped).map(([mediaId, messages]) => ({ admin_media_id: mediaId, messages }));
  }, [docketFeedbackList]);


const imageMap = useMemo(() => {
    const map = {};
    docketFeedbackList.forEach(item => { if (item.image_url) map[item.admin_media_id] = item.image_url; });
    return map;
  }, [docketFeedbackList]);




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




// ─── Detail Panel (Labels) ────────────────────────────────────────────────────────────────

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
      if (!currentStage) return;
      fetch(`${API}/process-stages/${currentStage}`, { headers: AUTH() })
        .then(r => r.json())
        .then(data => { if (data.success) setNextStages(data.data); })
        .catch(console.error);
    }, [currentStage]);




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

  }, [docketId]);




  useEffect(() => {
  if (!docketId) return;

  loadFeedback();
  loadDocketFeedback();

}, [docketId, loadFeedback, loadDocketFeedback]);




// ==========================================================================
//  Detail (Labels)
// ==========================================================================

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

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────

  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);


  const [activePanel, setActivePanel] = useState({
    topic: false,
    ai: false,
    basic: false,
    detail: false,
    interactive: false,
    stage: false,
  });

  const [layout, setLayout] = useState("50");



  // ─────────────────────────────────────────────
  // Functions
  // ─────────────────────────────────────────────
  const showPanel = (panel) => {
    setActivePanel(prev => ({
      ...prev,
      [panel]: !prev[panel],
    }));
  };

  const panelStyle = (panel) => ({
    display: activePanel[panel] ? "flex" : "none",
    
  });


  return (

    <div className="design">

      {/* ───────────── Carousel ─────────────
      1-group(main 2 btns in the grid of 2/1, the first button will enable ai and  basic and everything else in disable state)
        second button will enable topic ai basic detail and everything else disable

      2-singular ( 6buttons) {in the grid of 2/3}
      3-carousel-bar
      4-output ratio(2 button 33% and 50%) */}
      

      {/* ───────────── Left Right Panel ───────────── */}
      <div className={`below-panel layout-${layout}`}>


        <div className="left-panel">


          <div className="carousel-panel">

            <div className="group-btn">

              <button
                className="group-toggle-btn"
                title="enable-ai-basic-btn"
              >X</button>

              <button
                className="group-toggle-btn"
                title="enable-topic-ai-btn"
              >Y</button>

            </div>


            <div className="singular-btn">

            <button
                className="icon-btn singular-toggle-btn"
                title="topic-toggle-btn"
                onClick={() => showPanel("topic")}
              >
                <img
                    src="/all_svg_icons/design_topic.svg"
                    alt="Topic"
                    className="button-svg-icon"
                />
              
              </button>

              <button
                className="icon-btn singular-toggle-btn"
                title="ai-toggle-btn"
                onClick={() => showPanel("ai")}
              >
                <img
                    src="/all_svg_icons/design_ai.svg"
                    alt="AI"
                    className="button-svg-icon"
                />
              
              </button>

              <button
                className="icon-btn singular-toggle-btn"
                title="basic-toggle-btn"
                onClick={() => showPanel("basic")}
              >
                <img
                    src="/all_svg_icons/design_basic.svg"
                    alt="Basic"
                    className="button-svg-icon"
                />
              
              </button>

              <button
                className="icon-btn singular-toggle-btn"
                title="detail-toggle-btn"
                onClick={() => showPanel("detail")}
              >
                <img
                    src="/all_svg_icons/design_detail.svg"
                    alt="Detail"
                    className="button-svg-icon"
                />
              </button>

              <button
                className="icon-btn singular-toggle-btn"
                title="interactive-toggle-btn"
                onClick={() => showPanel("interactive")}
              >
                <img
                    src="/all_svg_icons/design_interaction.svg"
                    alt="Interacion"
                    className="button-svg-icon"
                />
              </button>

            </div>




            <div className="output-ratio-btn">

              <button
                className="output-toggle-ratio-btn"
                title="33-percent-btn"
                onClick={() => setLayout("33")}
              >33%</button>

              <button
                className="output-toggle-ratio-btn"
                title="50-percent-btn"
                onClick={() => setLayout("50")}
              >50%</button>

            </div>



          </div>


            <div className="panels-row">

                <div
                    className="topic-panel"
                    style={panelStyle("topic")}
                >

                    {/* Entire Topic Panel Content */}
                    <div className="topic-card">

                  <div className="topic-card-header">

                      <h3>Execute Information</h3>

                  </div>

                  <div className="topic-card-body">

                      <div className="topic-card-grid">

                          <label>Topic</label>

                          <input
                              type="text"
                              value={docketTitle || ""}
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

                  <div className="topic-card-footer">

                      <button
                          className="topic-card-save-btn"
                          onClick={handleFullSave}
                          disabled={!isCurrentOwner}
                      >
                          Save
                      </button>

                  </div>

              </div>

                </div>

                <div className="ai-panel" style={panelStyle("ai")}>AI</div>

                <div
                    className="basic-panel"
                    style={panelStyle("basic")}
                >

                    <div className="basic-card">

                        <div className="basic-header">
                            <h3>Basic Information</h3>
                        </div>

                        <div className="basic-body">

                            <div className="basic-field">
                                <label>Title</label>

                                <input
                                    type="text"
                                    value={docketTitle}
                                    onChange={(e)=>setDocketTitle(e.target.value)}
                                    disabled={!isCurrentOwner}
                                />
                            </div>

                            <div className="basic-field">

                                <label>Description</label>

                                <textarea
                                    rows={5}
                                    value={executeDescription}
                                    onChange={(e)=>setExecuteDescription(e.target.value)}
                                    disabled={!isCurrentOwner}
                                />

                            </div>

                            <div className="basic-field">

                                <label>Visual Elements</label>

                                <textarea
                                    rows={5}
                                    value={visualElements}
                                    onChange={(e)=>setVisualElements(e.target.value)}
                                    disabled={!isCurrentOwner}
                                />

                            </div>

                            <div className="basic-field">

                                <label>Summary</label>

                                <textarea
                                    rows={4}
                                    value={summary}
                                    onChange={(e)=>setSummary(e.target.value)}
                                    disabled={!isCurrentOwner}
                                />

                            </div>

                        </div>

                        <div className="basic-footer">

                            <button
                                className="basic-save-btn"
                                onClick={handleFullSave}
                                disabled={!isCurrentOwner}
                            >
                                Save Changes
                            </button>

                        </div>

                    </div>

                </div>

                


                <div
                    className="detail-panel"
                    style={panelStyle("detail")}
                >

                    <div className="detail-card">

                        <div className="detail-header">
                            <h3>Labels</h3>
                        </div>

                        <div className="detail-body">

                            {/* LABELS WILL COME HERE */}
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

                        <div className="detail-footer">

                            <button
                                className="detail-save-btn"
                                onClick={handleFullSave}
                                disabled={!isCurrentOwner}
                            >
                                Save
                            </button>

                        </div>

                    </div>

                </div>

                <div className="interactive-panel" 
                style={panelStyle("interactive")}>
      
            <div className="dm-chat-panel">
              <div className="dm-chat-label">
                
                 Designer Feedback
                 </div>
                 
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
                      
                    </button>

                  </div>

                </div>
              </div>
            </div>
          
                  
                  </div>


            </div>


        </div>

        <div className="design-right-panel">

          <div className="generate-btn">

            <button className="generate-control-btn">Generate</button>
            <button className="generate-control-btn">Pro</button>
            <button className="generate-control-btn">Advance</button>
          </div>
          

          <div className="generated-panel">

            <div className="refrence-visual-panel">
              logo images + product images

            </div>


            <div className="generated-visual-panel">
              <button className="icon-btn generated-history-btn">
                  <img
                      src="/all_svg_icons/design_history.svg"
                      alt="History"
                      className="button-svg-icon"
                  />
              </button>

              

              Genrated Visual


              <button className="icon-btn generated-zoom-btn">
                  <img
                      src="/all_svg_icons/design_image_zoom.svg"
                      alt="Zoom"
                      className="button-svg-icon"
                  />
              </button>

              <button className="icon-btn generated-download-btn">
                  <img
                      src="/all_svg_icons/design_download.svg"
                      alt="Download"
                      className="button-svg-icon"
                  />
              </button>

            </div>




          </div>


          <div className="message-panel">Messages

            <button className="icon-btn message-copy-btn">
                  <img
                      src="/all_svg_icons/design_text_copy.svg"
                      alt="Copy"
                      className="button-svg-icon"
                  />
            </button>

            <button className="icon-btn message-zoom-btn">
                  <img
                      src="/all_svg_icons/design_text_zoom.svg"
                      alt="Zoom"
                      className="button-svg-icon"
                  />
            </button>

          </div>


          <div className="controls">

            <div className="dropdown">

                <button
                    className="generate-control-btn"
                    onClick={() => setShowStageDropdown(!showStageDropdown)}
                >
                    Stages
                </button>

                {showStageDropdown && (
                    <div className="dropdown-menu">
                        Test 1
                    </div>
                )}

            </div>

            <div className="dropdown">

                <button
                    className="generate-control-btn"
                    onClick={() => setShowNameDropdown(!showNameDropdown)}
                >
                    Names
                </button>

                {showNameDropdown && (
                    <div className="dropdown-menu">
                        Test
                    </div>
                )}

            </div>



            <button className="generate-control-btn">
                Submit
            </button>

        </div>


        </div>

    </div>


    {/* ════════ FEEDBACK MODAL ═══════════════════════════════════════════════ */}
      {showFeedbackModal && (
        <div className="dm-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="dm-modal dm-modal--feedback" onClick={e => e.stopPropagation()}>
            <div className="dm-modal-header">
              <h3>Feedback</h3>
              <button
                    className="dm-modal-close"
                    onClick={() => setShowFeedbackModal(false)}
                >
                    Close
                </button>
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
                 Send
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );
}