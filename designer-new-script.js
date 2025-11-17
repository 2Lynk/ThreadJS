// ThreadJS Designer - Enhanced with connections and full API support

// Variable schemas - loaded from versioned YAML files
let VARIABLE_SCHEMAS = {};

// Function to convert YAML variable data to the VARIABLE_SCHEMAS format
function loadVariableSchemasFromYaml(yamlData) {
  const schemas = {};
  
  if (!yamlData || !yamlData.categories) {
    console.error('Invalid YAML data for variable schemas');
    return schemas;
  }
  
  // Build variables from all categories
  for (const category of yamlData.categories) {
    for (const variable of category.variables) {
      const schema = {
        description: variable.description || "",
        type: variable.type || "object",
        properties: {}
      };
      
      // Add extends if present
      if (variable.extends) {
        schema.extends = variable.extends;
      }
      
      // Convert properties array to object format
      if (variable.properties) {
        for (const prop of variable.properties) {
          schema.properties[prop.name] = {
            type: prop.type,
            description: prop.description
          };
          if (prop.example) {
            schema.properties[prop.name].example = prop.example;
          }
          if (prop.schema) {
            schema.properties[prop.name].schema = prop.schema;
          }
        }
      }
      
      // Add example if it's a simple string
      if (variable.example) {
        schema.example = variable.example;
      }
      
      schemas[variable.name] = schema;
    }
  }
  
  return schemas;
}

// Load variable schemas from YAML on page load
async function initializeVariableSchemas() {
  try {
    // Try to use version selector if available
    if (window.ThreadJsVersion && window.ThreadJsVersion.loadVersions) {
      const versions = await window.ThreadJsVersion.loadVersions(/^v[\d.]+\-variables\.(yaml|yml)$/);
      if (versions && versions.length > 0) {
        const latestVersion = versions[0];
        const response = await fetch(latestVersion.yamlPath);
        const yamlText = await response.text();
        const yamlData = jsyaml.load(yamlText);
        VARIABLE_SCHEMAS = loadVariableSchemasFromYaml(yamlData);
        console.log('Loaded variable schemas from', latestVersion.yamlPath);
        return;
      }
    }
    
    // Fallback to direct load
    const response = await fetch('versions/v1.0.0-variables.yaml');
    const yamlText = await response.text();
    const yamlData = jsyaml.load(yamlText);
    VARIABLE_SCHEMAS = loadVariableSchemasFromYaml(yamlData);
    console.log('Loaded variable schemas from fallback path');
  } catch (error) {
    console.error('Error loading variable schemas:', error);
    // Continue with empty schemas - designer will still work, just without autocomplete
  }
}

const canvasWrapper = document.getElementById("canvas-wrapper");
const canvasEl = document.getElementById("canvas");
const toolbox = document.getElementById("toolbox");

const fieldLabel = document.getElementById("field-node-label");
const fieldType = document.getElementById("field-node-type");
const fieldEvent = document.getElementById("field-node-event");
const fieldMessage = document.getElementById("field-node-message");
const fieldCustom = document.getElementById("field-node-custom");
const fieldModName = document.getElementById("field-mod-name");
const autocompleteDropdown = document.getElementById("autocomplete-dropdown");

// Autocomplete state
let autocompleteItems = [];
let autocompleteSelectedIndex = -1;
let autocompleteActive = false;

const statusEl = document.getElementById("designer-status");
const previewCodeEl = document.getElementById("preview-code");
const uploadInput = document.getElementById("upload-input");

const btnNewGraph = document.getElementById("btn-new-graph");
const btnExportJson = document.getElementById("btn-export-json");
const btnImportJson = document.getElementById("btn-import-json");
const btnDownloadJs = document.getElementById("btn-download-js");

const nodeTypeButtons = toolbox.querySelectorAll(".node-type");

let nodes = []; // { id, type, label, x, y, params, hasInput, hasOutput, color }
let connections = []; // { id, from: nodeId, to: nodeId }
let nextNodeId = 1;
let nextConnectionId = 1;
let selectedNodeId = null;
let selectedConnectionId = null;
let modName = "designer-mod";

// Connection drawing state
let connectionDragStart = null;
let tempConnectionEnd = null;

// SVG for connections
let connectionsSvg = null;

function initSvg() {
  connectionsSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  connectionsSvg.setAttribute("class", "connections");
  connectionsSvg.style.position = "absolute";
  connectionsSvg.style.top = "0";
  connectionsSvg.style.left = "0";
  connectionsSvg.style.width = "100%";
  connectionsSvg.style.height = "100%";
  connectionsSvg.style.pointerEvents = "none";
  connectionsSvg.style.zIndex = "0";
  canvasEl.insertBefore(connectionsSvg, canvasEl.firstChild);
}

// Node type definitions - loaded from versioned YAML files
let NODE_DEFINITIONS = {};
let NODE_CATEGORIES = [];

// Load node definitions from YAML
async function initializeNodeDefinitions() {
  try {
    // Try to use version selector if available
    if (window.ThreadJsVersion && window.ThreadJsVersion.loadVersions) {
      const versions = await window.ThreadJsVersion.loadVersions(/^v[\d.]+\-nodes\.(yaml|yml)$/);
      if (versions && versions.length > 0) {
        const latestVersion = versions[0];
        const response = await fetch(latestVersion.yamlPath);
        const yamlText = await response.text();
        const yamlData = jsyaml.load(yamlText);
        loadNodeDefinitionsFromYaml(yamlData);
        console.log('Loaded node definitions from', latestVersion.yamlPath);
        return;
      }
    }
    
    // Fallback to direct load
    const response = await fetch('versions/v1.0.0-nodes.yaml');
    const yamlText = await response.text();
    const yamlData = jsyaml.load(yamlText);
    loadNodeDefinitionsFromYaml(yamlData);
    console.log('Loaded node definitions from fallback path');
  } catch (error) {
    console.error('Error loading node definitions:', error);
    setStatus('Error loading node definitions. Using defaults.', true);
  }
}

