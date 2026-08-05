import React, {useState,useEffect,useMemo,useRef,useCallback} from "react";

import { useParams, useOutletContext } from "react-router-dom";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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



// ─── Date & Time Formatting Function ─────────────────────────
const formatDate = (date) => {
    if (!date) return null;

    const d = date instanceof Date
        ? date
        : new Date(date);

    const year = d.getFullYear();

    const month = String(
        d.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        d.getDate()
    ).padStart(2, "0");

    const hours = String(
        d.getHours()
    ).padStart(2, "0");

    const minutes = String(
        d.getMinutes()
    ).padStart(2, "0");

    const seconds = String(
        d.getSeconds()
    ).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};



// ─── Utility ──────────────────────────────────────────────────────────────────
function resizeTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';
  const newH = Math.min(el.scrollHeight, TEXTAREA_MAX_H);
  el.style.height = `${newH}px`;
  el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_H ? 'auto' : 'hidden';
}




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
      <label className="docket-field-label-text">{field.label}</label>
      {field.isCustom && (
        <button className="docket-delete-btn" onClick={() => handleDeleteCustomField(field)}>×</button>
      )}
    </div>
    <AutoTextarea value={fieldData?.value ?? ''} onChange={val => onValueChange(field.variable_name, val)} />
  </div>
));

// ─── AI Chat Bubble ──────────────────────────────────────────────────────────
const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
  </svg>
);
// ─── Generated Visual Panel icons ───────────────────────────────────────────
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#1f2937" strokeWidth="3"/>
    <path d="M12 7V12L15 15" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);
const ExpandIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 12L19 5M19 5H14M19 5V10" stroke="#1a2744" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12L5 19M5 19H10M5 19V14" stroke="#1a2744" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 3v13M7 11l5 5 5-5M3 18h18" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M15 5L5 15M5 5L15 15" stroke="#1a2744" strokeWidth="3" strokeLinecap="round"/>
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
async function downloadImage(url, docketId) {
  const parts = url.split(/[?#]/)[0].split("/");
  const rawName = parts[parts.length - 1] || `execute-${docketId}`;
  const fileName = /\.[a-z]{2,5}$/i.test(rawName) ? rawName : `${rawName}.png`;
  const triggerDownload = (href, download = fileName) => {
    const a = document.createElement("a");
    a.href = href; a.download = download; a.style.display = "none";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const objectUrl = URL.createObjectURL(await res.blob());
    triggerDownload(objectUrl);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    return;
  } catch (err) { console.error("Blob download failed", err); }
  try {
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          const objectUrl = URL.createObjectURL(blob);
          triggerDownload(objectUrl);
          setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
          resolve();
        }, "image/png");
      };
      img.onerror = reject;
      img.src = `${url}${url.includes("?") ? "&" : "?"}_t=${Date.now()}`;
    });
    return;
  } catch (err) { console.error("Canvas download failed", err); }
  window.open(url, "_blank");
}
const Bubble = React.memo(({ bubble }) => (
  <div className={`docket-bubble-wrapper ${bubble.sender === 'user' ? 'user-message' : 'ai-message'}`}>
    <div className="docket-bubble">
      {bubble.isLoading
        ? <div className="docket-bubble-loading"><span/><span/><span/></div>
        : bubble.text}
    </div>
  </div>
));
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






