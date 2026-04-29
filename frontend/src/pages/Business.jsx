import { useState, useEffect } from "react";
import "../styles/business.css";

export default function Business() {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  // 🔥 SUB MODE STATE
  const [subMode, setSubMode] = useState("");


  // 🔥 MODE STATE
  const [mode, setMode] = useState("visuals");

  useEffect(() => {
  setSubMode(""); // reset when switching between visuals/message
}, [mode]);


  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi 👋 Ask me anything about prompts or ideas." }
  ]);

  const imageStyles = [
    "Professional","Modern","Minimalistic","Elegant","Bold & Vibrant",
    "Clean & Simple","Luxury","Playful","Corporate","Dark Theme","Light Theme"
  ];

  const imageTypes = [
    "Calm & Reassuring",
    "Friendly & Approachable",
    "Professional & Polished",
    "Confident & Authoritative",
    "Supportive & Empathetic",
    "Aspirational & Forward-Looking",
    "Trust-Focused & Conservative",
    "Direct & No-Nonsense",
    "Premium & Refined",
    "Conversational & Human"

  ];

  const [form, setForm] = useState({
    name: "",
    category: "",
    customCategory: "",
    subCategory: "",
    product: "",
    persona: "",
    imageType: "",
    imageStyle: "",

    beforePersona: "",
    beforeProblem: "",
    beforeEmotion: "",
    beforeEnvironment: "",
    beforeText: "",

    afterPersona: "",
    afterSupport: "",
    afterOutcome: "",
    afterEmotion: "",
    afterText: ""
  });

  const [result, setResult] = useState("");
	function copyResult() {
	  if (!result) return;

	  const textarea = document.createElement("textarea");
	  textarea.value = result;

	  textarea.style.position = "fixed";
	  textarea.style.top = "0";
	  textarea.style.left = "0";

	  document.body.appendChild(textarea);
	  textarea.focus();
	  textarea.select();

	  document.execCommand("copy");

	  document.body.removeChild(textarea);
	}





  const [canGenerate, setCanGenerate] = useState(false);

  /* -----------------------------
     Data loading
  ----------------------------- */
  useEffect(() => {
    fetch("http://13.60.64.222:8000/categories", {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    })

      .then(res => {
        if (handleUnauthorized(res)) return;
        return res.json();
      })
      .then(setCategories)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.category) return;

    fetch(`http://13.60.64.222:8000/subcategories/${form.category}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    })

      .then(res => {
        if (handleUnauthorized(res)) return;
        return res.json();
      })

      .then(setSubCategories)
      .catch(console.error);
  }, [form.category]);



  useEffect(() => {
    if (!form.subCategory) return;

    fetch(`http://13.60.64.222:8000/rules/${encodeURIComponent(form.subCategory)}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    })

      .then(res => {
        if (handleUnauthorized(res)) return;
        return res.json();
      })

      .then(data => {
        if (!data.success) return;
        setForm(prev => ({
          ...prev,
          persona: data.data.persona,
          ...data.data.before,
          ...data.data.after
        }));
      })
      .catch(console.error);
  }, [form.subCategory]);

  useEffect(() => {
    setCanGenerate(
      Boolean(
        form.name &&
        form.category &&
        form.subCategory &&
        form.persona &&
        form.imageType &&
        (mode === "message" || form.imageStyle) &&
        (form.category !== "Others" || form.customCategory.trim())
      )
    );
  }, [form]);

  const updateField = e =>
    setForm({ ...form, [e.target.name]: e.target.value });


  function handleUnauthorized(res) {
    if (res.status === 401) {
      localStorage.clear();
      window.location.href = "/";
      return true;
    }
    return false;
  }







  async function generate() {
  setResult("Generating...");

  const finalCategory =
    form.category === "Others" ? form.customCategory : form.category;

  try {
    const res = await fetch("http://13.60.64.222:8000/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },

      body: JSON.stringify({
        ...form,
        category: finalCategory,
        mode, // 🔥 IMPORTANT
        subMode
      })
    });

    if (handleUnauthorized(res)) return;

    const data = await res.json();
    setResult(data.success ? data.output : "Error generating prompt");
    setIsEditing(false);
  } catch {
    setResult("Please Select Type of Prompt.");
  }
}