function loadNodeDefinitionsFromYaml(yamlData) {
  if (!yamlData || !yamlData.categories) {
    console.error('Invalid YAML data for node definitions');
    return;
  }
  
  NODE_DEFINITIONS = {};
  NODE_CATEGORIES = yamlData.categories;
  
  // Build NODE_DEFINITIONS object from categories
  for (const category of yamlData.categories) {
    for (const node of category.nodes) {
      NODE_DEFINITIONS[node.type] = {
        label: node.label,
        color: node.color,
        hasInput: node.hasInput,
        hasOutput: node.hasOutput,
        params: node.params || {},
        provides: node.provides || []
      };
    }
  }
  
  // Regenerate toolbox with loaded nodes
  generateToolbox();
}

function generateToolbox() {
  const toolbox = document.getElementById('toolbox');
  if (!toolbox) return;
  
  // Find the hint element to preserve it
  const hint = toolbox.querySelector('.hint');
  
  // Clear toolbox except title and hint
  const title = toolbox.querySelector('h2');
  toolbox.innerHTML = '';
  if (title) toolbox.appendChild(title);
  
  // Generate tool groups from categories
  for (const category of NODE_CATEGORIES) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'tool-group';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'tool-group-title';
    titleDiv.textContent = category.name;
    groupDiv.appendChild(titleDiv);
    
    for (const node of category.nodes) {
      const nodeDiv = document.createElement('div');
      nodeDiv.className = 'node-type';
      nodeDiv.dataset.nodeType = node.type;
      
      const iconDiv = document.createElement('div');
      iconDiv.className = 'node-type-icon';
      iconDiv.style.background = node.color;
      nodeDiv.appendChild(iconDiv);
      
      nodeDiv.appendChild(document.createTextNode(node.label));
      
      // Add click handler
      nodeDiv.addEventListener('click', () => {
        const rect = canvasWrapper.getBoundingClientRect();
        const scrollLeft = canvasWrapper.scrollLeft;
        const scrollTop = canvasWrapper.scrollTop;
        const centerX = scrollLeft + rect.width / 2;
        const centerY = scrollTop + rect.height / 2;
        
        createNode(node.type, centerX - 90, centerY - 40);
        setStatus("Added node: " + node.label);
      });
      
      groupDiv.appendChild(nodeDiv);
    }
    
    toolbox.appendChild(groupDiv);
  }
  
  // Re-add hint at the end
  if (hint) toolbox.appendChild(hint);
}

function setStatus(text, isError) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b91c1c" : "var(--text-secondary, #495057)";
}

function findNode(id) {
  return nodes.find(n => n.id === id) || null;
}

function findConnection(id) {
  return connections.find(c => c.id === id) || null;
}

function createNode(type, x, y) {
  const def = NODE_DEFINITIONS[type] || { label: type, color: "#868e96", hasInput: true, hasOutput: true, params: {} };
  const node = {
    id: nextNodeId++,
    type,
    label: def.label,
    x,
    y,
    params: JSON.parse(JSON.stringify(def.params)), // deep copy
    hasInput: def.hasInput,
    hasOutput: def.hasOutput,
    color: def.color
  };
  nodes.push(node);
  renderNode(node);
  selectNode(node.id);
  updatePreview();
  return node;
}

function deleteNode(id) {
  // Remove all connections to/from this node
  connections = connections.filter(c => c.from !== id && c.to !== id);
  nodes = nodes.filter(n => n.id !== id);
  
  const el = canvasEl.querySelector(`[data-node-id="${id}"]`);
  if (el) el.remove();
  
  if (selectedNodeId === id) {
    selectedNodeId = null;
    refreshSidebarFields();
  }
  
  renderConnections();
  updatePreview();
}

function createConnection(fromId, toId) {
  // Check if connection already exists
  if (connections.some(c => c.from === fromId && c.to === toId)) {
    return null;
  }
  
  // Check if target node accepts input
  const toNode = findNode(toId);
  if (!toNode || !toNode.hasInput) {
    setStatus("Target node doesn't accept input connections", true);
    return null;
  }
  
  // Check if source node has output
  const fromNode = findNode(fromId);
  if (!fromNode || !fromNode.hasOutput) {
    setStatus("Source node doesn't have output", true);
    return null;
  }
  
  const connection = {
    id: nextConnectionId++,
    from: fromId,
    to: toId
  };
  connections.push(connection);
  renderConnections();
  updatePreview();
  return connection;
}

function deleteConnection(id) {
  connections = connections.filter(c => c.id !== id);
  if (selectedConnectionId === id) {
    selectedConnectionId = null;
  }
  renderConnections();
  updatePreview();
}