export default function Design() {

  const { docketId } = useParams();
  
  console.log("Design docketId:", docketId);


  const {
      activePanel,
      setActivePanel
  } = useOutletContext();

  // ─── Information ────────────────────────────────────────────────────────────────
const [mode, setMode] = useState("");
const [subMode, setSubMode] = useState("");

const [mediaType, setMediaType] = useState("");
const [subType, setSubType] = useState("");

const [mediaTypes, setMediaTypes] = useState([]);
const [subTypes, setSubTypes] = useState([]);

const [docketTitle, setDocketTitle] = useState("");
const [topic, setTopic] = useState("");

const [selectedOccasionId, setSelectedOccasionId] = useState("");
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


// ─── Network / Assignment ───────────────────────────────────────────────────
const [networkUsers, setNetworkUsers] = useState([]);

const [assignedUser, setAssignedUser] = useState("");


// ─── Submit / Save Toast ────────────────────────────────────────────────────
const [showSaveToast, setShowSaveToast] = useState(false);

const [saveToastMessage, setSaveToastMessage] = useState("");


// ─── Owner ────────────────────────────────────────────────────────────────
const [isCurrentOwner, setIsCurrentOwner] = useState(true);



// ─── Images ────────────────────────────────────────────────────────────────
const [selectedLogo, setSelectedLogo] = useState(null);

const [selectedProductImage, setSelectedProductImage] = useState(null);

const [previewProductImage, setPreviewProductImage] = useState(null);

const [visualImage, setVisualImage] = useState(null);

const [visualMessage, setVisualMessage] = useState("");

const [isEditMode, setIsEditMode] = useState(false);

const [showCopyToast, setShowCopyToast] = useState(false);


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

const layoutDropdownRef = useRef(null);


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

// ── AI Chatbot: generate/validation state (used by the AI panel only) ───────
const [canGenerate, setCanGenerate] = useState(false);
const [generatedPrompt, setGeneratedPrompt] = useState('');
const [isGeneratingImage, setIsGeneratingImage] = useState(false);

// ── Generated Visual Panel state (image, zoom, history) ─────────────────────
const [showImagePreview, setShowImagePreview] = useState(false);
const [showHistoryModal, setShowHistoryModal] = useState(false);
const [visualHistoryList, setVisualHistoryList] = useState([]);
const [historyPreview, setHistoryPreview] = useState(null); // { url, message, version, time }

const finalPersonaData = useMemo(() => buildStructuredPersona(selectedPersonaData), [selectedPersonaData]);



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

    const payload = {
    title: docketTitle,

    product_id: selectedProductId || null,

    persona_id: selectedPersonaId || null,

    occasion_id: selectedOccasionId || null,

    uploaded_date_time: formatDate(uploadedDateTime),

    execute_description: executeDescription,

    visual_elements: visualElements,

    summary
};

console.log(payload);

const res = await fetch(
    `${API}/planner/docket/${docketId}`,
    {
        method: "PUT",
        headers: JSON_AUTH(),
        body: JSON.stringify(payload)
    }
);

const data = await res.json();

console.log(data);

if (!data.success) {
    alert(JSON.stringify(data.detail, null, 2));
    return;
}



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
    selectedProductId,
    selectedPersonaId,
    selectedOccasionId,
    uploadedDateTime,

    executeDescription,
    visualElements,
    summary
]);



const handleSubmit = useCallback(async () => {

    const [ms, os] = await Promise.all([
        handleSave("mandatory"),
        handleSave("optional")
    ]);

    if (!ms || !os) {
        setSaveToastMessage("Please fill all required fields.");
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 3000);
        return;
    }

    if (assignedUser || selectedStage) {
        await fetch(`${API}/execute/assign`, {
            method: "POST",
            headers: JSON_AUTH(),
            body: JSON.stringify({
                docket_id: Number(docketId),
                user_id: assignedUser,
                stage: selectedStage
            })
        });
    }

    setSaveToastMessage("Submitted successfully!");
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);

    setShowStageDropdown(false);
    setShowNameDropdown(false);

}, [
    mandatoryFields,
    optionalFields,
    fieldValues,
    assignedUser,
    selectedStage,
    docketId
]);



// ───AI Panel (Chatbot)  ────────────────────────────────────────────────────────────────

const refreshStage = async () => {
    try {
        const res = await fetch(`${API}/execute/current-stage/${docketId}`, { headers: AUTH() });
        const data = await res.json();
        if (data.success) setCurrentStage(data.stage);
    } catch (err) {
        console.error(err);
    }
};

const handleOpenVisualHistory = useCallback(async () => {
    try {
        const res = await fetch(`${API}/admin/docket/${docketId}`, { headers: AUTH() });
        const data = await res.json();
        if (data.success) { setVisualHistoryList(data.data.visual_history ?? []); setShowHistoryModal(true); }
    } catch (err) { console.error(err); }
}, [docketId]);

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
            setSummary(data.summary || "");
            setConversationBubbles(prev => [...prev, { id: Date.now() + 1, text: '✅ Fields updated based on your request.', type: 'ai', sender: 'ai' }]);
        } else {
            setConversationBubbles(prev => [...prev, { id: Date.now() + 1, text: '⚠️ AI could not generate field values.', type: 'ai', sender: 'ai' }]);
        }
    } catch {
        setConversationBubbles(prev => [...prev.filter(b => b.id !== loadingId), { id: Date.now() + 1, text: '⚠️ AI server not reachable.', type: 'ai', sender: 'ai' }]);
    }
}, [userMessage, mandatoryFields, optionalFields, mode, mediaType, subType, businessProfile, selectedProductData, finalPersonaData, docketId, docketTitle, executeDescription, visualElements, summary]);