async function sendChatMessage() {
  if (!chatInput.trim()) return;

  const userText = chatInput;

  // show user message immediately
  setMessages(prev => [
    ...prev,
    { role: "user", text: userText }
  ]);

  setChatInput("");

  try {
    const res = await fetch("http://13.60.64.222:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },

      body: JSON.stringify({
        message: userText,
        mode,
        subMode,
        business: form.name,
        category: form.category
      })
    });
    if (handleUnauthorized(res)) return;

    const data = await res.json();

    setMessages(prev => [
      ...prev,
      { role: "bot", text: data.reply || "No response from AI." }
    ]);
  } catch (err) {
    setMessages(prev => [
      ...prev,
      { role: "bot", text: "⚠️ AI server not reachable." }
    ]);
  }
}








  return (
    <div className="business-page">
      <header className="business-header">
        <h1>AI Prompt Generator</h1>
        <p>Turn business details into powerful AI prompts</p>
      </header>

      <div className="layout">

        {/* =========================
           LEFT FORM (WITH MODE DROPDOWN)
        ========================= */}
        <div className="form-wrapper">

          {/* 🔥 MODE DROPDOWN OUTSIDE FORM */}
          <div className="mode-selector-top">
            <div
              className="mode-radio"
              role="radiogroup"
              aria-label="Prompt generation mode"
            >
              <input
                type="radio"
                id="mode-visuals"
                name="mode"
                value="visuals"
                checked={mode === "visuals"}
                onChange={(e) => setMode(e.target.value)}
              />
              <label htmlFor="mode-visuals">Visuals</label>

              <input
                type="radio"
                id="mode-message"
                name="mode"
                value="message"
                checked={mode === "message"}
                onChange={(e) => setMode(e.target.value)}
              />
              <label htmlFor="mode-message">Message</label>
            </div>
          </div>



          <div className="form-column">
            {/* 🔽 MODE-SPECIFIC TYPE SELECTOR */}
            <div className="mode-sub-selector">
              {mode === "message" && (
                <>
                  <label>Message Type</label>
                  <select value={subMode} onChange={(e) => setSubMode(e.target.value)}>
                    <option value="">Select Message Type</option>
                    <option value="problem">Problem-Agitation-Solution Message</option>
                    <option value="outcome">Outcome Driven Message</option>
                    <option value="competitive_advantage_message">Competitive Advantage Message </option>
                    <option value="simplicity">Simplicity Message</option>
                    <option value="authority_credibility">Authority & Credibility</option>
                  </select>
                </>
              )}

              {mode === "visuals" && (
                <>
                  <label>Visual Type</label>
                  <select value={subMode} onChange={(e) => setSubMode(e.target.value)}>
                    <option value="">Select Visual Type</option>
                    <option value="comparative">Comparative Visuals</option>
                    <option value="brand">Brand Visual</option>
                    <option value="problem_solution">Problem Solution</option>
                    <option value="lifestyle">LifeStyle</option>
                    <option value="feature">Feature Visual</option>
                    <option value="educational">Educational Visual</option>
                    <option value="testimonial">Testimonial</option>
                    <option value="product_in_use">Product in Use</option>
                  </select>
                </>
              )}
            </div>

            






            <h2 className="section-title">Business Details</h2>

            <label>Business Name</label>
            <input name="name" value={form.name} onChange={updateField} />

            <label>Business Category</label>
            <select name="category" value={form.category} onChange={updateField}>
              <option value="">Select Category</option>
              {categories.map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>

            {form.category === "Others" && (
              <>
                <label>Custom Category</label>
                <input
                  name="customCategory"
                  value={form.customCategory}
                  onChange={updateField}
                />
              </>
            )}

            <label>Sub Category</label>
            <select
              name="subCategory"
              value={form.subCategory}
              onChange={updateField}
            >
              <option value="">Select Sub Category</option>
              {subCategories.map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>

	 <label>About Your Product</label>
		<input
		  name="product"
		  value={form.product}
		  onChange={updateField}
		  placeholder="Enter product or service name"
		/>

	    












            <label>Target Persona</label>
            <input
              name="persona"
              value={form.persona}
              onChange={updateField}
            />



            <label>Nature of the Prompt</label>
            <select
              name="imageType"
              value={form.imageType}
              onChange={updateField}
            >
              <option value="">Select Nature of the Prompt</option>
              {imageTypes.map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>

            {mode === "visuals" && (
            <>
              <label>Image Style</label>
              <select
                name="imageStyle"
                value={form.imageStyle}
                onChange={updateField}
              >
                <option value="">Select Image Style</option>
                {imageStyles.map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </>
          )}
          {false && (
          <>

            <h2 className="section-title">Before / After Framework</h2>

            <h3 className="sub-title">Before</h3>
            <input name="beforePersona" value={form.beforePersona} onChange={updateField} placeholder="Persona" />
            <input name="beforeProblem" value={form.beforeProblem} onChange={updateField} placeholder="Problem" />
            <input name="beforeEmotion" value={form.beforeEmotion} onChange={updateField} placeholder="Emotion" />
            <input name="beforeEnvironment" value={form.beforeEnvironment} onChange={updateField} placeholder="Environment" />
            <input name="beforeText" value={form.beforeText} onChange={updateField} placeholder="Text on Image" />

            <h3 className="sub-title">After</h3>
            <input name="afterPersona" value={form.afterPersona} onChange={updateField} placeholder="Persona" />
            <input name="afterSupport" value={form.afterSupport} onChange={updateField} placeholder="Support" />
            <input name="afterOutcome" value={form.afterOutcome} onChange={updateField} placeholder="Outcome" />
            <input name="afterEmotion" value={form.afterEmotion} onChange={updateField} placeholder="Emotion" />
            <input name="afterText" value={form.afterText} onChange={updateField} placeholder="Text on Image" />
            </>
)}

            <div className="generate-sticky">
              <button disabled={!canGenerate} onClick={generate}>
                {mode === "visuals"
                  ? "Generate Visuals Prompt"
                  : "Generate Message Prompt"}
              </button>
            </div>
          </div>
        </div>

        {/* =========================
           CHAT
        ========================= */}
        <div className="chat-column">
          <div className="chat-header">
            <img src="/robot.jpg" className="chat-robot" />
            <span>AI Assistant</span>
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                {m.text}
              </div>
            ))}
          </div>

          <div className="chat-input">
            <textarea
              value={chatInput}
              placeholder="Ask something…"
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                console.log("KEY PRESSED:", e.key);   // 🔥 ADD THIS
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  console.log("ENTER DETECTED");       // 🔥 ADD THIS
                  sendChatMessage();
                }
              }}
            />


          </div>
        </div>

        {/* =========================
           OUTPUT
        ========================= */}
        <div className="output-column">
          <label className="output-title">Generated Prompt</label>
          <textarea
            value={result}
            readOnly={!isEditing}
            onChange={e => setResult(e.target.value)}
          />

          <div className="action-row">
            <button
              className="copy-btn"
              onClick={copyResult}
            >
              Copy
            </button>
            <button
              className="edit-btn"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? "Save" : "Edit"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