function renderNode(node) {
  let el = canvasEl.querySelector(`[data-node-id="${node.id}"]`);
  if (!el) {
    el = document.createElement("div");
    el.className = "node";
    el.dataset.nodeId = String(node.id);
    el.style.zIndex = "1";

    const header = document.createElement("div");
    header.className = "node-header";
    el.appendChild(header);

    const colorDot = document.createElement("div");
    colorDot.className = "node-color";
    header.appendChild(colorDot);

    const title = document.createElement("div");
    title.className = "node-title";
    header.appendChild(title);

    const body = document.createElement("div");
    body.className = "node-body";
    el.appendChild(body);

    const io = document.createElement("div");
    io.className = "node-io";
    body.appendChild(io);

    const ports = document.createElement("div");
    ports.className = "node-ports";
    body.appendChild(ports);

    if (node.hasInput) {
      const inputPort = document.createElement("div");
      inputPort.className = "port input";
      inputPort.dataset.nodeId = node.id;
      inputPort.dataset.portType = "input";
      inputPort.addEventListener("mousedown", onPortMouseDown);
      ports.appendChild(inputPort);
    } else {
      ports.appendChild(document.createElement("div")); // spacer
    }

    if (node.hasOutput) {
      const outputPort = document.createElement("div");
      outputPort.className = "port output";
      outputPort.dataset.nodeId = node.id;
      outputPort.dataset.portType = "output";
      outputPort.addEventListener("mousedown", onPortMouseDown);
      ports.appendChild(outputPort);
    }

    canvasEl.appendChild(el);

    // Click -> select node
    el.addEventListener("mousedown", (e) => {
      if (e.button === 0 && !e.target.classList.contains("port")) {
        e.stopPropagation();
        selectNode(node.id);
      }
    });

    // Right-click -> delete
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (confirm(`Delete node "${node.label}"?`)) {
        deleteNode(node.id);
      }
    });

    makeNodeDraggable(el, node);
  }

  el.style.left = node.x + "px";
  el.style.top = node.y + "px";

  const colorEl = el.querySelector(".node-color");
  const titleEl = el.querySelector(".node-title");
  const ioEl = el.querySelector(".node-io");
  
  if (colorEl) colorEl.style.background = node.color;
  if (titleEl) titleEl.textContent = node.label || "(" + node.type + ")";
  if (ioEl) {
    const paramStr = Object.entries(node.params || {})
      .map(([k, v]) => `${k}: ${String(v).slice(0, 15)}`)
      .join(", ");
    ioEl.textContent = node.type + (paramStr ? " • " + paramStr : "");
  }
  
  el.classList.toggle("selected", node.id === selectedNodeId);
  
  // Update port connected states
  updatePortStates();
}

function updatePortStates() {
  canvasEl.querySelectorAll(".port").forEach(port => {
    const nodeId = Number(port.dataset.nodeId);
    const isInput = port.dataset.portType === "input";
    const isConnected = connections.some(c => 
      (isInput && c.to === nodeId) || (!isInput && c.from === nodeId)
    );
    port.classList.toggle("connected", isConnected);
  });
}

function makeNodeDraggable(el, node) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let nodeStartX = 0;
  let nodeStartY = 0;

  el.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || e.target.classList.contains("port")) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    nodeStartX = node.x;
    nodeStartY = node.y;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  function onMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    node.x = nodeStartX + dx;
    node.y = nodeStartY + dy;
    renderNode(node);
    renderConnections();
  }

  function onUp() {
    dragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    updatePreview();
  }
}

function onPortMouseDown(e) {
  e.stopPropagation();
  e.preventDefault();
  const nodeId = Number(e.target.dataset.nodeId);
  const isOutput = e.target.dataset.portType === "output";
  
  if (isOutput) {
    // Start dragging connection from output
    connectionDragStart = { nodeId, port: e.target };
    tempConnectionEnd = { x: e.clientX, y: e.clientY };
    
    document.addEventListener("mousemove", onConnectionDrag);
    document.addEventListener("mouseup", onConnectionDragEnd);
    
    // Prevent text selection during drag
    document.body.style.userSelect = "none";
    canvasEl.style.cursor = "crosshair";
  } else {
    // Click on input port - try to connect if we have a drag in progress
    if (connectionDragStart) {
      createConnection(connectionDragStart.nodeId, nodeId);
      connectionDragStart = null;
      tempConnectionEnd = null;
      canvasEl.style.cursor = "";
      
      // Restore text selection
      document.body.style.userSelect = "";
      
      document.removeEventListener("mousemove", onConnectionDrag);
      document.removeEventListener("mouseup", onConnectionDragEnd);
      renderConnections();
    }
  }
}

function onConnectionDrag(e) {
  if (!connectionDragStart) return;
  tempConnectionEnd = { 
    x: e.clientX - canvasEl.getBoundingClientRect().left + canvasWrapper.scrollLeft, 
    y: e.clientY - canvasEl.getBoundingClientRect().top + canvasWrapper.scrollTop 
  };
  renderConnections();
}

function onConnectionDragEnd(e) {
  // Check if we ended on an input port
  if (e.target && e.target.classList.contains("port") && e.target.dataset.portType === "input") {
    const toNodeId = Number(e.target.dataset.nodeId);
    if (connectionDragStart) {
      createConnection(connectionDragStart.nodeId, toNodeId);
    }
  }
  
  connectionDragStart = null;
  tempConnectionEnd = null;
  canvasEl.style.cursor = "";
  
  // Restore text selection
  document.body.style.userSelect = "";
  
  document.removeEventListener("mousemove", onConnectionDrag);
  document.removeEventListener("mouseup", onConnectionDragEnd);
  renderConnections();
}

