import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import "../styles/docket.css";

const API = import.meta.env.VITE_BACKEND_URL;

export default function DocketMediaAdmin() {

  const { docketId } = useParams();
  const fileInputRef = useRef(null);

  // ───────────────── EXISTING STATE (UNCHANGED) ─────────────────
  const [showHistoryModal,setShowHistoryModal] = useState(false);
  const [selectedHistoryPrompt,setSelectedHistoryPrompt] = useState(null);

  const [docketTitle,setDocketTitle] = useState("");
  const [mode,setMode] = useState("");
  const [mediaType,setMediaType] = useState("");
  const [subType,setSubType] = useState("");

  const [product,setProduct] = useState(null);
  const [persona,setPersona] = useState(null);

  const [mandatoryFields,setMandatoryFields] = useState([]);
  const [optionalFields,setOptionalFields] = useState([]);

  const [history,setHistory] = useState([]);
  const [chatHistory,setChatHistory] = useState([]);

  const [uploading,setUploading] = useState(false);
  const [visualImage, setVisualImage] = useState(null);

  const [message,setMessage] = useState("");

  // ───────────────── NEW STATE (FEEDBACK SYSTEM) ─────────────────
  const [feedbackMap, setFeedbackMap] = useState({});
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState(null);

  // ───────────────── LOAD ALL ─────────────────
  useEffect(() => {
    loadAll();
  },[docketId]);

  async function loadAll(){

    const res = await fetch(`${API}/admin/docket/${docketId}`,{
      headers:{
        Authorization:`Bearer ${localStorage.getItem("access_token")}`
      }
    });

    const data = await res.json();
    if(!data.success) return;

    const d = data.data;

    setDocketTitle(d.title);
    setMode(d.media_name);
    setMediaType(d.media_type);
    setSubType(d.subtype_name);

    setProduct(d.product);
    setPersona(d.persona);

    setMandatoryFields(d.mandatory_fields || []);
    setOptionalFields(d.optional_fields || []);

    setHistory(d.visual_history || []);

    // fallback select
    if(d.visual_history?.length){
      setSelectedVersionId(d.visual_history[0].admin_media_id);
    }
    
    setChatHistory(d.chat_history || []);

    // 🔥 select latest version by default
    if(d.visual_history?.length){
      setSelectedVersionId(d.visual_history[0].admin_media_id);
    }

    // 🔥 load feedback
    loadFeedbackForAllVersions(d.visual_history || []);
  }

  // ───────────────── LOAD VISUAL ─────────────────
  useEffect(() => {

    async function loadVisual(){

      const res = await fetch(`${API}/planner/docket/${docketId}/visual`,{
        headers:{
          Authorization:`Bearer ${localStorage.getItem("access_token")}`
        }
      });

      const data = await res.json();

      if(data.success){
        setVisualImage(data.url);
      }

    }

    loadVisual();

  },[docketId]);

  // ───────────────── LOAD FEEDBACK ─────────────────
  async function loadFeedbackForAllVersions(versions){

    const temp = {};

    for(const v of versions){

      if(!v.admin_media_id) continue;

      try{
        const res = await fetch(`${API}/feedback/${v.admin_media_id}`,{
          headers:{
            Authorization:`Bearer ${localStorage.getItem("access_token")}`
          }
        });

        const data = await res.json();

        if(data.success){
          temp[v.admin_media_id] = data.data;
        }

      }catch(err){
        console.log(err);
      }
    }

    setFeedbackMap(temp);
  }

  // ───────────────── SEND FEEDBACK ─────────────────
  async function handleSendFeedback(){

    if(!feedbackText.trim() || !selectedVersionId) return;

    try{

      const res = await fetch(`${API}/feedback`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${localStorage.getItem("access_token")}`
        },
        body:JSON.stringify({
          docket_id:docketId,
          admin_media_id:selectedVersionId,
          feedback:feedbackText
        })
      });

      const data = await res.json();

      if(data.success){
        setFeedbackText("");
        loadFeedbackForAllVersions(history);
      }else{
        alert("Feedback failed");
      }

    }catch(err){
      console.log(err);
      alert("Server error");
    }
  }

  // ───────────────── UPLOAD (UNCHANGED) ─────────────────
  async function handleUpload(e){

    const file = e.target.files[0];
    if(!file) return;

    try{

      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API}/upload-image`,{
        method:"POST",
        headers:{
          Authorization:`Bearer ${localStorage.getItem("access_token")}`
        },
        body:formData
      });

      const data = await res.json();

      if(!data.success){
        alert("Upload failed");
        return;
      }

      const imageUrl = data.url;

      const saveRes = await fetch(`${API}/admin/docket/${docketId}/upload-visual`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${localStorage.getItem("access_token")}`
        },
        body:JSON.stringify({
          uploaded_url:imageUrl
        })
      });

      const saveData = await saveRes.json();

      if(saveData.success){
        alert("Image uploaded successfully");
        loadAll();
        setVisualImage(imageUrl);
      }else{
        alert("Database save failed");
      }

    }
    catch(err){
      console.log(err);
      alert("Upload error");
    }
    finally{
      setUploading(false);
    }
  }

  // ───────────────── SAVE MESSAGE (UNCHANGED) ─────────────────
  async function handleSaveMessage(){

    try{

      const res = await fetch(`${API}/admin/docket/${docketId}/message`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${localStorage.getItem("access_token")}`
        },
        body:JSON.stringify({
          message:message
        })
      });

      const data = await res.json();

      if(data.success){
        alert("Message saved successfully");
      }else{
        alert("Message save failed");
      }

    }catch(err){
      console.log(err);
      alert("Server error");
    }

  }

  // ───────────────── RENDER ─────────────────
  return (

    <div className="docket-container">

      {/* HEADER */}
      <div className="docket-header-view">

        <h2>{docketTitle}</h2>

        <div className="docket-meta">
          <span>{mode}</span>
          <span> | {mediaType}</span>
          <span> | {subType}</span>
          <span> | {product?.product_name}</span>
          <span> | {persona?.persona_name}</span>
        </div>

      </div>

      <div className="docket-content">

        {/* COLUMN 1 */}
        <div className="docket-column docket-column-1">
          <div className="docket-chatbot-header"><h3>CHATBOT</h3></div>
          <div className="docket-conversation">
            <div className="docket-conversation-bubbles">
              {chatHistory.map((msg,i)=>(
                <div key={i} className="docket-bubble-wrapper user-message">
                  <div className="docket-bubble">{msg.user}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMN 2 */}
        <div className="docket-column docket-column-2">

          <section className="docket-mandatory-section">
            <div className="docket-optionals-header">
              <h3 className="docket-column-title">MANDATORY FIELDS</h3>
            </div>

            <div className="docket-scroll-wrapper">
              <div className="docket-form-section">
                {mandatoryFields.map((f,i)=>(
                  <div key={i} className="docket-form-group">
                    <label>{f.label}</label>
                    <input value={f.value || ""} readOnly />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="docket-section-divider" />

          <section className="docket-optional-section">
            <div className="docket-optionals-header"><h3>OPTIONALS</h3></div>
            <div className="docket-scroll-wrapper">
              <div className="docket-form-section">
                {optionalFields.map((f,i)=>(
                  <div key={i} className="docket-form-group">
                    <label>{f.label}</label>
                    <input value={f.value || ""} readOnly />
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>

        {/* COLUMN 3 — FEEDBACK */}
        <div className="docket-column docket-column-3">

          <div className="docket-chatbot-header">
            <h3>FEEDBACK HISTORY</h3>
          </div>

          <div className="docket-conversation">
            <div className="docket-conversation-bubbles">

              {history.map((v,index)=>{

                const feedbacks = feedbackMap[v.admin_media_id] || [];

                return (
                  <React.Fragment key={index}>

                    <div
                      className="docket-version-divider"
                      onClick={()=>setSelectedVersionId(v.admin_media_id)}
                      style={{
                        cursor:"pointer",
                        opacity:selectedVersionId===v.admin_media_id ? 1 : 0.6
                      }}
                    >
                      <span>Image Version {history.length - index}</span>
                    </div>

                    {feedbacks.map((f)=>(
                      <div
                        key={f.feedback_history_id}
                        className={`docket-bubble-wrapper ${
                          f.role === "admin" ? "ai-message" : "user-message"
                        }`}
                      >
                        <div className="docket-bubble">{f.feedback}</div>
                      </div>
                    ))}

                  </React.Fragment>
                );
              })}

            </div>
          </div>

          <div className="docket-message-input">
            <textarea
              placeholder="Write feedback..."
              value={feedbackText}
              onChange={(e)=>setFeedbackText(e.target.value)}
            />
            <button className="docket-send-btn" onClick={handleSendFeedback}>
              ➤
            </button>
          </div>

        </div>

        {/* COLUMN 4 — VISUAL */}
        <div className="docket-column docket-column-4">

          <div className="docket-visual-output">

            <div className="docket-visual-header">
              <h3>VISUAL OUTPUT</h3>
            </div>

            <div className="docket-visual-content">
              {visualImage ? (
                <img src={visualImage} style={{maxWidth:"100%",maxHeight:"200px"}}/>
              ) : (
                <div className="docket-visual-placeholder">
                  {uploading ? "Uploading..." : "Upload visual"}
                </div>
              )}
            </div>

            <button className="docket-download-btn" onClick={()=>fileInputRef.current.click()}>
              Upload
            </button>

            <div className="docket-visual-message-box">
              <div className="docket-visual-message-title">Message</div>
              <textarea
                className="docket-visual-message-input"
                value={message}
                onChange={(e)=>setMessage(e.target.value)}
              />
              <button className="docket-save-message-btn" onClick={handleSaveMessage}>
                Save Message
              </button>
            </div>

            <input ref={fileInputRef} type="file" style={{display:"none"}} onChange={handleUpload} />

          </div>

        </div>

      </div>
    </div>
  );
}