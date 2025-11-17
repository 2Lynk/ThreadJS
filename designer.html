<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ThreadJS Designer</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- Shared global stylesheet -->
  <link rel="stylesheet" href="https://2lynk.github.io/stylesheet.css">
  
  <!-- YAML parsing library -->
  <script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>

  <style>
    /* Designer layout builds on the shared light theme vars from stylesheet.css */

    main.designer-main {
      flex: 1;
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) 220px;
      gap: 0;
      border-top: 1px solid var(--border-light, #dee2e6);
      min-height: 0;
      background: var(--bg-primary, #f8f9fa);
    }

    /* Left toolbox */
    #toolbox {
      grid-column: 1 / 2;
      grid-row: 1 / 3;
      border-right: 1px solid var(--border-light, #dee2e6);
      background: var(--bg-secondary, #ffffff);
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      overflow-y: auto;
    }

    #toolbox h2 {
      margin: 0;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary, #495057);
    }

    .tool-group {
      margin-bottom: 0.75rem;
    }

    .tool-group-title {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary, #495057);
      margin: 0 0 0.4rem;
      padding-bottom: 0.25rem;
      border-bottom: 1px solid var(--border-light, #dee2e6);
    }

    .node-type {
      padding: 0.35rem 0.45rem;
      border-radius: 6px;
      border: 1px dashed var(--border-medium, #adb5bd);
      background: #ffffff;
      font-size: 0.82rem;
      margin-bottom: 0.25rem;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .node-type:hover {
      background: #f1f3f5;
      border-color: var(--accent, #6c757d);
      transform: translateY(-1px);
    }

    .node-type-icon {
      width: 18px;
      height: 18px;
      border-radius: 3px;
      flex-shrink: 0;
    }

    /* Center canvas */
    #canvas-wrapper {
      grid-column: 2 / 3;
      grid-row: 1 / 2;
      background: #e9ecef;
      position: relative;
      overflow: auto;
    }

    #canvas {
      position: relative;
      width: 10000px;
      height: 10000px;
      background-image:
        linear-gradient(#dee2e6 1px, transparent 1px),
        linear-gradient(90deg, #dee2e6 1px, transparent 1px);
      background-size: 20px 20px;
      background-color: #f1f3f5;
      user-select: none;
    }

    .node {
      position: absolute;
      min-width: 180px;
      max-width: 280px;
      border-radius: 8px;
      border: 2px solid var(--border-medium, #adb5bd);
      background: #ffffff;
      box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.08));
      cursor: move;
      font-size: 0.82rem;
      box-sizing: border-box;
    }

    .node.selected {
      border-color: #ffd43b;
      box-shadow: 0 0 0 3px rgba(255, 212, 59, 0.5);
    }

    .node-header {
      padding: 0.5rem 0.6rem;
      border-bottom: 1px solid var(--border-light, #dee2e6);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #f8f9fa;
      border-radius: 6px 6px 0 0;
    }

    .node-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .node-title {
      font-weight: 600;
      font-size: 0.85rem;
      flex: 1;
    }

    .node-body {
      padding: 0.5rem 0.6rem;
    }

    .node-io {
      font-size: 0.75rem;
      color: var(--text-secondary, #495057);
      margin-bottom: 0.25rem;
    }

    .node-ports {
      margin-top: 0.5rem;
      display: flex;
      justify-content: space-between;
    }

    .port {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid var(--border-medium, #adb5bd);
      background: #ffffff;
      cursor: pointer;
      position: relative;
    }

    .port:hover {
      background: #ffd43b;
      border-color: #ffc107;
    }

    .port.input {
      transform: translateX(-50%);
    }

    .port.output {
      transform: translateX(50%);
    }

    .port.connected {
      background: #51cf66;
      border-color: #37b24d;
    }

    svg.connections {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    }

    .connection-line {
      stroke: #868e96;
      stroke-width: 2;
      fill: none;
      pointer-events: stroke;
      cursor: pointer;
    }

    .connection-line.selected {
      stroke: #ffd43b;
      stroke-width: 3;
    }

    .connection-line:hover {
      stroke: #ffc107;
      stroke-width: 3;
    }

    /* Modal for node properties */
    #node-modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
    }

    #node-modal.visible {
      display: flex;
    }

    .modal-content {
      background: var(--bg-secondary, #ffffff);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      width: 90%;
      max-width: 600px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-light, #dee2e6);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.1rem;
      color: var(--text-primary, #1a1d20);
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-secondary, #495057);
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background 0.15s ease;
    }

    .modal-close:hover {
      background: #e9ecef;
    }

    .modal-body {
      padding: 1.25rem;
      overflow-y: auto;
      flex: 1;
    }

    .field-group {
      margin-bottom: 0.6rem;
    }

    .field-label {
      font-size: 0.8rem;
      color: var(--text-secondary, #495057);
      margin-bottom: 0.2rem;
    }

    .field-input,
    .field-textarea,
    .field-select {
      width: 100%;
      font-size: 0.85rem;
      border-radius: 6px;
      border: 1px solid var(--border-light, #dee2e6);
      padding: 0.25rem 0.4rem;
      font-family: inherit;
      background: var(--bg-secondary, #ffffff);
      box-sizing: border-box;
    }

    .field-textarea {
      min-height: 60px;
      resize: vertical;
    }

    .hint {
      font-size: 0.78rem;
      color: var(--text-secondary, #495057);
    }

    .graph-controls {
      margin-top: auto;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-light, #dee2e6);
    }

    .graph-controls h2 {
      margin: 0 0 0.5rem;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary, #495057);
    }

    .button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-top: 0.25rem;
    }

    #sidebar-right button {
      padding: 0.35rem 0.7rem;
      border-radius: 6px;
      border: 1px solid var(--border-medium, #adb5bd);
      background: #e9ecef;
      color: var(--text-primary, #1a1d20);
      font-size: 0.8rem;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
    }

    #sidebar-right button:hover {
      background: var(--accent, #6c757d);
      color: #ffffff;
      border-color: var(--accent-hover, #495057);
      transform: translateY(-1px);
    }

    /* Bottom: JS preview */
    #preview-panel {
      grid-column: 2 / 4;
      grid-row: 2 / 3;
      border-top: 1px solid var(--border-light, #dee2e6);
      background: #f1f3f5;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    #preview-header {
      padding: 0.4rem 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.82rem;
      color: var(--text-secondary, #495057);
      background: #e9ecef;
    }

    #preview-header button {
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      border: 1px solid var(--border-medium, #adb5bd);
      background: #f8f9fa;
      font-size: 0.8rem;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
    }

    #preview-header button:hover {
      background: var(--accent, #6c757d);
      color: #ffffff;
      border-color: var(--accent-hover, #495057);
      transform: translateY(-1px);
    }

    #preview-code {
      flex: 1;
      padding: 0.5rem 0.75rem;
      background: var(--code-bg, #212529);
      color: var(--code-text, #f8f9fa);
      font-family: "Fira Code", "Courier New", monospace;
      font-size: 0.8rem;
      border-top: 1px solid var(--code-border, #343a40);
      overflow: auto;
      white-space: pre;
      margin: 0;
    }

    /* Variable reference section */
    .var-reference {
      margin-top: 0.5rem;
      border: 1px solid var(--border-light, #dee2e6);
      border-radius: 6px;
      background: var(--bg-secondary, #ffffff);
    }

    .var-reference summary {
      padding: 0.5rem 0.65rem;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.82rem;
      color: var(--text-primary, #1a1d20);
      user-select: none;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #f8f9fa;
      border-radius: 6px;
      transition: background 0.15s ease;
    }

    .var-reference summary::-webkit-details-marker {
      display: none;
    }

    .var-reference summary:hover {
      background: #e9ecef;
    }

    .var-reference summary::before {
      content: "▶";
      font-size: 0.7rem;
      transition: transform 0.15s ease;
    }

    .var-reference[open] summary::before {
      transform: rotate(90deg);
    }

    .var-ref-content {
      padding: 0.65rem;
      font-size: 0.78rem;
      line-height: 1.6;
    }

    .var-ref-item {
      margin-bottom: 0.75rem;
    }

    .var-ref-item:last-child {
      margin-bottom: 0;
    }

    .var-ref-item strong {
      display: block;
      color: var(--accent, #6c757d);
      font-size: 0.82rem;
      margin-bottom: 0.25rem;
    }

    .var-ref-item code {
      background: #f1f3f5;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      font-family: "Fira Code", monospace;
      font-size: 0.76rem;
      color: #495057;
    }

    .var-ref-item ul {
      margin: 0.25rem 0 0 0;
      padding-left: 1.2rem;
    }

    .var-ref-item li {
      margin: 0.15rem 0;
    }

    /* Autocomplete dropdown */
    .autocomplete-dropdown {
      position: absolute;
      background: #ffffff;
      border: 1px solid var(--border-medium, #adb5bd);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      display: none;
      min-width: 250px;
    }

    .autocomplete-dropdown.active {
      display: block;
    }

    .autocomplete-item {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-size: 0.8rem;
      border-bottom: 1px solid #f1f3f5;
      transition: background 0.1s ease;
    }

    .autocomplete-item:last-child {
      border-bottom: none;
    }

    .autocomplete-item:hover,
    .autocomplete-item.selected {
      background: #e7f5ff;
    }

    .autocomplete-item code {
      font-family: "Fira Code", monospace;
      font-size: 0.85rem;
      color: #1971c2;
      font-weight: 600;
    }

    .autocomplete-item-type {
      font-size: 0.7rem;
      color: #868e96;
      margin-left: 0.5rem;
    }

    .autocomplete-item-desc {
      font-size: 0.72rem;
      color: #495057;
      margin-top: 0.15rem;
    }

    #upload-input {
      display: none;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      main.designer-main {
        grid-template-columns: 200px minmax(0, 1fr);
        grid-template-rows: minmax(0, 1fr) 220px 260px;
      }
      #sidebar-right {
        grid-column: 1 / 3;
        grid-row: 2 / 3;
        border-left: none;
        border-top: 1px solid var(--border-light, #dee2e6);
        flex-direction: row;
        flex-wrap: wrap;
      }
      #sidebar-right > div {
        min-width: 220px;
        flex: 1 1 240px;
      }
      #preview-panel {
        grid-column: 1 / 3;
        grid-row: 3 / 4;
      }
    }

    @media (max-width: 768px) {
      main.designer-main {
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto 260px 260px;
      }
      #toolbox {
        grid-column: 1 / 2;
        grid-row: 1 / 2;
        border-right: none;
        border-bottom: 1px solid var(--border-light, #dee2e6);
      }
      #canvas-wrapper {
        grid-column: 1 / 2;
        grid-row: 2 / 3;
      }
      #sidebar-right {
        grid-column: 1 / 2;
        grid-row: 3 / 4;
      }
      #preview-panel {
        grid-column: 1 / 2;
        grid-row: 4 / 5;
      }
    }
  </style>
</head>
<body class="app-layout">
  <header>
    <div class="header-inner">
      <!-- Left: ThreadJS brand + Lynk link -->
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <a href="../" class="brand">
          <div class="brand-mark">T</div>
          <div class="brand-labels">
            <div class="brand-text-main">ThreadJS</div>
            <div class="brand-text-sub">Minecraft JS scripting</div>
          </div>
        </a>

        <!-- Back to main homepage -->
        <a class="nav-pill" href="https://2lynk.github.io/">Lynk</a>
      </div>

      <!-- Right: ThreadJS section navigation -->
      <nav class="nav-links">
        <a class="nav-pill" href="index.html">API Reference</a>
        <a class="nav-pill" href="inspector.html">Inspector</a>
        <a class="nav-pill" href="example-mods.html">Example Mods</a>
        <a class="nav-pill nav-pill--accent" href="designer.html">Designer</a>
        <a class="nav-pill" href="variable-reference.html">Variables</a>
      </nav>
    </div>
  </header>

  <!-- Version bar -->
  <div class="version-bar" style="padding: 0.5rem 2rem; background: #f1f3f5; border-bottom: 1px solid var(--border-light, #dee2e6); display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--text-secondary, #495057);">
    <label for="versionSelectNodes" style="font-weight: 500;">Node Version:</label>
    <select id="versionSelectNodes" style="padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-medium, #adb5bd); background: var(--bg-secondary, #ffffff); font-size: 0.9rem;"></select>
    <span id="versionNoteNodes" style="font-size: 0.85rem; color: var(--text-secondary, #495057);"></span>
  </div>

  <main class="designer-main">
    <!-- Toolbox -->
    <aside id="toolbox">
      <h2>Nodes</h2>
      <!-- Generated dynamically from YAML -->
      <p class="hint" style="font-size: 0.75rem;">
        Click to add nodes. Double-click to edit. Drag to move. Click ports to connect. Right-click connections to delete.
      </p>

      <div class="graph-controls">
        <h2>Graph</h2>
        
        <div class="field-group">
          <div class="field-label">Mod name</div>
          <input id="field-mod-name" class="field-input" type="text" placeholder="my-mod" value="designer-mod" />
          <div class="hint" style="margin-top: 0.25rem; font-size: 0.75rem;">Used in generated code</div>
        </div>

        <div class="field-group">
          <button id="btn-new-graph" type="button" style="width: 100%;">New graph</button>
        </div>

        <div class="field-group">
          <div class="field-label">Status</div>
          <div id="designer-status" class="hint">Ready.</div>
        </div>

        <input id="upload-input" type="file" accept=".json" style="display: none;" />
      </div>
    </aside>

    <!-- Canvas -->
    <section id="canvas-wrapper">
      <div id="canvas"></div>
    </section>

    <!-- Node Properties Modal -->
    <div id="node-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Node Properties</h2>
          <button class="modal-close" id="modal-close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="field-group">
            <div class="field-label">Selected node</div>
            <input id="field-node-label" class="field-input" type="text" placeholder="No node selected" disabled />
          </div>

          <div class="field-group">
            <div class="field-label">Node type</div>
            <input id="field-node-type" class="field-input" type="text" disabled />
          </div>

          <div class="field-group">
            <div class="field-label">Parameters (read-only)</div>
            <input id="field-node-event" class="field-input" type="text" placeholder="No parameters" disabled />
          </div>

          <div class="field-group" style="position: relative;">
            <div class="field-label">Parameters (JSON)</div>
            <textarea id="field-node-message" class="field-textarea" placeholder='{"param": "value"}'></textarea>
            <div id="autocomplete-dropdown" class="autocomplete-dropdown"></div>
            <div class="hint" style="margin-top: 0.25rem; font-size: 0.75rem;">Edit parameters as JSON. Type variable names for autocomplete (e.g., "player.").</div>
          </div>

          <div class="field-group">
            <div class="field-label">Custom JS code (optional)</div>
            <textarea id="field-node-custom" class="field-textarea" placeholder="// Custom code to insert for this node&#10;// e.g., api.log('custom logic');"></textarea>
          </div>

          <p class="hint">
            <strong>💡 Tip:</strong> Type variable names in Parameters for autocomplete suggestions!<br>
            <a href="variable-reference.html" target="_blank" style="color: #1971c2; font-weight: 600;">View Variable Reference →</a>
          </p>
        </div>
      </div>
    </div>

    <!-- JS preview -->
    <section id="preview-panel">
      <div id="preview-header">
        <span>Generated ThreadJS mod (read-only preview)</span>
        <div style="display: flex; gap: 0.5rem;">
          <button id="btn-import-json" type="button">Import (.json)</button>
          <button id="btn-export-json" type="button">Export (.json)</button>
          <button id="btn-download-js" type="button">Download mod (.js)</button>
        </div>
      </div>
      <pre id="preview-code"></pre>
    </section>
  </main>

  <script src="version.js"></script>
  <script src="designer-new-script.js"></script>
</body>
</html>