function renderConnections() {
  if (!connectionsSvg) return;
  connectionsSvg.innerHTML = "";

  // Render actual connections
  connections.forEach(conn => {
    const fromNode = findNode(conn.from);
    const toNode = findNode(conn.to);
    if (!fromNode || !toNode) return;

    const fromEl = canvasEl.querySelector(`[data-node-id="${conn.from}"]`);
    const toEl = canvasEl.querySelector(`[data-node-id="${conn.to}"]`);
    if (!fromEl || !toEl) return;

    const fromPort = fromEl.querySelector('.port.output');
    const toPort = toEl.querySelector('.port.input');
    if (!fromPort || !toPort) return;

    const fromRect = fromPort.getBoundingClientRect();
    const toRect = toPort.getBoundingClientRect();
    const canvasRect = canvasEl.getBoundingClientRect();

    const x1 = fromRect.left + fromRect.width / 2 - canvasRect.left + canvasWrapper.scrollLeft;
    const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top + canvasWrapper.scrollTop;
    const x2 = toRect.left + toRect.width / 2 - canvasRect.left + canvasWrapper.scrollLeft;
    const y2 = toRect.top + toRect.height / 2 - canvasRect.top + canvasWrapper.scrollTop;

    const path = createCubicBezierPath(x1, y1, x2, y2);
    path.setAttribute("class", "connection-line");
    path.dataset.connectionId = conn.id;
    path.style.pointerEvents = "all";
    
    if (conn.id === selectedConnectionId) {
      path.classList.add("selected");
    }

    path.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedConnectionId = conn.id;
      selectedNodeId = null;
      renderConnections();
      refreshSidebarFields();
    });

    path.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm("Delete this connection?")) {
        deleteConnection(conn.id);
      }
    });

    connectionsSvg.appendChild(path);
  });

  // Render temporary connection during drag
  if (connectionDragStart && tempConnectionEnd) {
    const fromNode = findNode(connectionDragStart.nodeId);
    if (fromNode) {
      const fromEl = canvasEl.querySelector(`[data-node-id="${connectionDragStart.nodeId}"]`);
      const fromPort = fromEl?.querySelector('.port.output');
      if (fromPort) {
        const fromRect = fromPort.getBoundingClientRect();
        const canvasRect = canvasEl.getBoundingClientRect();
        
        const x1 = fromRect.left + fromRect.width / 2 - canvasRect.left + canvasWrapper.scrollLeft;
        const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top + canvasWrapper.scrollTop;
        
        const path = createCubicBezierPath(x1, y1, tempConnectionEnd.x, tempConnectionEnd.y);
        path.setAttribute("class", "connection-line");
        path.style.stroke = "#ffc107";
        path.style.strokeDasharray = "5,5";
        connectionsSvg.appendChild(path);
      }
    }
  }
  
  updatePortStates();
}

