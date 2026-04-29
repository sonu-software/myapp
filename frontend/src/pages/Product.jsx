import { useState, useEffect, useRef } from "react";
import "../styles/product.css";
import { useNavigate } from "react-router-dom";

export default function Product() {
  const [productName, setProductName] = useState("");
  const navigate = useNavigate();
  const [features, setFeatures] = useState([]);
  const [usps, setUsps] = useState([]);
  const [values, setValues] = useState([]);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [hashtags, setHashtags] = useState([]);

  const [productList, setProductList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [expandedCard, setExpandedCard] = useState(null);
  const boardRef = useRef(null);

  const [popup, setPopup] = useState({
    show: false, type: "success", title: "", message: "", onConfirm: null, confirmLabel: "OK", cancelLabel: null
  });

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (boardRef.current && !boardRef.current.contains(e.target)) {
        setExpandedCard(null);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) setProductList(data.data);
    } catch (err) { console.error(err); }
  };

  const loadProduct = async (productId) => {
    if (productId === "new") {
      setSelectedProductId(""); setProductName(""); setDescription("");
      setFeatures([]); setUsps([]); setValues([]); setImages([]); setHashtags([]);
      return;
    }
    if (!productId) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/products/${productId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) {
        const p = data.data;
        setSelectedProductId(productId);
        setProductName(p.product_name || "");
        setDescription(p.product_description || "");
        setFeatures(p.features || []);
        setUsps(p.usps || []);
        setValues(p.values || []);
        setImages(p.images || []);
        setHashtags(p.hashtags || []);
      }
    } catch (err) { console.error(err); }
  };

  const handleSave = async (andNext = false) => {
    if (!productName.trim()) {
      setPopup({
        show: true, type: "warning", title: "Missing Product Title",
        message: "Please enter a product name before saving.",
        confirmLabel: "OK", cancelLabel: null, onConfirm: null
      });
      return;
    }
    const payload = {
      product_id: selectedProductId || null,
      product_name: productName,
      product_description: description,
      features, usps, values, images, hashtags
    };
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      setPopup({
        show: true, type: "warning", title: "Product Error",
        message: data.detail || "Something went wrong",
        confirmLabel: "OK", cancelLabel: null, onConfirm: null
      });
      return;
    }
    if (data.success) {
      fetchProducts();
      if (andNext) {
        setPopup({
          show: true, type: "success", title: "Product Saved",
          message: "Your product has been saved successfully.",
          confirmLabel: "OK", cancelLabel: null,
          onConfirm: () => navigate("/initializing", { replace: true })
        });
      } else {
        setPopup({
          show: true, type: "done", title: "Product Saved",
          message: "Your product has been saved successfully.",
          confirmLabel: "OK", cancelLabel: null, onConfirm: null
        });
      }
    }
  };

  const handleDuplicate = () => {
    if (!selectedProductId) {
      setPopup({
        show: true, type: "warning", title: "No Product Selected",
        message: "Please select an existing product to duplicate.",
        confirmLabel: "OK", cancelLabel: null, onConfirm: null
      });
      return;
    }
    setSelectedProductId("");
    setProductName(`${productName} (Copy)`);
    setPopup({
      show: true, type: "done", title: "Product Duplicated",
      message: "Data has been copied. Update the name and click Save or Save & Next to save it.",
      confirmLabel: "OK", cancelLabel: null, onConfirm: null
    });
  };

  const handleExit = () => {
    setPopup({
      show: true, type: "warning", title: "Exit Page",
      message: "You are about to exit this page. Any unsaved changes will be lost.",
      confirmLabel: "Exit", cancelLabel: "Stay",
      onConfirm: () => navigate(-1)
    });
  };

  const handleCardClick = (id) => {
    setExpandedCard((prev) => (prev === id ? null : id));
  };

  const closePopup = () => setPopup((p) => ({ ...p, show: false, onConfirm: null }));

  return (
    <div className="product-page">

      {/* ── HEADER ── */}
      <div className="product-header">
        <div className="product-header-left">
          <select className="product-dropdown" value={selectedProductId} onChange={(e) => loadProduct(e.target.value)}>
            <option value="">Product</option>
            <option value="new">+ Add New Product</option>
            {productList.map((p) => (
              <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
            ))}
          </select>
          <div className="product-title-wrapper">
            <input
              type="text" className="product-title-input"
              placeholder="Enter Product Name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
        </div>

        {/* ── Header Right: Duplicate + Exit ── */}
        <div className="product-header-right">
          <button className="product-action-btn product-duplicate-btn" onClick={handleDuplicate}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Duplicate
          </button>
          <button className="product-action-btn product-exit-btn" onClick={handleExit}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Exit
          </button>
        </div>
      </div>

      {/* ── BOARD ── */}
      <div className="product-board" ref={boardRef}>
        <EditableCard
          id="features" title="Key Features" subtitle="Core capabilities"
          onSave={setFeatures} initialData={features}
          isExpanded={expandedCard === "features"}
          onCardClick={() => handleCardClick("features")}
        />
        <EditableCard
          id="usp" title="USP" subtitle="Unique selling points"
          onSave={setUsps} initialData={usps}
          isExpanded={expandedCard === "usp"}
          onCardClick={() => handleCardClick("usp")}
        />
        <ImageCard
          id="images"
          onSave={setImages} initialData={images}
          isExpanded={expandedCard === "images"}
          onCardClick={() => handleCardClick("images")}
        />
        <DescriptionCard
          id="description"
          onSave={setDescription} initialData={description}
          isExpanded={expandedCard === "description"}
          onCardClick={() => handleCardClick("description")}
        />
        <EditableCard
          id="value" title="Value" subtitle="Customer value props"
          onSave={setValues} initialData={values}
          isExpanded={expandedCard === "value"}
          onCardClick={() => handleCardClick("value")}
        />
      </div>

      {/* ── SAVE BAR: hashtag field left · buttons right ── */}
      <div className="save-wrapper">
        <HashtagBar hashtags={hashtags} onChange={setHashtags} />
        <div className="save-buttons">
          <button className="ai-btn ai-btn-done" onClick={() => handleSave(false)}>Done</button>
          <button className="ai-btn ai-btn-sticky" onClick={() => handleSave(true)}>Save &amp; Next</button>
        </div>
      </div>

      {/* ── POPUP ── */}
      {popup.show && (
        <div className="ai-popup-overlay">
          <div className={`ai-popup ${popup.type === "done" ? "success" : popup.type}`}>
            <div className="ai-popup-icon">{popup.type === "warning" ? "⚠️" : "✅"}</div>
            <h3>{popup.title}</h3>
            <p>{popup.message}</p>
            <div className="ai-popup-actions">
              {popup.cancelLabel && (
                <button className="ai-btn ai-popup-cancel" onClick={closePopup}>
                  {popup.cancelLabel}
                </button>
              )}
              <button className="ai-btn ai-popup-close" onClick={() => {
                if (popup.onConfirm) popup.onConfirm();
                closePopup();
              }}>
                {popup.confirmLabel || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── */
/*  SVG ICONS                    */
/* ───────────────────────────── */
function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function ImageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

/* ───────────────────────────── */
/*  HASHTAG BAR                  */
/*  Lives inside the save bar    */
/* ───────────────────────────── */
function HashtagBar({ hashtags, onChange }) {
  const MAX_TAGS = 5;
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef(null);
  const isFull = hashtags.length >= MAX_TAGS;
  const left = MAX_TAGS - hashtags.length;

  const addTag = () => {
    const val = inputVal.trim().replace(/^#+/, "").toLowerCase();
    if (!val || isFull || hashtags.includes(val)) return;
    onChange([...hashtags, val]);
    setInputVal("");
  };

  const removeTag = (index) => {
    onChange(hashtags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && inputVal === "" && hashtags.length > 0) {
      onChange(hashtags.slice(0, -1));
    }
  };

  return (
    <div className="ht-bar-wrapper">
      {/* The pill+input row */}
      <div className="ht-bar" onClick={() => inputRef.current?.focus()}>
        {/* Leading # icon */}
        <span className="ht-bar-hash">#</span>

        {/* Tag pills */}
        {hashtags.map((tag, i) => (
          <span className="ht-bar-pill" key={i}>
            #{tag}
            <span
              className="ht-bar-pill-x"
              onClick={(e) => { e.stopPropagation(); removeTag(i); }}
              title="Remove"
            >×</span>
          </span>
        ))}

        {/* Inline text input */}
        {!isFull && (
          <input
            ref={inputRef}
            type="text"
            className="ht-bar-input"
            placeholder={hashtags.length === 0 ? "Add hashtags..." : ""}
            value={inputVal}
            maxLength={32}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}

        {/* Counter badge — right-aligned inside the box */}
        <span className={`ht-bar-counter ${isFull ? "ht-bar-counter--full" : ""}`}>
          {hashtags.length}/{MAX_TAGS}
        </span>
      </div>

      {/* Helper hint sits below the box */}
      <span className={`ht-bar-hint ${isFull ? "ht-bar-hint--full" : ""}`}>
        {isFull
          ? "Maximum 5 hashtags reached"
          : `${left} remaining — press Space, Enter or , to add`}
      </span>
    </div>
  );
}

/* ───────────────────────────── */
/*  EDITABLE CARD                */
/* ───────────────────────────── */
function EditableCard({ title, subtitle, onSave, initialData = [], isExpanded, onCardClick }) {
  const INITIAL_ROWS = 5;
  const MAX_ROWS = 25;

  const [rows, setRows] = useState(() =>
    initialData.length ? [...initialData] : Array.from({ length: INITIAL_ROWS }, () => "")
  );
  const lastLoadedRef = useRef(JSON.stringify(initialData));
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);

  useEffect(() => {
    const incoming = JSON.stringify(initialData);
    if (incoming !== lastLoadedRef.current) {
      lastLoadedRef.current = incoming;
      setRows(initialData.length ? [...initialData] : Array.from({ length: INITIAL_ROWS }, () => ""));
    }
  }, [initialData]);

  const handleChange = (index, newValue) => {
    const updated = rows.map((v, i) => (i === index ? newValue : v));
    setRows(updated);
    lastLoadedRef.current = JSON.stringify(updated.filter((v) => v.trim() !== ""));
    onSave(updated.filter((v) => v.trim() !== ""));
  };

  const handleAddRow = (e) => {
    e.stopPropagation();
    if (rows.length >= MAX_ROWS) return;
    setRows((prev) => [...prev, ""]);
  };

  const confirmDeleteRow = (e, index) => {
    e.stopPropagation();
    setPendingDeleteIndex(index);
  };

  const doDeleteRow = () => {
    const updated = rows.filter((_, i) => i !== pendingDeleteIndex);
    setRows(updated);
    lastLoadedRef.current = JSON.stringify(updated.filter((v) => v.trim() !== ""));
    onSave(updated.filter((v) => v.trim() !== ""));
    setPendingDeleteIndex(null);
  };

  return (
    <>
      <div
        className={`pn-card ${isExpanded ? "pn-card--expanded" : ""}`}
        onClick={onCardClick}
      >
        <div
          className="pn-card-header"
          onClick={(e) => { e.stopPropagation(); onCardClick(); }}
        >
          <div className="pn-card-header-text">
            <h3>{title}</h3>
            {subtitle && <span className="pn-card-subtitle">{subtitle}</span>}
          </div>
          {isExpanded && (
            <div className="pn-card-actions">
              <button
                className="icon-action-btn"
                onClick={handleAddRow}
                disabled={rows.length >= MAX_ROWS}
                title="Add row"
              >
                <PlusIcon />
              </button>
            </div>
          )}
        </div>

        <div
          className="pn-card-body"
          onClick={isExpanded ? (e) => e.stopPropagation() : undefined}
        >
          {rows.map((value, index) => (
            <div className="pn-field-row" key={index}>
              <div className="pn-input-wrapper">
                <input
                  type="text"
                  className="pn-value-input"
                  value={value}
                  readOnly={!isExpanded}
                  placeholder={`Enter ${title.toLowerCase()}…`}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onFocus={() => { if (!isExpanded) onCardClick(); }}
                />
                {isExpanded && index !== 0 && (
                  <span
                    className="pn-delete-x pn-delete-x--no-hover"
                    onClick={(e) => confirmDeleteRow(e, index)}
                    title="Delete row"
                  >×</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Delete confirmation popup ── */}
      {pendingDeleteIndex !== null && (
        <div className="ai-popup-overlay">
          <div className="ai-popup warning">
            <div className="ai-popup-icon">⚠️</div>
            <h3>Remove Field</h3>
            <p>This field will be removed. Are you sure?</p>
            <div className="ai-popup-actions">
              <button className="ai-btn ai-popup-cancel" onClick={() => setPendingDeleteIndex(null)}>Cancel</button>
              <button className="ai-btn ai-popup-close" onClick={doDeleteRow}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────────────────────────── */
/*  IMAGE CARD                   */
/* ───────────────────────────── */
function ImageCard({ onSave, initialData = [], isExpanded, onCardClick }) {
  const INITIAL_IMAGES = 3;
  const MAX_IMAGES = 10;

  const [images, setImages] = useState(() =>
    initialData.length ? [...initialData] : Array.from({ length: INITIAL_IMAGES }, () => null)
  );
  const lastLoadedRef = useRef(JSON.stringify(initialData));

  useEffect(() => {
    const incoming = JSON.stringify(initialData);
    if (incoming !== lastLoadedRef.current) {
      lastLoadedRef.current = incoming;
      setImages(initialData.length ? [...initialData] : Array.from({ length: INITIAL_IMAGES }, () => null));
    }
  }, [initialData]);

  const handleImageUpload = async (index, e) => {
    e.stopPropagation();
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        const updated = images.map((img, i) => i === index ? { img_url: data.url, img_caption: "" } : img);
        setImages(updated);
        lastLoadedRef.current = JSON.stringify(updated.filter(Boolean));
        onSave(updated.filter(Boolean));
      }
    } catch (err) { console.error("Upload failed:", err); }
  };

  const handleAddImage = (e) => {
    e.stopPropagation();
    if (images.length >= MAX_IMAGES) return;
    setImages((prev) => [...prev, null]);
  };

  const handleDeleteImage = (e, index) => {
    e.stopPropagation();
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    lastLoadedRef.current = JSON.stringify(updated.filter(Boolean));
    onSave(updated.filter(Boolean));
  };

  return (
    <div
      className={`pn-card ${isExpanded ? "pn-card--expanded" : ""}`}
      onClick={onCardClick}
    >
      <div
        className="pn-card-header"
        onClick={(e) => { e.stopPropagation(); onCardClick(); }}
      >
        <div className="pn-card-header-text">
          <h3>Images</h3>
          <span className="pn-card-subtitle">Product visuals</span>
        </div>
        {isExpanded && (
          <div className="pn-card-actions">
            <button className="icon-action-btn" onClick={handleAddImage} disabled={images.length >= MAX_IMAGES} title="Add image">
              <PlusIcon />
            </button>
          </div>
        )}
      </div>

      <div
        className="pn-card-body"
        onClick={isExpanded ? (e) => e.stopPropagation() : undefined}
      >
        <div className="pn-image-grid">
          {images.map((image, index) => (
            <div className="pn-image-slot" key={index}>
              <label
                className={`pn-image-box ${image ? "pn-image-box--filled" : ""} ${!isExpanded ? "pn-image-box--disabled" : ""}`}
                onClick={(e) => { e.stopPropagation(); if (!isExpanded) onCardClick(); }}
              >
                {image
                  ? <img src={image.img_url} alt={`Product ${index + 1}`} />
                  : <div className="pn-image-placeholder"><ImageIcon /><span>{isExpanded ? "Upload" : "No image"}</span></div>
                }
                <input
                  type="file"
                  accept="image/*"
                  disabled={!isExpanded}
                  onChange={(e) => handleImageUpload(index, e)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    width: "100%",
                    height: "100%",
                    cursor: "pointer",
                    zIndex: 1,
                    pointerEvents: isExpanded ? "auto" : "none"
                  }}
                />
              </label>
              {isExpanded && (
                <span className="pn-delete-x pn-image-delete" onClick={(e) => handleDeleteImage(e, index)} title="Remove image">×</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── */
/*  DESCRIPTION CARD             */
/* ───────────────────────────── */
function DescriptionCard({ onSave, initialData = "", isExpanded, onCardClick }) {
  const [description, setDescription] = useState(initialData);
  const lastLoadedRef = useRef(initialData);

  useEffect(() => {
    if (initialData !== lastLoadedRef.current) {
      lastLoadedRef.current = initialData;
      setDescription(initialData || "");
    }
  }, [initialData]);

  return (
    <div
      className={`pn-card ${isExpanded ? "pn-card--expanded" : ""}`}
      onClick={onCardClick}
    >
      <div
        className="pn-card-header"
        onClick={(e) => { e.stopPropagation(); onCardClick(); }}
      >
        <div className="pn-card-header-text">
          <h3>Description</h3>
          <span className="pn-card-subtitle">Product overview</span>
        </div>
      </div>

      <div
        className="pn-card-body"
        onClick={isExpanded ? (e) => e.stopPropagation() : undefined}
      >
        <textarea
          className="pn-value-autogrow pn-description-area"
          value={description}
          readOnly={!isExpanded}
          onFocus={() => { if (!isExpanded) onCardClick(); }}
          onChange={(e) => {
            setDescription(e.target.value);
            lastLoadedRef.current = e.target.value;
            onSave(e.target.value);
          }}
          placeholder="Enter product description…"
        />
      </div>
    </div>
  );
}