import React, { useState } from "react";
import "../styles/design.css";


export default function Design() {

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────
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
              >A</button>

              <button
                className="group-toggle-btn"
                title="enable-topic-ai-btn"
              >B</button>

            </div>


            <div className="singular-btn">

            <button
                className="singular-toggle-btn"
                title="topic-toggle-btn"
                onClick={() => showPanel("topic")}
              >1</button>

              <button
                className="singular-toggle-btn"
                title="ai-toggle-btn"
                onClick={() => showPanel("ai")}
              >2</button>

              <button
                className="singular-toggle-btn"
                title="basic-toggle-btn"
                onClick={() => showPanel("basic")}
              >3</button>

              <button
                className="singular-toggle-btn"
                title="detail-toggle-btn"
                onClick={() => showPanel("detail")}
              >4</button>

              <button
                className="singular-toggle-btn"
                title="interactive-toggle-btn"
                onClick={() => showPanel("interactive")}
              >5</button>

              <button
                className="singular-toggle-btn"
                title="stage-toggle-btn"
                onClick={() => showPanel("stage")}
              >6</button>
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


            <div className="topic-panel" style={panelStyle("topic")}>TOPIC</div>

            <div className="ai-panel" style={panelStyle("ai")}>AI</div>

            <div className="basic-panel" style={panelStyle("basic")}>Basic</div>

            <div className="detail-panel" style={panelStyle("detail")}>Details</div>

            <div className="interactive-panel" style={panelStyle("interactive")}>Interaction</div>

            <div className="stage-panel" style={panelStyle("stage")}>Stage</div>


        </div>

        <div className="design-right-panel">

          <div className="generate-btn">

            <button className="generate-control-btn">A</button>
            <button className="generate-control-btn">B</button>
            <button className="generate-control-btn">C</button>
          </div>
          

          <div className="generated-visual">Genrated Visuals</div>

          <div className="message-panel">Messages</div>

          <div className="controls">
            <div className="control-left-panel">

              <button className="control-btn">A</button>

              <button className="control-btn">B</button>

            </div>


            <div className="control-right-panel"></div>


          </div>







        </div>

    </div>

    </div>

  );
}