function createCubicBezierPath(x1, y1, x2, y2) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const dx = x2 - x1;
  const controlOffset = Math.max(Math.abs(dx) * 0.5, 50);
  
  const d = `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
  path.setAttribute("d", d);
  return path;
}

function clearSelection() {
  selectedNodeId = null;
  selectedConnectionId = null;
  canvasEl.querySelectorAll(".node").forEach(el => el.classList.remove("selected"));
  renderConnections();
  refreshSidebarFields();
}

function selectNode(id) {
  selectedNodeId = id;
  selectedConnectionId = null;
  canvasEl.querySelectorAll(".node").forEach(el => {
    el.classList.toggle("selected", Number(el.dataset.nodeId) === id);
  });
  renderConnections();
  refreshSidebarFields();
}

function refreshSidebarFields() {
  const node = selectedNodeId ? findNode(selectedNodeId) : null;
  if (!node) {
    fieldLabel.value = "";
    fieldType.value = "";
    fieldEvent.value = "";
    fieldMessage.value = "";
    fieldCustom.value = "";
    fieldLabel.placeholder = "No node selected";
    fieldLabel.disabled = true;
    fieldEvent.disabled = true;
    fieldMessage.disabled = true;
    fieldCustom.disabled = true;
    return;
  }

  fieldLabel.disabled = false;
  fieldEvent.disabled = false;
  fieldMessage.disabled = false;
  fieldCustom.disabled = false;

  fieldLabel.placeholder = "";
  fieldLabel.value = node.label || "";
  fieldType.value = node.type || "";
  
  // Show available variables from parent nodes with enhanced info
  const availableVars = getAvailableVariables(node.id);
  if (availableVars.length > 0) {
    const varDetails = getAvailableVariablesWithSchema(node.id);
    const summary = availableVars.join(", ");
    const propCount = varDetails.reduce((sum, v) => sum + v.properties.length, 0);
    fieldEvent.value = `Available: ${summary} (${propCount} properties) - See Variable Reference below`;
  } else {
    fieldEvent.value = "No variables available from parent nodes";
  }
  
  fieldMessage.value = JSON.stringify(node.params || {}, null, 2);
  fieldCustom.value = node.customCode || "";
}

function attachFieldHandlers() {
  fieldLabel.addEventListener("input", () => {
    const node = selectedNodeId ? findNode(selectedNodeId) : null;
    if (!node) return;
    node.label = fieldLabel.value;
    renderNode(node);
    updatePreview();
  });

  fieldMessage.addEventListener("input", (e) => {
    const node = selectedNodeId ? findNode(selectedNodeId) : null;
    if (!node) return;
    
    // Check for autocomplete trigger
    const cursorPos = fieldMessage.selectionStart;
    const textBeforeCursor = fieldMessage.value.substring(0, cursorPos);
    const availableVars = getAvailableVariables(node.id);
    
    // Trigger autocomplete if typing variable or property
    if (textBeforeCursor.match(/["']\$?([a-zA-Z_][a-zA-Z0-9_.]*)$/)) {
      const suggestions = getAutocompleteSuggestions(textBeforeCursor, availableVars);
      showAutocomplete(suggestions, fieldMessage);
    } else {
      hideAutocomplete();
    }
    
    try {
      node.params = JSON.parse(fieldMessage.value);
      renderNode(node);
      updatePreview();
    } catch (e) {
      // Invalid JSON, ignore
    }
  });
  
  fieldMessage.addEventListener("keydown", (e) => {
    handleAutocompleteKeydown(e, fieldMessage);
  });
  
  fieldMessage.addEventListener("blur", () => {
    // Delay hiding to allow click on autocomplete items
    setTimeout(() => hideAutocomplete(), 200);
  });

  fieldCustom.addEventListener("input", () => {
    const node = selectedNodeId ? findNode(selectedNodeId) : null;
    if (!node) return;
    node.customCode = fieldCustom.value;
    updatePreview();
  });

  fieldModName.addEventListener("input", () => {
    modName = fieldModName.value || "designer-mod";
    updatePreview();
  });
}

// Click on empty canvas -> clear selection
canvasEl.addEventListener("mousedown", (e) => {
  if (e.target === canvasEl) {
    clearSelection();
  }
});

// Click outside autocomplete -> hide it
document.addEventListener("mousedown", (e) => {
  if (autocompleteActive && !autocompleteDropdown.contains(e.target) && e.target !== fieldMessage) {
    hideAutocomplete();
  }
});

// Add node from toolbox
nodeTypeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.nodeType;
    const rect = canvasWrapper.getBoundingClientRect();
    const scrollLeft = canvasWrapper.scrollLeft;
    const scrollTop = canvasWrapper.scrollTop;
    const centerX = scrollLeft + rect.width / 2;
    const centerY = scrollTop + rect.height / 2;

    createNode(type, centerX - 90, centerY - 40);
    setStatus("Added node: " + (NODE_DEFINITIONS[type]?.label || type));
  });
});

// Graph actions
btnNewGraph.addEventListener("click", () => {
  if (!confirm("Clear the current graph? This cannot be undone.")) return;
  nodes = [];
  connections = [];
  nextNodeId = 1;
  nextConnectionId = 1;
  selectedNodeId = null;
  selectedConnectionId = null;
  canvasEl.innerHTML = "";
  initSvg();
  refreshSidebarFields();
  updatePreview();
  setStatus("Graph cleared.");
});

btnExportJson.addEventListener("click", () => {
  const data = {
    version: 2,
    modName,
    nodes,
    connections
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "threadjs-designer-graph.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus("Exported graph JSON.");
});

btnImportJson.addEventListener("click", () => {
  uploadInput.value = "";
  uploadInput.click();
});

uploadInput.addEventListener("change", async () => {
  const file = uploadInput.files && uploadInput.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.nodes)) {
      throw new Error("JSON has no 'nodes' array");
    }
    
    modName = parsed.modName || "designer-mod";
    fieldModName.value = modName;
    
    nodes = parsed.nodes.map(n => ({
      id: Number(n.id) || (nextNodeId++),
      type: n.type || "log",
      label: n.label || (NODE_DEFINITIONS[n.type]?.label || n.type),
      x: Number(n.x) || 40,
      y: Number(n.y) || 40,
      params: n.params || {},
      hasInput: n.hasInput !== undefined ? n.hasInput : true,
      hasOutput: n.hasOutput !== undefined ? n.hasOutput : true,
      color: n.color || "#868e96",
      customCode: n.customCode || ""
    }));
    
    connections = (parsed.connections || []).map(c => ({
      id: Number(c.id) || (nextConnectionId++),
      from: Number(c.from),
      to: Number(c.to)
    }));

    const maxNodeId = nodes.reduce((m, n) => Math.max(m, n.id), 0);
    const maxConnId = connections.reduce((m, c) => Math.max(m, c.id), 0);
    nextNodeId = maxNodeId + 1;
    nextConnectionId = maxConnId + 1;
    selectedNodeId = null;
    selectedConnectionId = null;

    canvasEl.innerHTML = "";
    initSvg();
    nodes.forEach(renderNode);
    renderConnections();
    refreshSidebarFields();
    updatePreview();
    setStatus(`Imported graph with ${nodes.length} node(s) and ${connections.length} connection(s).`);
  } catch (err) {
    console.error(err);
    setStatus("Failed to import graph: " + err.message, true);
  }
});

btnDownloadJs.addEventListener("click", () => {
  const code = previewCodeEl.textContent || "";
  const blob = new Blob([code], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename = (modName || "designer-mod").replace(/[^a-z0-9_-]/gi, '-') + ".js";
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus("Downloaded generated mod file.");
});

// Generate JS from nodes and connections
function generateJs() {
  const lines = [];
  const safeName = (modName || "designer-mod").replace(/[^a-z0-9_-]/gi, '-');
  lines.push("// Auto-generated by ThreadJS Designer");
  lines.push("// Edit parameters and add custom logic as needed");
  lines.push("");
  lines.push(`api.registerMod('${safeName}', {`);
  lines.push("  onInitialize(api) {");

  // Find all event/command nodes (no input connections)
  const entryNodes = nodes.filter(n => !n.hasInput);
  
  entryNodes.forEach(node => {
    lines.push("");
    lines.push(`    // Node #${node.id}: ${node.label}`);
    
    const code = generateNodeCode(node, 2);
    lines.push(...code);
  });

  lines.push("  }");
  lines.push("});");
  lines.push("");

  return lines.join("\n");
}

