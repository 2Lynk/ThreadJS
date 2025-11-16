// ThreadJS Designer - Enhanced with connections and full API support

const canvasWrapper = document.getElementById("canvas-wrapper");
const canvasEl = document.getElementById("canvas");
const toolbox = document.getElementById("toolbox");

const fieldLabel = document.getElementById("field-node-label");
const fieldType = document.getElementById("field-node-type");
const fieldEvent = document.getElementById("field-node-event");
const fieldMessage = document.getElementById("field-node-message");
const fieldCustom = document.getElementById("field-node-custom");

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

// Node type definitions with metadata
const NODE_DEFINITIONS = {
  // Events
  onServerTick: { label: "Server Tick", color: "#845ef7", hasInput: false, hasOutput: true, params: {} },
  onPlayerJoin: { label: "Player Join", color: "#4c6ef5", hasInput: false, hasOutput: true, params: {} },
  onPlayerLeave: { label: "Player Leave", color: "#4c6ef5", hasInput: false, hasOutput: true, params: {} },
  onPlayerTick: { label: "Player Tick", color: "#4c6ef5", hasInput: false, hasOutput: true, params: {} },
  onChatMessage: { label: "Chat Message", color: "#15aabf", hasInput: false, hasOutput: true, params: {} },
  onBlockBreak: { label: "Block Break", color: "#74b816", hasInput: false, hasOutput: true, params: {} },
  onBlockPlace: { label: "Block Place", color: "#74b816", hasInput: false, hasOutput: true, params: {} },
  onUseBlock: { label: "Use Block", color: "#74b816", hasInput: false, hasOutput: true, params: {} },
  onUseItem: { label: "Use Item", color: "#f59f00", hasInput: false, hasOutput: true, params: {} },
  onAttackEntity: { label: "Attack Entity", color: "#f03e3e", hasInput: false, hasOutput: true, params: {} },
  onEntityDamage: { label: "Entity Damage", color: "#f03e3e", hasInput: false, hasOutput: true, params: {} },
  onEntityDeath: { label: "Entity Death", color: "#f03e3e", hasInput: false, hasOutput: true, params: {} },
  
  // Commands
  registerCommand: { label: "Register Command", color: "#20c997", hasInput: false, hasOutput: true, params: { name: "", permLevel: "0", playerOnly: false } },
  
  // Messaging
  log: { label: "Log", color: "#868e96", hasInput: true, hasOutput: true, params: { message: "" } },
  broadcast: { label: "Broadcast", color: "#15aabf", hasInput: true, hasOutput: true, params: { message: "" } },
  sendMessageTo: { label: "Send Message To", color: "#15aabf", hasInput: true, hasOutput: true, params: { player: "", message: "" } },
  
  // World
  setBlock: { label: "Set Block", color: "#74b816", hasInput: true, hasOutput: true, params: { x: "0", y: "64", z: "0", dimension: "minecraft:overworld", blockId: "minecraft:stone" } },
  getBlock: { label: "Get Block", color: "#74b816", hasInput: true, hasOutput: true, params: { x: "0", y: "64", z: "0", dimension: "minecraft:overworld" } },
  fillArea: { label: "Fill Area", color: "#74b816", hasInput: true, hasOutput: true, params: { x1: "0", y1: "64", z1: "0", x2: "10", y2: "74", z2: "10", dimension: "minecraft:overworld", blockId: "minecraft:stone" } },
  replaceBlocks: { label: "Replace Blocks", color: "#74b816", hasInput: true, hasOutput: true, params: { x1: "0", y1: "64", z1: "0", x2: "10", y2: "74", z2: "10", dimension: "minecraft:overworld", from: "minecraft:dirt", to: "minecraft:grass_block" } },
  
  // Players
  getPlayers: { label: "Get Players", color: "#4c6ef5", hasInput: true, hasOutput: true, params: {} },
  teleport: { label: "Teleport", color: "#4c6ef5", hasInput: true, hasOutput: true, params: { player: "", x: "0", y: "64", z: "0", dimension: "minecraft:overworld" } },
  setGamemode: { label: "Set Gamemode", color: "#4c6ef5", hasInput: true, hasOutput: true, params: { player: "", mode: "SURVIVAL" } },
  setHealth: { label: "Set Health", color: "#e64980", hasInput: true, hasOutput: true, params: { player: "", health: "20" } },
  heal: { label: "Heal", color: "#e64980", hasInput: true, hasOutput: true, params: { player: "", amount: "5" } },
  giveItem: { label: "Give Item", color: "#f59f00", hasInput: true, hasOutput: true, params: { player: "", itemId: "minecraft:diamond", count: "1" } },
  
  // Entities
  spawnEntity: { label: "Spawn Entity", color: "#37b24d", hasInput: true, hasOutput: true, params: { entityType: "minecraft:cow", x: "0", y: "64", z: "0", dimension: "minecraft:overworld" } },
  killEntity: { label: "Kill Entity", color: "#f03e3e", hasInput: true, hasOutput: true, params: { entityUuid: "" } },
  findEntities: { label: "Find Entities", color: "#37b24d", hasInput: true, hasOutput: true, params: { x: "0", y: "64", z: "0", dimension: "minecraft:overworld", radius: "16", type: "" } },
  
  // Sound
  playSound: { label: "Play Sound", color: "#845ef7", hasInput: true, hasOutput: true, params: { soundId: "entity.player.levelup", volume: "1.0", pitch: "1.0" } },
  playSoundTo: { label: "Play Sound To", color: "#845ef7", hasInput: true, hasOutput: true, params: { player: "", soundId: "entity.player.levelup", volume: "1.0", pitch: "1.0" } },
  playSoundAt: { label: "Play Sound At", color: "#845ef7", hasInput: true, hasOutput: true, params: { x: "0", y: "64", z: "0", dimension: "minecraft:overworld", soundId: "entity.player.levelup", volume: "1.0", pitch: "1.0" } },
  
  // Data
  loadData: { label: "Load Data", color: "#f59f00", hasInput: true, hasOutput: true, params: { namespace: "", key: "" } },
  saveData: { label: "Save Data", color: "#f59f00", hasInput: true, hasOutput: true, params: { namespace: "", key: "", value: "{}" } },
  
  // Scheduling
  runLater: { label: "Run Later", color: "#fab005", hasInput: true, hasOutput: true, params: { ticks: "20" } },
  runRepeating: { label: "Run Repeating", color: "#fab005", hasInput: true, hasOutput: true, params: { interval: "20" } },
  
  // Control
  if: { label: "If Condition", color: "#868e96", hasInput: true, hasOutput: true, params: { condition: "true" } },
  forEach: { label: "For Each", color: "#868e96", hasInput: true, hasOutput: true, params: { array: "[]", varName: "item" } }
};

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
  const nodeId = Number(e.target.dataset.nodeId);
  const isOutput = e.target.dataset.portType === "output";
  
  if (isOutput) {
    // Start dragging connection from output
    connectionDragStart = { nodeId, port: e.target };
    tempConnectionEnd = { x: e.clientX, y: e.clientY };
    
    document.addEventListener("mousemove", onConnectionDrag);
    document.addEventListener("mouseup", onConnectionDragEnd);
    
    canvasEl.style.cursor = "crosshair";
  } else {
    // Click on input port - try to connect if we have a drag in progress
    if (connectionDragStart) {
      createConnection(connectionDragStart.nodeId, nodeId);
      connectionDragStart = null;
      tempConnectionEnd = null;
      canvasEl.style.cursor = "";
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
  
  // Use params as JSON for now
  fieldEvent.value = Object.keys(node.params || {}).join(", ");
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

  fieldMessage.addEventListener("input", () => {
    const node = selectedNodeId ? findNode(selectedNodeId) : null;
    if (!node) return;
    try {
      node.params = JSON.parse(fieldMessage.value);
      renderNode(node);
      updatePreview();
    } catch (e) {
      // Invalid JSON, ignore
    }
  });

  fieldCustom.addEventListener("input", () => {
    const node = selectedNodeId ? findNode(selectedNodeId) : null;
    if (!node) return;
    node.customCode = fieldCustom.value;
    updatePreview();
  });
}

// Click on empty canvas -> clear selection
canvasEl.addEventListener("mousedown", (e) => {
  if (e.target === canvasEl) {
    clearSelection();
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
  a.download = "threadjs-designer-mod.js";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus("Downloaded generated mod file.");
});

// Generate JS from nodes and connections
function generateJs() {
  const lines = [];
  lines.push("// Auto-generated by ThreadJS Designer");
  lines.push("// Edit parameters and add custom logic as needed");
  lines.push("");
  lines.push("api.registerMod('designer-mod', {");
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
      const logMsg = p.message || "Log message";
      lines.push(`${indent}api.log(${JSON.stringify(logMsg)});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "broadcast":
      const bcMsg = p.message || "Broadcast message";
      lines.push(`${indent}api.sendMessage(${JSON.stringify(bcMsg)});`);
      if (node.customCode) lines.push(indentLines(node.customCode, indentLevel));
      lines.push(...generateConnectedNodes(node, indentLevel));
      break;
      
    case "sendMessageTo":
      const toPlayer = p.player || "playerName";
      const toMsg = p.message || "Hello!";
      lines.push(`${indent}api.sendMessageTo(${JSON.stringify(toPlayer)}, ${JSON.stringify(toMsg)});`);
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

// Initial boot
initSvg();
attachFieldHandlers();
updatePreview();
setStatus("Ready. Click nodes from the toolbox to get started.");