const handlePro = useCallback(async () => {

    if (!docketId) return;

    try {

        const res = await fetch(
            `${API}/execute/assign-pro/${docketId}`,
            {
                method: "POST",
                headers: JSON_AUTH()
            }
        );

        if (handleUnauthorized(res)) return;

        const data = await res.json();

        if (!res.ok || !data.success) {

            console.error("Pro assignment failed:", data);

            setSaveToastMessage(
                data.detail || "Failed to assign Pro user."
            );

            setShowSaveToast(true);

            setTimeout(
                () => setShowSaveToast(false),
                3000
            );

            return;
        }

        console.log(
            "Pro user assigned:",
            data
        );

        // Update frontend owner state
        setAssignedUser(
            String(data.assigned_user_id)
        );

        setSaveToastMessage(
            `Assigned to Pro user: ${data.assigned_user_email}`
        );

        setShowSaveToast(true);

        setTimeout(
            () => setShowSaveToast(false),
            3000
        );

    } catch (err) {

        console.error(
            "Pro assignment error:",
            err
        );

        setSaveToastMessage(
            "Unable to assign Pro user."
        );

        setShowSaveToast(true);

        setTimeout(
            () => setShowSaveToast(false),
            3000
        );
    }

}, [docketId]);


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

        await fetch(`${API}/execute/assign`, {
            method: "POST",
            headers: JSON_AUTH(),
            body: JSON.stringify({ docket_id: Number(docketId), user_id: 0, stage: "generate" })
        });

        await refreshStage();

        const res = await fetch(`${API}/planner/docket/${docketId}/media-result`, {
            method: 'POST', headers: JSON_AUTH(),
            body: JSON.stringify({
                visual_text: JSON.stringify(finalOutput),
                submitted_request: submittedRequest,
                selected_logo: selectedLogo,
                selected_product_image: selectedProductImage
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
        }
    } catch (err) { setIsGeneratingImage(false); console.error(err); }
}, [mode, mediaType, subType, businessProfile, finalPersonaData, selectedProductData, selectedProductImage, selectedLogo, fieldValues, docketId, mandatoryFields, optionalFields]);



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


  // ─── Message Panel ───────────────────────────────────────────────────────
  const handleSaveVisualMessage = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/docket/${docketId}/message`, {
        method: "POST",
        headers: JSON_AUTH(),
        body: JSON.stringify({ message: visualMessage })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditMode(false);
      }
    } catch (err) {
      console.error(err);
    }
  }, [docketId, visualMessage]);

  const handleCopyMessage = useCallback(() => {
    navigator.clipboard.writeText(visualMessage || '');
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  }, [visualMessage]);

  const handleZoomMessage = useCallback(() => {
    setExpandField({ label: 'Message', value: visualMessage, onChange: setVisualMessage });
  }, [visualMessage]);



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






  // ── AI Chatbot: Generate button becomes active once mode/mediaType/subType are set ──
  useEffect(() => { setCanGenerate(Boolean(mode && mediaType && subType)); }, [mode, mediaType, subType]);

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

          console.log("Planner Response:", d);
          console.log("occasion_title =", d.occasion_title);
          console.log("Keys =", Object.keys(d));

          setDocketTitle(d.title);
          setTopic(d.occasion_title || "");
          setSelectedOccasionId(d.occasion_id || "");
          setSelectedProductId(d.product_id || "");
          setSelectedPersonaId(d.persona_id || "");

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


  const [layout, setLayout] = useState("50");

  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);



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


  const loadOverviewLayout = () => {

    const alreadyOpen =
        activePanel.topic &&
        activePanel.ai &&
        !activePanel.basic;

    if (alreadyOpen) {

        setActivePanel({
            topic: false,
            ai: false,
            basic: false,
            detail: false,
            summary: false,
            interactive: false,
            stage: false,
        });

    } else {

        setActivePanel({
            topic: true,
            ai: true,
            basic: false,
            detail: false,
            summary: false,
            interactive: false,
            stage: false,
        });

    }
};

const loadPlannerLayout = () => {

    const alreadyOpen =
        activePanel.topic &&
        activePanel.ai &&
        activePanel.basic;

    if (alreadyOpen) {

        setActivePanel({
            topic: false,
            ai: false,
            basic: false,
            detail: false,
            summary: false,
            interactive: false,
            stage: false,
        });

    } else {

        setActivePanel({
            topic: true,
            ai: true,
            basic: true,
            detail: false,
            summary: false,
            interactive: false,
            stage: false,
        });

    }
};

useEffect(() => {

    function handleOutsideClick(event){

        if(
            layoutDropdownRef.current &&
            !layoutDropdownRef.current.contains(event.target)
        ){

            setShowLayoutDropdown(false);

        }

    }

    document.addEventListener("mousedown",handleOutsideClick);

    return ()=>{

        document.removeEventListener(
            "mousedown",
            handleOutsideClick
        );

    };

},[]);




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

            <div 
            className="group-btn"
            ref={layoutDropdownRef}
            >

            <button
              className="layout-dropdown-btn"
              onClick={() => setShowLayoutDropdown(prev => !prev)}
            >
              <img
                    src="/all_svg_icons/design_layout.svg"
                    alt="Layout"
                    className="button-svg-icon"
                />
                Layouts

              <img
                    src="/all_svg_icons/design_dropdown_arrow.svg"
                    alt="Dropdown Arrow"
                    className="button-svg-icon"
                />
            </button>

            {showLayoutDropdown && (

              <div className="layout-dropdown-menu">

                  <div className="layout-dropdown-title">
                      READY-MADE COMBOS
                  </div>

                  <div className="layout-cards">

                      <button
                          className="layout-card"
                          onClick={loadOverviewLayout}
                      >

                          <img
                              src="/all_svg_icons/design_overview_layout.svg"
                              className="layout-card-image"
                          />

                          <div className="layout-card-title">
                              Overview
                          </div>

                          <div className="layout-card-icons">

                              <img
                                  src="/all_svg_icons/design_topic.svg"
                                  className="layout-mini-icon"
                              />

                              <img
                                  src="/all_svg_icons/design_ai.svg"
                                  className="layout-mini-icon"
                              />

                          </div>

                      </button>

                      <button
                          className="layout-card"
                          onClick={loadPlannerLayout}
                      >

                          <img
                              src="/all_svg_icons/design_planner_layout.svg"
                              className="layout-card-image"
                          />

                          <div className="layout-card-title">
                              Planner
                          </div>

                          <div className="layout-card-icons">

                              <img
                                  src="/all_svg_icons/design_topic.svg"
                                  className="layout-mini-icon"
                              />

                              <img
                                  src="/all_svg_icons/design_ai.svg"
                                  className="layout-mini-icon"
                              />

                              <img
                                  src="/all_svg_icons/design_basic.svg"
                                  className="layout-mini-icon"
                              />

                          </div>

                      </button>

                  </div>

              </div>

              )}

          </div>


            <div className="singular-btn">

            {/* 1. Settings */}
<button
    className={`icon-btn singular-toggle-btn ${
        activePanel.basic ? "active" : ""
    }`}
    title="basic-toggle-btn"
    onClick={() => showPanel("basic")}
>
    <img
        src="/all_svg_icons/design_basic.svg"
        alt="Basic"
        className="button-svg-icon"
    />
</button>


{/* 2. Information */}
<button
    className={`icon-btn singular-toggle-btn ${
        activePanel.topic ? "active" : ""
    }`}
    title="topic-toggle-btn"
    onClick={() => showPanel("topic")}
>
    <img
        src="/all_svg_icons/design_topic.svg"
        alt="Topic"
        className="button-svg-icon"
    />
</button>


{/* 3. AI */}
<button
    className={`icon-btn singular-toggle-btn ${
        activePanel.ai ? "active" : ""
    }`}
    title="ai-toggle-btn"
    onClick={() => showPanel("ai")}
>
    <img
        src="/all_svg_icons/design_ai.svg"
        alt="AI"
        className="button-svg-icon"
    />
</button>


{/* 4. Advance */}
<button
    className={`icon-btn singular-toggle-btn ${
        activePanel.detail ? "active" : ""
    }`}
    title="detail-toggle-btn"
    onClick={() => showPanel("detail")}
>
    <img
        src="/all_svg_icons/design_detail.svg"
        alt="Detail"
        className="button-svg-icon"
    />
</button>


{/* 5. Summary */}
<button
    className={`icon-btn singular-toggle-btn ${
        activePanel.summary ? "active" : ""
    }`}
    title="summary-toggle-btn"
    onClick={() => showPanel("summary")}
>
    <img
        src="/all_svg_icons/design_summary.svg"
        alt="Summary"
        className="button-svg-icon"
    />
</button>


{/* 6. Interaction */}
<button
    className={`icon-btn singular-toggle-btn ${
        activePanel.interactive ? "active" : ""
    }`}
    title="interactive-toggle-btn"
    onClick={() => showPanel("interactive")}
>
    <img
        src="/all_svg_icons/design_interaction.svg"
        alt="Interaction"
        className="button-svg-icon"
    />
</button>
            </div>




            <div className="output-ratio-btn">

              <button
                className="output-toggle-ratio-btn"
                title="33-percent-btn"
                onClick={() => setLayout("33")}
              >
                <img
                    src="/all_svg_icons/design_33_layout.svg"
                    alt="33% Layout"
                    className="button-svg-icon"
                />
                33%</button>

              <button
                className="output-toggle-ratio-btn"
                title="50-percent-btn"
                onClick={() => setLayout("50")}
              ><img
                    src="/all_svg_icons/design_50_layout.svg"
                    alt="50% Layout"
                    className="button-svg-icon"
                />
                50%</button>

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

                      <h3>Settings</h3>

                  </div>

                  <div className="topic-card-body">

                      <div className="topic-card-grid">

                          <div className="topic-card-field">
                              <label>Title</label>

                              <input
                                    className="topic-field-input"
                                    value={docketTitle}
                                    onChange={(e)=>setDocketTitle(e.target.value)}
                                    disabled={!isCurrentOwner}
                                />
                          </div>

                          <div className="topic-card-field">
                              <label>Topic</label>

                              <select
                                className="topic-field-input"
                                value={selectedOccasionId}
                                onChange={(e)=>setSelectedOccasionId(e.target.value)}
                                disabled={!isCurrentOwner}
                            >
                                <option value="">Select Topic</option>

                                {occasionList.map(o=>(
                                    <option
                                        key={o.occasion_id}
                                        value={o.occasion_id}
                                    >
                                        {o.title}
                                    </option>
                                ))}
                            </select>

                          </div>

                          <div className="topic-card-field">
                            <label>Date</label>

                            <DatePicker
    selected={
        uploadedDateTime
            ? new Date(uploadedDateTime)
            : null
    }
    onChange={(date) => {
        setUploadedDateTime(date);
    }}
    showTimeSelect
    timeIntervals={15}
    dateFormat="MMM d, yyyy h:mm aa"
    timeFormat="hh:mm aa"
    timeCaption="Time"
    popperPlacement="bottom-start"
    popperProps={{ strategy: "fixed" }}
    placeholderText="Select date & time"
    className="topic-field-input"
    wrapperClassName="topic-datepicker-wrapper"
    disabled={!isCurrentOwner}
    onKeyDown={(e) => e.preventDefault()}
/>
                        </div>

                          <div className="topic-card-field">
                              <label>Stage</label>

                              <div className="topic-field-value" title={currentStage || ""}>
                                  {currentStage}
                              </div>
                          </div>

                          <div className="topic-card-field">
                              <label>Media</label>

                              <div className="topic-field-value" title={mediaType || ""}>
                                  {mediaType}
                              </div>
                          </div>

                          <div className="topic-card-field">
                              <label>Sub Type</label>

                              <div className="topic-field-value" title={subType || ""}>
                                  {subType}
                              </div>
                          </div>

                          <div className="topic-card-field">
                              <label>Product</label>

                              <select
                                  className="topic-field-input"
                                  value={selectedProductId}
                                  onChange={(e)=>setSelectedProductId(e.target.value)}
                                  disabled={!isCurrentOwner}
                              >
                                  {productList.map(product=>(
                                      <option
                                          key={product.product_id}
                                          value={product.product_id}
                                      >
                                          {product.product_name}
                                      </option>
                                  ))}
                              </select>
                          </div>

                          <div className="topic-card-field">
                              <label>Persona</label>

                              <select
                                  className="topic-field-input"
                                  value={selectedPersonaId}
                                  onChange={(e)=>setSelectedPersonaId(e.target.value)}
                                  disabled={!isCurrentOwner}
                              >
                                  {personaList.map(persona=>(
                                      <option
                                          key={persona.persona_id}
                                          value={persona.persona_id}
                                      >
                                          {persona.persona_name}
                                      </option>
                                  ))}
                              </select>
                          </div>

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

                <div
                    className="basic-panel"
                    style={panelStyle("basic")}
                >

                    <div className="basic-card">

                        <div className="basic-header">
                            <h3>Information</h3>
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
                                Save
                            </button>

                        </div>

                    </div>

                </div>
                    
                <div className="ai-panel" style={panelStyle("ai")}>



                  <div className="dm-chat-panel">

                    <div className="dm-chat-label"><SparkleIcon/>AI</div>

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

                            <img

                                src="/all_svg_icons/docket_send.svg"

                                alt="Filter"

                                className="button-svg-icon"

                            />

                          </button>



                        </div>



                        

                      </div>

                    </div>

                  </div>

                </div>

                  
                <div

                    className="detail-panel"

                    style={panelStyle("detail")}

                >



                    <div className="detail-card">



                        <div className="detail-header">

                            <h3>Advance</h3>

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

                                      <div className="docket-field-label-container">

                                          <label className="docket-field-label-text">
                                              {field.label}
                                          </label>

                                          {field.label_description && (
                                              <div className="docket-field-description">
                                                  {field.label_description}
                                              </div>
                                          )}

                                      </div>

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

                                            const style = window.getComputedStyle(el);

                                            const lineHeight = parseFloat(style.lineHeight);

                                            const padding =
                                                parseFloat(style.paddingTop) +
                                                parseFloat(style.paddingBottom);

                                            const maxHeight = lineHeight * 3 + padding;

                                            el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";

                                            el.style.overflowY =
                                                el.scrollHeight > maxHeight
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

                                            const style = window.getComputedStyle(el);

                                            const lineHeight = parseFloat(style.lineHeight);

                                            const padding =
                                                parseFloat(style.paddingTop) +
                                                parseFloat(style.paddingBottom);

                                            const maxHeight = lineHeight * 3 + padding;

                                            el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";

                                            el.style.overflowY =
                                                el.scrollHeight > maxHeight
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

                {/* ================= SUMMARY PANEL ================= */}

                <div
                    className="summary-panel"
                    style={panelStyle("summary")}
                >
                    <div className="summary-card">

                        <div className="summary-header">
                            <h3>Summary</h3>
                        </div>

                        <div className="summary-body">

                            <div className="summary-field">
                                <label>Summary</label>

                                <textarea
                                    rows={10}
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    disabled={!isCurrentOwner}
                                    placeholder="Enter summary..."
                                />
                            </div>

                        </div>

                        <div className="summary-footer">
                            <button
                                className="summary-save-btn"
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
                
                 Interaction
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

            <button
                className="generate-control-btn"
                onClick={isCurrentOwner && canGenerate && !isGeneratingImage ? handleGenerate : undefined}
                disabled={!isCurrentOwner || isGeneratingImage}
            >
              <img
                    src="/all_svg_icons/design_generate.svg"
                    alt="Generate"
                    className="button-svg-icon"
                />

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
            <button
                className="generate-control-btn"
                onClick={handlePro}
                disabled={!isCurrentOwner}
            >
                <img
                    src="/all_svg_icons/design_pro.svg"
                    alt="Pro"
                    className="button-svg-icon"
                />

                <img
                    src="/all_svg_icons/design_generate.svg"
                    alt="Generate"
                    className="button-svg-icon"
                />

                Pro
            </button>

            <button className="generate-control-btn">
              <img
                    src="/all_svg_icons/design_advance.svg"
                    alt="Advance"
                    className="button-svg-icon"
                />
              
              <img
                    src="/all_svg_icons/design_generate.svg"
                    alt="Generate"
                    className="button-svg-icon"
                />
                Advance
            </button>
          </div>
          

          <div className="generated-panel">

            <div className="refrence-visual-panel">
              <div className="dm-thumb-strip">

                {/* Fixed Logo */}
                <div className="dm-thumb-logo">
                  {selectedLogo
                    ? <img src={selectedLogo} alt="logo" />
                    : <div className="dm-thumb-empty-logo" />
                  }
                </div>

                {/* Scrollable Product Images */}
                <div className="dm-thumb-products">

                  {selectedProductData?.images?.length ? (
                    selectedProductData.images.map((img, index) => (
                      <div
                        key={index}
                        className={`dm-thumb-img${selectedProductImage === img.img_url ? ' dm-thumb-img--active' : ''}`}
                        onClick={() => setSelectedProductImage(img.img_url)}
                        onMouseEnter={() => setPreviewProductImage(img.img_url)}
                        onMouseLeave={() => setPreviewProductImage(null)}
                      >
                        <img src={img.img_url} alt={`Product ${index + 1}`} />

                        {selectedProductImage === img.img_url && (
                          <div className="dm-thumb-selected-dot" />
                        )}

                        {previewProductImage === img.img_url && (
                          <div className="dm-thumb-preview-popup">
                            <img src={img.img_url} alt="preview" />
                          </div>
                        )}
                      </div>
                    ))
                  ) : selectedProductImage ? (
                    <div className="dm-thumb-img dm-thumb-img--active">
                      <img src={selectedProductImage} alt="Product" />
                      <div className="dm-thumb-selected-dot" />
                    </div>
                  ) : null}

                </div>

                {/* Fixed Upload */}
                <label className="dm-thumb-upload">
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleProductImageUpload}
                  />
                  <span>+</span>
                </label>

              </div>
            </div>


            <div className="generated-visual-panel">
              <button className="icon-btn generated-history-btn" onClick={handleOpenVisualHistory} title="Visual history">
                  <img
                      src="/all_svg_icons/design_history.svg"
                      alt="History"
                      className="button-svg-icon"
                  />
              </button>

              {isGeneratingImage ? (
                <div className="dm-visual-loading">
                  <div className="dm-spinner"/>
                  <span>AI is generating your visual…</span>
                </div>
              ) : visualImage ? (
                <img src={visualImage} className="dm-visual-img" alt="Generated visual"/>
              ) : (
                <div className="dm-visual-empty">Genrated Visual</div>
              )}

              <button
                  className="icon-btn generated-zoom-btn"
                  title="Expand"
                  disabled={!visualImage}
                  onClick={() => visualImage && setShowImagePreview(true)}
              >
                  <img
                      src="/all_svg_icons/design_image_zoom.svg"
                      alt="Zoom"
                      className="button-svg-icon"
                  />
              </button>

              <button
                  className="icon-btn generated-download-btn"
                  title="Download"
                  disabled={!visualImage}
                  onClick={() => visualImage && downloadImage(visualImage, docketId)}
              >
                  <img
                      src="/all_svg_icons/design_download.svg"
                      alt="Download"
                      className="button-svg-icon"
                  />
              </button>

            </div>




          </div>


          <div className="message-panel">
            <div className="message-panel-content">
              {isEditMode
                ? (
                  <textarea
                    className="message-panel-textarea"
                    value={visualMessage}
                    disabled={!isCurrentOwner}
                    onChange={e => setVisualMessage(e.target.value)}
                  />
                )
                : (visualMessage || 'Messages')}
            </div>

            <button
                className="icon-btn message-copy-btn"
                title="Copy message"
                onClick={handleCopyMessage}
            >
                  <img
                      src="/all_svg_icons/design_text_copy.svg"
                      alt="Copy"
                      className="button-svg-icon"
                  />
            </button>

            <button
                className="icon-btn message-zoom-btn"
                title="Expand message"
                onClick={handleZoomMessage}
            >
                  <img
                      src="/all_svg_icons/design_text_zoom.svg"
                      alt="Zoom"
                      className="button-svg-icon"
                  />
            </button>

            {isEditMode ? (
              <button
                className="icon-btn message-edit-btn"
                title="Save message"
                onClick={handleSaveVisualMessage}
              >
                Save
              </button>
            ) : (
              <button
                className="icon-btn message-edit-btn"
                title="Edit message"
                disabled={!isCurrentOwner}
                onClick={() => isCurrentOwner && setIsEditMode(true)}
              >

                <img
                      src="/all_svg_icons/design_edit.svg"
                      alt="Edit"
                      className="button-svg-icon"
                  />
              </button>
            )}

          </div>


          <div className="controls">

            <div className="dropdown">

                <button
                    className="Bottom-control-btn"
                    onClick={() => { setShowStageDropdown(p => !p); setShowNameDropdown(false); }}
                >

                  <img
                  src="/all_svg_icons/design_stage.svg"
                  alt="Stage"
                  className="button-svg-icon"
                  />
                    Stages
                </button>

                {showStageDropdown && (
                    <div className="dropdown-menu">
                        <div className="dropdown-title">Select Stage</div>
                        <div className="dropdown-current">{currentStage} (current)</div>
                        {nextStages.map(stage => (
                            <div
                                key={stage}
                                className={`dropdown-item${selectedStage === stage ? ' dropdown-item--active' : ''}`}
                                onClick={() => { setSelectedStage(stage); setShowStageDropdown(false); }}
                            >
                                {stage}
                            </div>
                        ))}
                        {nextStages.length === 0 && (
                            <div className="dropdown-empty">No next stages available</div>
                        )}
                    </div>
                )}

            </div>

            <div className="dropdown">

                <button
                    className="Bottom-control-btn"
                    onClick={() => { setShowNameDropdown(p => !p); setShowStageDropdown(false); }}
                >
                  <img
                  src="/all_svg_icons/design_name.svg"
                  alt="Name"
                  className="button-svg-icon"
              />
                  
                    {assignedUser
                        ? (networkUsers.find(u => u.user_id === assignedUser)?.email?.split('@')[0] || 'Names')
                        : 'Names'}
                </button>

                {showNameDropdown && (
                    <div className="dropdown-menu">
                        <div className="dropdown-title">Assign To</div>
                        {networkUsers.length > 0 ? networkUsers.map(u => (
                            <div
                                key={u.user_id}
                                className={`dropdown-item${assignedUser === u.user_id ? ' dropdown-item--active' : ''}`}
                                onClick={() => { setAssignedUser(u.user_id); setShowNameDropdown(false); }}
                            >
                                {u.email}
                            </div>
                        )) : (
                            <div className="dropdown-empty">No users in network</div>
                        )}
                    </div>
                )}

            </div>



            <button
                className="Bottom-control-btn"
                onClick={handleSubmit}
                disabled={!isCurrentOwner}
            >
              <img
                  src="/all_svg_icons/design_submit.svg"
                  alt="Submit"
                  className="button-svg-icon"
              />
              
                Submit
            </button>

        </div>

        {(showStageDropdown || showNameDropdown) && (
            <div className="dropdown-backdrop" onClick={() => { setShowStageDropdown(false); setShowNameDropdown(false); }}/>
        )}


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

    {/* ════════ VISUAL HISTORY MODAL ═══════════════════════════════════════ */}
      {showHistoryModal && (
        <div className="dm-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="dm-modal dm-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="dm-modal-header">
              <h3>Visual Information History</h3>
              <button className="dm-modal-close" onClick={() => setShowHistoryModal(false)}><CloseIcon/></button>
            </div>
            <div className="dm-modal-body">
              {visualHistoryList.length > 0 ? (
                visualHistoryList.map((item, idx) => {
                  const versionNum = visualHistoryList.length - idx;
                  return (
                    <div key={item.admin_media_id} className="dm-history-item">
                      <strong>Version {versionNum}</strong>
                      <div className="dm-history-time">{new Date(item.created_at).toLocaleString()}</div>
                      <img
                        src={item.uploaded_url}
                        alt={`Version ${versionNum}`}
                        onClick={() => setHistoryPreview({
                          url: item.uploaded_url,
                          message: item.message,
                          version: versionNum,
                          time: item.created_at,
                        })}
                      />
                      {item.message && <div className="dm-history-item-message">{item.message}</div>}
                      <div className="dm-history-item-hint">Click image to view full message</div>
                    </div>
                  );
                })
              ) : (
                <div className="dm-empty">No visual history yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

    {/* ════════ VISUAL HISTORY VERSION PREVIEW (image + message) ═══════════ */}
      {historyPreview && (
        <div className="dm-overlay" onClick={() => setHistoryPreview(null)}>
          <div className="dm-modal dm-modal--preview" onClick={e => e.stopPropagation()}>
            <div className="dm-modal-header">
              <div className="dm-preview-header-text">
                <h3>Version {historyPreview.version}</h3>
                <span className="dm-preview-time">{new Date(historyPreview.time).toLocaleString()}</span>
              </div>
              <button className="dm-modal-close" onClick={() => setHistoryPreview(null)}><CloseIcon/></button>
            </div>

            <div className="dm-preview-image-wrap">
              <img src={historyPreview.url} alt={`Version ${historyPreview.version}`} className="dm-preview-image"/>
            </div>

            <div className="dm-preview-message">
              <div className="dm-preview-message-label">Message</div>
              <div className="dm-preview-message-text">
                {historyPreview.message
                  ? historyPreview.message
                  : <span className="dm-preview-message-empty">No message was left for this version.</span>}
              </div>
            </div>
          </div>
        </div>
      )}

    {/* ════════ IMAGE PREVIEW (ZOOM) MODAL ═════════════════════════════════ */}
      {showImagePreview && visualImage && (
        <div className="dm-image-preview-overlay" onClick={() => setShowImagePreview(false)}>
          <img src={visualImage} alt="Preview" className="dm-image-preview" onClick={(e) => e.stopPropagation()}/>
        </div>
      )}

    {/* ════════ MESSAGE EXPAND (ZOOM) MODAL ═════════════════════════════════ */}
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

    </div>

  );
}