function generateNodeCode(node, indentLevel) {
  const indent = "  ".repeat(indentLevel);
  const lines = [];
  const p = node.params || {};

  switch (node.type) {
    // Events
    case "onServerTick":
      lines.push(`${indent}api.onServerTick(() => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    case "onPlayerJoin":
      lines.push(`${indent}api.onPlayerJoin((player) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    case "onPlayerLeave":
      lines.push(`${indent}api.onPlayerLeave((player) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    case "onPlayerTick":
      lines.push(`${indent}api.onPlayerTick((player) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    case "onChatMessage":
      lines.push(`${indent}api.onChatMessage((evt) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    case "onBlockBreak":
      lines.push(`${indent}api.onBlockBreak((evt) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    case "onBlockPlace":
      lines.push(`${indent}api.onBlockPlace((evt) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    case "onUseBlock":
      lines.push(`${indent}api.onUseBlock((evt) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    case "onUseItem":
      lines.push(`${indent}api.onUseItem((evt) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    case "onAttackEntity":
      lines.push(`${indent}api.onAttackEntity((evt) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    case "onEntityDamage":
      lines.push(`${indent}api.onEntityDamage((evt) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    case "onEntityDeath":
      lines.push(`${indent}api.onEntityDeath((evt) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    // Commands
    case "registerCommand":
      const cmdName = p.name || "mycommand";
      const permLevel = p.permLevel || "0";
      const playerOnly = p.playerOnly || false;
      lines.push(`${indent}api.registerCommand("${cmdName}", (ctx, args) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}}, ${permLevel}, ${playerOnly});`);
      break;
      
    // Messaging
    case "log":
      const availableVarsLog = getAvailableVariables(node.id);
      const logMsg = processParamValue(p.message || "Log message", availableVarsLog);
      lines.push(`${indent}api.log(${logMsg});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "broadcast":
      const availableVarsBc = getAvailableVariables(node.id);
      const bcMsg = processParamValue(p.message || "Broadcast message", availableVarsBc);
      lines.push(`${indent}api.sendMessage(${bcMsg});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "sendMessageTo":
      const availableVarsMsg = getAvailableVariables(node.id);
      const toPlayer = processParamValue(p.player || "playerName", availableVarsMsg);
      const toMsg = processParamValue(p.message || "Hello!", availableVarsMsg);
      lines.push(`${indent}api.sendMessageTo(${toPlayer}, ${toMsg});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    // World
    case "setBlock":
      lines.push(`${indent}api.world.setBlock(${p.x}, ${p.y}, ${p.z}, ${JSON.stringify(p.dimension)}, ${JSON.stringify(p.blockId)});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "getBlock":
      lines.push(`${indent}const block = api.world.getBlock(${p.x}, ${p.y}, ${p.z}, ${JSON.stringify(p.dimension)});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "fillArea":
      lines.push(`${indent}api.world.fillArea(${p.x1}, ${p.y1}, ${p.z1}, ${p.x2}, ${p.y2}, ${p.z2}, ${JSON.stringify(p.dimension)}, ${JSON.stringify(p.blockId)});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "replaceBlocks":
      lines.push(`${indent}api.world.replaceBlocks(${p.x1}, ${p.y1}, ${p.z1}, ${p.x2}, ${p.y2}, ${p.z2}, ${JSON.stringify(p.dimension)}, ${JSON.stringify(p.from)}, ${JSON.stringify(p.to)});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    // Players
    case "getPlayers":
      lines.push(`${indent}const players = api.players.list();`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "teleport":
      lines.push(`${indent}api.players.teleport(${JSON.stringify(p.player)}, ${p.x}, ${p.y}, ${p.z}, ${JSON.stringify(p.dimension)});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "setGamemode":
      lines.push(`${indent}api.players.setGamemode(${JSON.stringify(p.player)}, ${JSON.stringify(p.mode)});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "setHealth":
      lines.push(`${indent}api.players.setHealth(${JSON.stringify(p.player)}, ${p.health});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "heal":
      lines.push(`${indent}api.players.heal(${JSON.stringify(p.player)}, ${p.amount});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "giveItem":
      lines.push(`${indent}api.players.giveItem(${JSON.stringify(p.player)}, ${JSON.stringify(p.itemId)}, ${p.count});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    // Entities
    case "spawnEntity":
      lines.push(`${indent}const entityId = api.entities.spawn(${JSON.stringify(p.entityType)}, ${p.x}, ${p.y}, ${p.z}, ${JSON.stringify(p.dimension)});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "killEntity":
      lines.push(`${indent}api.entities.kill(${JSON.stringify(p.entityUuid)});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "findEntities":
      const findType = p.type ? `, typeId: ${JSON.stringify(p.type)}` : "";
      lines.push(`${indent}const entities = api.entities.find({`);
      lines.push(`${indent}  center: { x: ${p.x}, y: ${p.y}, z: ${p.z}, dimensionId: ${JSON.stringify(p.dimension)} },`);
      lines.push(`${indent}  radius: ${p.radius}${findType}`);
      lines.push(`${indent}});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    // Sound
    case "playSound":
      lines.push(`${indent}api.playSound(${JSON.stringify(p.soundId)}, ${p.volume}, ${p.pitch});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "playSoundTo":
      lines.push(`${indent}api.playSoundTo(${JSON.stringify(p.player)}, ${JSON.stringify(p.soundId)}, ${p.volume}, ${p.pitch});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "playSoundAt":
      lines.push(`${indent}api.playSoundAt(${p.x}, ${p.y}, ${p.z}, ${JSON.stringify(p.dimension)}, ${JSON.stringify(p.soundId)}, ${p.volume}, ${p.pitch});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    // Data
    case "loadData":
      lines.push(`${indent}const data = api.data.load(${JSON.stringify(p.namespace)}, ${JSON.stringify(p.key)});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "saveData":
      lines.push(`${indent}api.data.save(${JSON.stringify(p.namespace)}, ${JSON.stringify(p.key)}, ${p.value});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    // Scheduling
    case "runLater":
      lines.push(`${indent}api.scheduling.runLater(${p.ticks}, () => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    case "runRepeating":
      lines.push(`${indent}api.scheduling.runRepeating(${p.interval}, () => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    // Control
    case "if":
      lines.push(`${indent}if (${p.condition}) {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}}`);
      break;
      
    case "forEach":
      lines.push(`${indent}${p.array}.forEach((${p.varName}) => {`);
      lines.push(...generateConnectedNodes(node, indentLevel + 1));
      lines.push(`${indent}});`);
      break;
      
    default:
      lines.push(`${indent}// TODO: ${node.type}`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
  }

  return lines;
}

function generateConnectedNodes(fromNode, indentLevel) {
  const lines = [];
  const indent = "  ".repeat(indentLevel);
  
  // Find all connections from this node
  const outgoingConns = connections.filter(c => c.from === fromNode.id);
  
  // Generate code for connected nodes
  outgoingConns.forEach(conn => {
    const toNode = findNode(conn.to);
    if (!toNode) return;
    
    lines.push("");
    lines.push(`${indent}// → ${toNode.label}`);
    lines.push(...generateNodeCode(toNode, indentLevel));
  });
  
  return lines;
}

function updatePreview() {
  if (!previewCodeEl) return;
  previewCodeEl.textContent = generateJs();
}

function indentLines(str, indentLevel) {
  const indent = "  ".repeat(indentLevel);
  return String(str)
    .split("\n")
    .map((line) => (line.trim() ? indent + line : ""))
    .join("\n");
}

// Get all available variables for a node based on its parent chain
function getAvailableVariables(nodeId) {
  const vars = new Set();
  const visited = new Set();
  
  function collectVarsFromParents(id) {
    if (visited.has(id)) return;
    visited.add(id);
    
    // Find all incoming connections
    const incomingConns = connections.filter(c => c.to === id);
    
    incomingConns.forEach(conn => {
      const parentNode = findNode(conn.from);
      if (!parentNode) return;
      
      const def = NODE_DEFINITIONS[parentNode.type];
      if (def && def.provides) {
        def.provides.forEach(v => vars.add(v));
      }
      
      // Recursively collect from parent's parents
      collectVarsFromParents(conn.from);
    });
  }
  
  collectVarsFromParents(nodeId);
  return Array.from(vars).sort();
}

// Get detailed variable information including all available properties
function getAvailableVariablesWithSchema(nodeId) {
  const baseVars = getAvailableVariables(nodeId);
  const result = [];
  
  baseVars.forEach(varName => {
    const schema = VARIABLE_SCHEMAS[varName];
    if (!schema) {
      result.push({ name: varName, properties: [] });
      return;
    }
    
    // Get properties, handling extends
    let properties = schema.properties || {};
    if (schema.extends) {
      const baseSchema = VARIABLE_SCHEMAS[schema.extends];
      if (baseSchema && baseSchema.properties) {
        properties = { ...baseSchema.properties, ...properties };
      }
    }
    
    // Build list of available properties
    const props = Object.keys(properties).map(propName => {
      const fullPath = propName.startsWith('[') ? `${varName}${propName}` : `${varName}.${propName}`;
      return {
        path: fullPath,
        type: properties[propName].type,
        description: properties[propName].description
      };
    });
    
    result.push({
      name: varName,
      type: schema.type,
      description: schema.description,
      properties: props
    });
  });
  
  return result;
}

// Get autocomplete suggestions based on current input
function getAutocompleteSuggestions(input, availableVars) {
  const suggestions = [];
  
  // Check if typing a variable name (starts with $ or contains variable reference)
  const varMatch = input.match(/["']\$?([a-zA-Z_][a-zA-Z0-9_.]*)$/);
  if (!varMatch) return suggestions;
  
  const partial = varMatch[1];
  const parts = partial.split('.');
  
  if (parts.length === 1) {
    // Suggesting base variable names
    const prefix = parts[0].toLowerCase();
    availableVars.forEach(varName => {
      const baseName = varName.split('.')[0];
      if (baseName.toLowerCase().startsWith(prefix) && !suggestions.some(s => s.value === baseName)) {
        const schema = VARIABLE_SCHEMAS[varName] || VARIABLE_SCHEMAS[baseName];
        suggestions.push({
          value: baseName,
          type: schema?.type || 'variable',
          description: schema?.description || 'Available variable'
        });
      }
    });
  } else {
    // Suggesting properties of a variable
    const varName = parts[0];
    const propPath = parts.slice(1, -1).join('.');
    const propPrefix = parts[parts.length - 1].toLowerCase();
    
    // Find schema for this variable
    let schema = VARIABLE_SCHEMAS[varName];
    if (!schema) {
      // Try to find in available vars (might be nested like evt.player)
      const fullVar = availableVars.find(v => v.startsWith(varName));
      if (fullVar) schema = VARIABLE_SCHEMAS[fullVar];
    }
    
    if (schema) {
      // Handle extends
      let properties = schema.properties || {};
      if (schema.extends) {
        const baseSchema = VARIABLE_SCHEMAS[schema.extends];
        if (baseSchema && baseSchema.properties) {
          properties = { ...baseSchema.properties, ...properties };
        }
      }
      
      // Filter properties by prefix
      Object.entries(properties).forEach(([propName, propDef]) => {
        if (propName.startsWith('[')) return; // Skip array accessors
        if (propName.toLowerCase().startsWith(propPrefix)) {
          suggestions.push({
            value: `${varName}.${propName}`,
            type: propDef.type,
            description: propDef.description,
            example: propDef.example
          });
        }
      });
    }
  }
  
  return suggestions;
}

// Show autocomplete dropdown
function showAutocomplete(suggestions, textarea) {
  if (!autocompleteDropdown || suggestions.length === 0) {
    hideAutocomplete();
    return;
  }
  
  autocompleteItems = suggestions;
  autocompleteSelectedIndex = -1;
  
  // Build HTML
  let html = '';
  suggestions.forEach((item, index) => {
    html += `<div class="autocomplete-item" data-index="${index}">`;
    html += `<div><code>${item.value}</code>`;
    if (item.type) html += `<span class="autocomplete-item-type">${item.type}</span>`;
    html += '</div>';
    if (item.description) {
      html += `<div class="autocomplete-item-desc">${item.description}</div>`;
    }
    html += '</div>';
  });
  
  autocompleteDropdown.innerHTML = html;
  
  // Position dropdown
  const rect = textarea.getBoundingClientRect();
  const parentRect = textarea.parentElement.getBoundingClientRect();
  autocompleteDropdown.style.left = '0';
  autocompleteDropdown.style.top = (rect.bottom - parentRect.top + 2) + 'px';
  autocompleteDropdown.classList.add('active');
  autocompleteActive = true;
  
  // Add click handlers
  autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      selectAutocompleteItem(index, textarea);
    });
    
    item.addEventListener('mouseenter', () => {
      autocompleteSelectedIndex = parseInt(item.dataset.index);
      updateAutocompleteSelection();
    });
  });
}

// Hide autocomplete dropdown
function hideAutocomplete() {
  if (autocompleteDropdown) {
    autocompleteDropdown.classList.remove('active');
    autocompleteActive = false;
    autocompleteItems = [];
    autocompleteSelectedIndex = -1;
  }
}

// Update visual selection in autocomplete
function updateAutocompleteSelection() {
  if (!autocompleteDropdown) return;
  
  autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach((item, index) => {
    item.classList.toggle('selected', index === autocompleteSelectedIndex);
  });
}

// Select an autocomplete item and insert it
function selectAutocompleteItem(index, textarea) {
  if (index < 0 || index >= autocompleteItems.length) return;
  
  const item = autocompleteItems[index];
  const value = textarea.value;
  const cursorPos = textarea.selectionStart;
  
  // Find the start of the current word
  const beforeCursor = value.substring(0, cursorPos);
  const match = beforeCursor.match(/["']\$?([a-zA-Z_][a-zA-Z0-9_.]*)$/);
  
  if (match) {
    const startPos = cursorPos - match[1].length;
    const afterCursor = value.substring(cursorPos);
    
    // Insert the completion
    const newValue = value.substring(0, startPos) + item.value + afterCursor;
    textarea.value = newValue;
    
    // Update cursor position
    const newCursorPos = startPos + item.value.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    
    // Trigger input event to save changes
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  hideAutocomplete();
  textarea.focus();
}

// Handle autocomplete keyboard navigation
function handleAutocompleteKeydown(e, textarea) {
  if (!autocompleteActive) return false;
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      autocompleteSelectedIndex = Math.min(autocompleteSelectedIndex + 1, autocompleteItems.length - 1);
      updateAutocompleteSelection();
      return true;
      
    case 'ArrowUp':
      e.preventDefault();
      autocompleteSelectedIndex = Math.max(autocompleteSelectedIndex - 1, -1);
      updateAutocompleteSelection();
      return true;
      
    case 'Enter':
    case 'Tab':
      if (autocompleteSelectedIndex >= 0) {
        e.preventDefault();
        selectAutocompleteItem(autocompleteSelectedIndex, textarea);
        return true;
      }
      break;
      
    case 'Escape':
      e.preventDefault();
      hideAutocomplete();
      return true;
  }
  
  return false;
}

// Process parameter value to support variable references
function processParamValue(value, availableVars) {
  if (typeof value !== 'string') return value;
  
  // If value starts with $, treat as variable reference
  if (value.startsWith('$')) {
    const varName = value.substring(1);
    if (availableVars.includes(varName) || availableVars.some(v => v.startsWith(varName + '.'))) {
      return varName; // Return without quotes
    }
  }
  
  // Template string support: "Welcome ${player.name}!"
  if (value.includes('${')) {
    return '`' + value.replace(/\$\{/g, '${') + '`';
  }
  
  return JSON.stringify(value);
}

// Initial boot
async function initializeDesigner() {
  // Load variable schemas and node definitions first
  await initializeVariableSchemas();
  await initializeNodeDefinitions();
  
  // Then initialize the designer
  initSvg();
  attachFieldHandlers();
  modName = fieldModName.value || "designer-mod";
  updatePreview();
  setStatus("Ready. Click nodes from the toolbox to get started.");
}

// Initialize node version selector
if (window.ThreadJsVersion && window.ThreadJsVersion.initSelector) {
  window.ThreadJsVersion.initSelector({
    selector: 'versionSelectNodes',
    filePattern: /^v[\d.]+\-nodes\.(yaml|yml)$/,
    onChange: async (version) => {
      try {
        const response = await fetch(version.yamlPath);
        const yamlText = await response.text();
        const yamlData = jsyaml.load(yamlText);
        loadNodeDefinitionsFromYaml(yamlData);
        console.log('Switched to node version:', version.version);
      } catch (error) {
        console.error('Error switching node version:', error);
        setStatus('Error loading node version', true);
      }
    }
  });
}

// Start initialization
initializeDesigner();
