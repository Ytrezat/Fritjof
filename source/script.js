/* =============================================================================================================
======  BOARD INITIALISATION  ======
============================================================================================================= */

function createBoardArray(){
  for(let x=0;x<SIZE;x++){
    board[x]=[]
    for(let y=0;y<SIZE;y++)
      board[x][y]=EMPTY
  }
  return board
}

function copyBoard(src){
  return src.map(row => [...row])
}

/* =============================================================================================================
======  MOVE DEFINITION  ======
============================================================================================================= */

class MoveNode {
  constructor(board, move = null, parent = null, player = ATTACKER, moveNumber=0) {
    this.board = board
    this.king = [(SIZE-1)/2,(SIZE-1)/2]
    this.move = move
    this.parent = parent
    this.children = []
    this.player = player
    this.moveNumber = moveNumber
    this.lastMoveWithCapture = 1
    this.moveHistory = []
    this.countPieces = [24,12]
    this.comment = ""
    this.collapsed = false
    this.keepExpanded = false
    this.expanded = false
    this.color = 0
    this.annotations = {
      highlights: [], // e.g. [{ square: "e4" }]
      arrows: [],     // e.g. [{ from: "e2", to: "e4" }]
    }
    this.gameover = 0 // 0: ongoing, -1: white resigns, 1: black resigns, 2: draw
  }
}

/* =============================================================================================================
======  MOVE EXECUTION  ======
============================================================================================================= */

function makeMove(x1,y1,x2,y2){
  let blackCount = currentNode.countPieces[0]
  let whiteCount = currentNode.countPieces[1]
  captured = playMove(board,x1,y1,x2,y2)
  if(currentNode.player === ATTACKER){ whiteCount -= captured.length }
  if(currentNode.player === DEFENDER){ blackCount -= captured.length }

  const moveObj = {from:[x1,y1], to:[x2,y2]}

  let existing = currentNode.children.find(child =>
    child.move &&
    child.move.from[0] === moveObj.from[0] &&
    child.move.from[1] === moveObj.from[1] &&
    child.move.to[0] === moveObj.to[0] &&
    child.move.to[1] === moveObj.to[1]
  )

  resetAllManualExpansions()

  const nextPlayer =
    currentNode.player === ATTACKER ? DEFENDER : ATTACKER

  if (existing) {
    currentNode = existing
    loadBoard(existing)
  } else {
    const newNode = new MoveNode(
      copyBoard(board),
      moveObj,
      currentNode,
      nextPlayer,
      currentNode.moveNumber + 1
    )
    newNode.king = board[x2][y2]===KING ? [x2,y2] : currentNode.king
    if (captured.length > 0) {
      newNode.lastMoveWithCapture = newNode.moveNumber
      newNode.countPieces = [blackCount,whiteCount]
    } else {
      newNode.lastMoveWithCapture = currentNode.lastMoveWithCapture
      newNode.countPieces = currentNode.countPieces
    }
  
    newNode.moveHistory = [
      ...(currentNode.moveHistory || []),
      {
        from: [x1, y1],
        to: [x2, y2],
        captured: captured.length
      }
    ].slice(-MAXLENGTH_DIRECTION_REPETITION);
      
    currentNode.children.push(newNode)
    currentNode = newNode
  }

  // always sync from node, never manually flip
  currentPlayer = currentNode.player
  checkEndGame(x2,y2);
  renderVariationTree()

}

function checkEndGame(x,y){ //x,y is the destination of the last piece that moved
  winner = null;
  winType = "";
  winSquares = [];
  if(currentNode.gameover===-1){
     winner = "black";
     winType = "White resigned"
     winSquares = [currentNode.king]
  }
  else if(currentNode.gameover===1){
     winner = "white";
     winType = "Black resigned"
     winSquares = [currentNode.king]
  }
  else if(currentNode.gameover===2){
     winner = "draw";
     winType = ""
     winSquares = [[5,5]]
  }
  else{
    checkInfiniteGame(currentNode.moveNumber,currentNode.lastMoveWithCapture,currentNode.move.to)
    if(board[x][y]===KING) checkWinforWhite(x,y);
    if(board[x][y]===ATTACKER) checkWinforBlack(x,y,currentNode.king);
    if (currentNode.moveHistory.length === MAXLENGTH_DIRECTION_REPETITION){
      checkRepetition(currentNode.moveHistory);
    }
  }
}
/* =============================================================================================================
======  VARIATION TREE ENGINE  ======
============================================================================================================= */
/*
  Width = columns reserved by this subtree
  Main line stays in same column, so it does NOT consume extra width.
  Side branches each consume width to the right.
*/
function measureSubtree(node, activePathSet, widthMap) {
  const visibleChildren = getVisibleChildren(node, activePathSet)

  let width = 1 // at least one column for this node/mainline

  // measure all children and sum side branch widths
  for (let i = 0; i < visibleChildren.length; i++) {
    const childWidth = measureSubtree(visibleChildren[i], activePathSet, widthMap)
    if (i > 0) width += childWidth // skip mainline (i=0) in width increment
  }

  widthMap.set(node, width)
  return width
}

function collapseToCurrentContext() {
  function dfs(node) {
    node.expanded = false
    node.children.forEach(dfs)
  }

  dfs(rootNode)

  // Expand only root -> current path
  let n = currentNode
  while (n) {
    n.expanded = true
    n = n.parent
  }

  // Collapse all descendants of currentNode
  function collapseDescendants(node) {
    node.children.forEach(child => {
      child.expanded = false
      collapseDescendants(child)
    })
  }
  collapseDescendants(currentNode)
}

/*
  Visibility policy:
  - Always show the main line child (children[0])
  - Always show children of nodes on the active path
  - Show all children if node.expanded
*/
function getVisibleChildren(node, activePathSet) {
  if (!node.children.length) return []

  // Explicit collapse: show only mainline
  if (node.collapsed) {
    return [node.children[0]]
  }

  // Find the child on the active path, if any
  const activeChild = node.children.find(child => activePathSet.has(child))

  // If node is on the active path:
  // show mainline + active child (if different)
  if (activePathSet.has(node)) {
    const visible = [node.children[0]]
    if (activeChild && activeChild !== node.children[0]) {
      visible.push(activeChild)
    }
    // Also show all children if user manually expanded this node
    if (node.keepExpanded) {
      return node.children
    }
    return visible
  }

  // Off-path nodes: show all only if manually expanded
  if (node.keepExpanded || node.expanded) {
    return node.children
  }

  // Default off-path: mainline only
  return [node.children[0]]
}

/*
  Layout:
  - node is placed at (baseCol, row)
  - first child continues in same column
  - side branches are placed in reserved blocks to the right
*/
function layoutTree(node, row, baseCol, activePathSet, widthMap, nodePos) {
  nodePos.set(node, { row, col: baseCol })

  const visibleChildren = getVisibleChildren(node, activePathSet)
  if (!visibleChildren.length) return

  // Main line (first child)
  if (visibleChildren[0]) {
    layoutTree(visibleChildren[0], row + 1, baseCol, activePathSet, widthMap, nodePos)
  }

  // Side branches
  let offset = baseCol + 1
  for (let i = 1; i < visibleChildren.length; i++) {
    const child = visibleChildren[i]
    layoutTree(child, row + 1, offset, activePathSet, widthMap, nodePos)
    offset += widthMap.get(child)
  }
}

function resetAllManualExpansions(node = rootNode) {
  node.keepExpanded = false
  node.children.forEach(resetAllManualExpansions)
}

function prepareTreeForRendering() {
  collapseToCurrentContext()
  
  const activePathSet = new Set()
  let n = currentNode
  while (n) {
    activePathSet.add(n)
    n = n.parent
  }

  function autoCollapse(node) {
    if (!activePathSet.has(node) && !node.keepExpanded) {
      node.expanded = false
    }
    node.children.forEach(autoCollapse)
  }

  autoCollapse(rootNode)

  return activePathSet
}

function addVariationControls(div, node, activePathSet) {
  const visibleChildren = getVisibleChildren(node, activePathSet)
  const hiddenCount = node.children.length - visibleChildren.length
  const isBranching = node.children.length > 1
  const variationCount = Math.max(0, node.children.length - 1)

  if (hiddenCount > 0) {
    const expander = document.createElement("span")
    drawArrowExpander(expander,variationCount,hiddenCount)
    expander.addEventListener("click", e => {
      e.stopPropagation()
      resetAllManualExpansions()
      focusNode(node, true)
    })
    div.appendChild(expander)

  } else if (isBranching) {
    const collapse = document.createElement("span")
    drawArrowCollapser(collapse,variationCount)
    collapse.addEventListener("click", e => {
      e.stopPropagation()
      resetAllManualExpansions()
      focusNode(node, false)
    })
    div.appendChild(collapse)
  }
}

function renderVariationTree() {
  const container = document.getElementById("variationTree")
  container.innerHTML = ""

  const activePathSet = prepareTreeForRendering()
  
  const widthMap = new Map()
  const nodePos = new Map()
  measureSubtree(rootNode, activePathSet, widthMap)
  layoutTree(rootNode, 0, 0, activePathSet, widthMap, nodePos)

  const totalCols = widthMap.get(rootNode)
  container.style.gridTemplateColumns =
    `repeat(${Math.max(totalCols, 2)}, max-content)`

  const orderedNodes = [...nodePos.entries()].sort((a, b) => {
    const pa = a[1], pb = b[1]
    if (pa.row !== pb.row) return pa.row - pb.row
    return pa.col - pb.col
  })

  const nodeElements = []
  const divByNode = new Map()

  for (const [node, pos] of orderedNodes) {
    const div = document.createElement("div")
    drawMoveTag(div,node,currentNode,pos,activePathSet);
    addVariationControls(div, node, activePathSet)
    attachNodeEvents(div, node)

    container.appendChild(div)
    nodeElements.push({ node, div })
    divByNode.set(node, div)
  }

  drawVariationLines(container, nodeElements, nodePos, divByNode)
  contextMenu.classList.add("hidden");
}

/* =================================
======  TOOLS IN TREE  ======
================================== */

function promoteToMainLine(node) {
  if (!node || !node.parent) return false;

  const parent = node.parent;
  const idx = parent.children.indexOf(node);

  if (idx <= 0) return false; // root or already main line

  // Move clicked variation to main line
  parent.children.splice(idx, 1);
  parent.children.unshift(node);

  // Keep currentNode as-is, but resync board/UI from it
  loadBoard(currentNode);
  renderVariationTree();
  updateCommentUI();

  return true;
}

function deleteNode(node) {
  const confirmDelete = confirm(
    "Delete this node and all the variations from there? This cannot be undone."
  );
  if (!confirmDelete) return;

  if (node === rootNode) {
    alert("Cannot delete the root node.");
    return;
  }

  const parent = node.parent;
  if (parent) {
    parent.children = parent.children.filter(child => child !== node);
  }

  let temp = currentNode;
  while (temp) {
    if (temp === node) {
      currentNode = parent || rootNode;
      loadBoard(currentNode);
      break;
    }
    temp = temp.parent;
  }

  renderVariationTree();
}

function focusNode(node, autoExpand = false) {
  // Select the clicked move first
  currentNode = node
  loadBoard(currentNode)
  
  winner = null
  if(currentNode.moveNumber!=0){
    checkEndGame(currentNode.move.to[0],currentNode.move.to[1])
  }
  // Reset previous manual expand/collapse state
  //resetAllManualExpansions()

  // If requested, manually expand this node
  if (autoExpand && node.children.length > 1) {
    node.keepExpanded = true
  }
  render();
  updateCommentUI();
  renderVariationTree();
}

/* =============================================================================================================
======  USER INTERFACE  ======
============================================================================================================= */
function onLeftClick(){
  document.addEventListener("click", () => {
    contextMenu.classList.add("hidden");
    leftfloatingMenu.classList.add("hidden");
  });
}

function setAnalysisName() {
  const name = prompt("Enter file name:", analysisName || "");
  if (name === null) return; // user cancelled

  analysisName = name.trim();
  updateAnalysisNameUI();
}

function createBoardUI(){

  boardEl.innerHTML=""

  for(let y=0;y<SIZE;y++){
    for(let x=0;x<SIZE;x++){

      const sq=document.createElement("div")
      sq.classList.add("square")

      sq.dataset.x=x
      sq.dataset.y=y

      if((x+y)%2===0) sq.classList.add("dark")
      else sq.classList.add("light")

      if(isCorner(x,y)) sq.classList.add("corner")
      if(isThrone(x,y)) sq.classList.add("throne")

      sq.addEventListener("dblclick", onDoubleClick)
      sq.addEventListener("mousedown", onSquareMouseDown)
      sq.addEventListener("mouseup", onSquareMouseUp)
      sq.addEventListener("contextmenu", e => e.preventDefault())

      boardEl.appendChild(sq)

    }
  }

  // SVG overlay for arrows
  addSVGOverlay(boardEl);
  
  const frame = document.getElementById("boardFrame");
  if (frame) {frame.classList.toggle("coords-hidden", !coordinatesVisible);}

  const savedTheme = localStorage.getItem("boardTheme");
  if (savedTheme) applyBoardTheme(savedTheme);
  else applyBoardTheme(boardTheme);
}

function updateTurnSelectorUI() {
  if (gameMode !== "edit") return;

  const attackerBtn = document.getElementById("attackerButton");
  const defenderBtn = document.getElementById("defenderButton");

  if (currentPlayer === ATTACKER) {
    attackerBtn.classList.add("active");
    defenderBtn.classList.remove("active");
  } else {
    attackerBtn.classList.remove("active");
    defenderBtn.classList.add("active");
  }
}

function updateCommentUI(){
  const input = document.getElementById("commentInput")
  input.value = currentNode && currentNode.comment ? currentNode.comment : ""
  updatePlayComment(currentNode.comment)
}

function render() {
  drawBoardSquares(currentNode)
  updateTurnUI(currentPlayer,winner)
  updateModeUI(gameMode)
  updateTurnSelectorUI()
  const comment = currentNode.comment ? currentNode.comment.trim() : "";
  updateCommentUI();
  updatePlayComment(comment)
  renderAnnotations()
  updatePieceCounters(currentNode)
}

function updateAnalysisNameUI() {
  const el = document.getElementById("analysisNameDisplay");

  if (!analysisName) {
    el.textContent = "";
  } else {
    el.textContent = analysisName;
  }
}

function squareKey(x, y) {
  return `${x},${y}`
}

function arrowKey(x1, y1, x2, y2) {
  return `${x1},${y1}->${x2},${y2}`
}

function toggleSquareHighlight(x, y) {
  const key = squareKey(x, y)
  const list = currentNode.annotations.highlights

  const index = list.findIndex(h => h === key)

  if (index >= 0) {
    list.splice(index, 1)
  } else {
    list.push(key)
  }
}

function toggleArrow(x1, y1, x2, y2) {
  const list = currentNode.annotations.arrows

  const index = list.findIndex(a =>
    a.from[0] === x1 &&
    a.from[1] === y1 &&
    a.to[0] === x2 &&
    a.to[1] === y2
  )

  if (index >= 0) {
    list.splice(index, 1)
  } else {
    list.push({ from: [x1, y1], to: [x2, y2] })
  }
}

function onSquareMouseDown(e) {
  // In edit mode, keep existing behavior
  if (gameMode === "edit") {
    if (e.button === 0 || e.button === 2) {
      handleEditClick(e)
      render()
    }
    return
  }

  const x = +e.currentTarget.dataset.x
  const y = +e.currentTarget.dataset.y

  // RIGHT BUTTON = annotation mode
  if (e.button === 2) {
    e.preventDefault()
    rightDragStart = { x, y }
    return
  }

  // LEFT BUTTON = existing move logic
  if (e.button === 0) {
    handlePlayLeftClick(x, y)
  }
}

function onSquareMouseUp(e) {
  if (gameMode !== "play") return
  if (e.button !== 2) return

  e.preventDefault()

  const x = +e.currentTarget.dataset.x
  const y = +e.currentTarget.dataset.y

  if (!rightDragStart) return

  const start = rightDragStart
  rightDragStart = null

  if (start.x === x && start.y === y) {
    toggleSquareHighlight(x, y)
  } else {
    toggleArrow(start.x, start.y, x, y)
  }

  render()
}

function handlePlayLeftClick(x, y){
  if (winner) return; // game over, no moves allowed

  if(!selected){
    const piece = board[x][y];
    if(piece !== EMPTY){
        selected = {x,y};
        render();
    }
    return;
  }

  if(selected.x===x && selected.y===y){
    selected=null;
    render();
    return;
  }

  if(board[x][y]===EMPTY && clearPath(selected.x,selected.y,x,y)){
    const piece=board[selected.x][selected.y];

    const isAttackersTurn = currentPlayer === ATTACKER;
    const isDefendersTurn = currentPlayer === DEFENDER;

    if(!((isAttackersTurn && piece === ATTACKER) ||
         (isDefendersTurn && (piece === DEFENDER || piece === KING)))) {
      selected=null;
      render();
      return;
    }

    makeMove(selected.x,selected.y,x,y);
  }

  selected=null;
  render();
}

function handleEditClick(e){
  if (e.detail === 2) onDoubleClick(e);

  else{
  e.preventDefault() // important for right-click

  const x = +e.currentTarget.dataset.x
  const y = +e.currentTarget.dataset.y

  const piece = board[x][y]

  // If square already occupied → delete piece
  if(piece !== EMPTY){
    if(piece !== KING){
      if(board[x][y]===DEFENDER){currentNode.countPieces[1]-=1;}
      if(board[x][y]===ATTACKER){currentNode.countPieces[0]-=1;}
    }
    board[x][y] = EMPTY
    return
  }

  // Prevent placement on forbidden squares
  if(isHostileSquare(x,y)){
    return
  }

  // Left click → defender
  if(e.button === 0){
    board[x][y] = DEFENDER
    currentNode.countPieces[1]+=1;
  }

  // Right click → attacker
  if(e.button === 2){
    board[x][y] = ATTACKER
    currentNode.countPieces[0]+=1;
  }
  }
}

function handlePlayerTurnsButtons(){
  document.getElementById("attackerButton").addEventListener("click", () => {
    currentPlayer = ATTACKER;
    render();
  });
  document.getElementById("defenderButton").addEventListener("click", () => {
    currentPlayer = DEFENDER;
    render();
  });
}

function onDoubleClick(e){
  if(gameMode !== "edit") return

    e.preventDefault();
    e.stopPropagation();

  const x = +e.currentTarget.dataset.x
  const y = +e.currentTarget.dataset.y

  let [kx,ky] = currentNode.king
  board[kx][ky] = EMPTY

  if(board[x][y]===DEFENDER){currentNode.countPieces[1]-=1;}
  if(board[x][y]===ATTACKER){currentNode.countPieces[0]-=1;}

  board[x][y] = KING
  currentNode.king = [x,y]
  render()
}

function saveComment(){
  const input = document.getElementById("commentInput")
  currentNode.comment = input.value.trim()
  updateCommentUI()
  renderVariationTree()
}

function handleArrowInput(){
  document.addEventListener("keydown", (e) => {
    if (gameMode !== "play") return;

    //Disable when typing in comment input
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.id === "commentInput" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT")) {
      return;
    }

    if (e.key === "ArrowLeft") {
        if (!currentNode.parent) return;
        currentNode = currentNode.parent;
        focusNode(currentNode, false)
    } else if (e.key === "ArrowRight") {
        if (!currentNode.children || currentNode.children.length === 0) return;
        currentNode = currentNode.children[0];
        focusNode(currentNode, false)
    }
  });
}

//Left-click in variation tree
function attachNodeEvents(div, node) {
  div.addEventListener("click", e => {
    e.stopPropagation()
    focusNode(node, false)
  })

  div.addEventListener("contextmenu", e => {
    e.preventDefault()
    if (!node.parent) return;
    e.stopPropagation()

    // Move to the clicked node, then show menu
    focusNode(node, false);
    showContextMenu(e.clientX, e.clientY, node);
  })
}

//Right-click in variation tree
function addColorOption(node,label, colorValue) {
  const btn = document.createElement("button");
  const isActive = node.color === colorValue;

  btn.textContent = isActive ? `${label}  ✔` : label;
  btn.style.fontWeight = isActive ? "bold" : "normal";
  btn.style.color = isActive ? "#000" : "#333";

  btn.addEventListener("click", () => {
    // Toggle behavior
    if (node.color === colorValue) {
      node.color = 0; // untick → unmark
    } else {
      node.color = colorValue; // tick → set color
    }
    renderVariationTree();
  });

  contextMenu.appendChild(btn);
}

function showContextMenu(x, y, node) {
  contextMenu.innerHTML = "";

    // COLOR OPTIONS
  if (node.parent) {
    addColorOption(node,"Brillant", 4);
    addColorOption(node,"Mistake", 1);
    addColorOption(node,"Forced", 2);
    addColorOption(node,"Winning", 3);
  }

  // PROMOTE TO MAIN LINE
  if (node.parent && node.parent.children[0] !== node) {
    const mainLineBtn = document.createElement("button");
    mainLineBtn.textContent = "Main line";

    mainLineBtn.addEventListener("click", () => {
      promoteToMainLine(node);
    });

    contextMenu.appendChild(mainLineBtn);
  }

  // DELETE OPTION
  if (node.parent) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete node";

    deleteBtn.addEventListener("click", () => {
      deleteNode(node);
    });
    contextMenu.appendChild(deleteBtn);
  }

  contextMenu.style.left = x + "px";
  contextMenu.style.top = y + "px";

  contextMenu.classList.remove("hidden");
}

function inputListener(){
  window.addEventListener("beforeunload", function (e) {
    // Only ask if the game is in progress
      const confirmationMessage = "You have unsaved changes. Are you sure you want to leave?";
      e.preventDefault();  // standard for some browsers
      e.returnValue = confirmationMessage; // Chrome requires setting returnValue
      return confirmationMessage;          // some other browsers use this
  });

  document.addEventListener("contextmenu", e => e.preventDefault())
  onLeftClick();
  handleArrowInput();
  handlePlayerTurnsButtons();
}

/* ============================================
   MODERN CONTEXT MENU HELPERS
============================================ */
function styleContextMenu() {
  leftfloatingMenu.style.padding = "14px";
  leftfloatingMenu.style.minWidth = "320px";
  leftfloatingMenu.style.maxHeight = "520px";
  leftfloatingMenu.style.overflowY = "auto";
  leftfloatingMenu.style.borderRadius = "14px";
  leftfloatingMenu.style.boxShadow = "0 12px 28px rgba(0,0,0,0.28)";
  leftfloatingMenu.style.background = "rgba(28,28,32)";
  leftfloatingMenu.style.border = "1px solid rgba(255,255,255,0.08)";
}

function createMenuSection(title, color = "#7aa7ff", count = 0) {
  const sectionWrap = document.createElement("div");
  sectionWrap.style.padding = "10px";
  sectionWrap.style.marginBottom = "14px";
  sectionWrap.style.borderRadius = "12px";
  sectionWrap.style.background = "rgba(255,255,255,0.03)";
  sectionWrap.style.border = "1px solid rgba(255,255,255,0.05)";

  // Header row
  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.alignItems = "center";
  headerRow.style.gap = "8px";
  headerRow.style.marginBottom = "10px";

  const dot = document.createElement("span");
  dot.style.width = "8px";
  dot.style.height = "8px";
  dot.style.borderRadius = "50%";
  dot.style.background = color;
  dot.style.flexShrink = "0";
  headerRow.appendChild(dot);

  const heading = document.createElement("div");
  heading.textContent = title;
  heading.style.fontFamily = "Inter, Arial, sans-serif";
  heading.style.fontSize = "11px";
  heading.style.fontWeight = "700";
  heading.style.letterSpacing = "0.08em";
  heading.style.textTransform = "uppercase";
  heading.style.color = "rgba(255,255,255,0.75)";
  headerRow.appendChild(heading);

  if (count > 0) {
    const countEl = document.createElement("div");
    countEl.textContent = `${count}`;
    countEl.style.marginLeft = "auto";
    countEl.style.fontFamily = "Inter, Arial, sans-serif";
    countEl.style.fontSize = "11px";
    countEl.style.fontWeight = "600";
    countEl.style.color = "rgba(255,255,255,0.45)";
    headerRow.appendChild(countEl);
  }

  sectionWrap.appendChild(headerRow);
  return sectionWrap;
}

function createMenuButton(label, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.style.display = "block";
  btn.style.width = "100%";
  btn.style.margin = "0 0 6px 0";
  btn.style.padding = "10px 12px";
  btn.style.borderRadius = "10px";
  btn.style.border = "1px solid rgba(255,255,255,0.06)";
  btn.style.background = "rgba(255,255,255,0.04)";
  btn.style.color = "rgba(255,255,255,0.92)";
  btn.style.fontFamily = "Inter, Arial, sans-serif";
  btn.style.fontSize = "13px";
  btn.style.fontWeight = "500";
  btn.style.textAlign = "left";
  btn.style.cursor = "pointer";
  btn.style.transition = "background 0.15s ease, border-color 0.15s ease, transform 0.08s ease";

  btn.addEventListener("mouseenter", () => {
    btn.style.background = "rgba(255,255,255,0.08)";
    btn.style.borderColor = "rgba(255,255,255,0.12)";
  });

  btn.addEventListener("mouseleave", () => {
    btn.style.background = "rgba(255,255,255,0.04)";
    btn.style.borderColor = "rgba(255,255,255,0.06)";
    btn.style.transform = "translateY(0)";
  });

  btn.addEventListener("mousedown", () => btn.style.transform = "translateY(1px)");
  btn.addEventListener("mouseup", () => btn.style.transform = "translateY(0)");
  btn.addEventListener("click", onClick);

  return btn;
}

/* ============================================
   SHOW PUZZLE MENU
============================================ */
function showPuzzleMenu(puzzles) {
  leftfloatingMenu.innerHTML = "";
  styleContextMenu()

  const groups = { "1": [], "2": [], "3": [], "0": [] };
  puzzles.forEach(p => (groups[String(p.level || "0")] || groups["0"]).push(p));

  const sections = [
    { level: "1", title: "Easy", color: "#66d17a" },
    { level: "2", title: "Intermediate", color: "#f0b35a" },
    { level: "3", title: "Hard", color: "#e46b6b" },
    { level: "0", title: "Unknown", color: "#aaaaaa" }
  ];

  sections.forEach(sec => {
    const items = groups[sec.level];
    if (!items.length) return;

    const sectionWrap = createMenuSection(sec.title, sec.color, items.length);

    items.forEach(puzzle => {
      sectionWrap.appendChild(
        createMenuButton(puzzle.name, () => loadPuzzleFromServer(puzzle.file))
      );
    });

    leftfloatingMenu.appendChild(sectionWrap);
  });

  leftfloatingMenu.style.left = "200px";
  leftfloatingMenu.style.top = "150px";
  leftfloatingMenu.classList.remove("hidden");
}

/* ============================================
   SHOW GAME ARCHIVE MENU
============================================ */
function showArchiveMenu(games) {
  leftfloatingMenu.innerHTML = "";
  styleContextMenu();

  // Group games by win_type
  const groups = {};
  games.forEach(game => {
    const type = game.win_type || "U"; // U = Unknown
    if (!groups[type]) groups[type] = [];
    groups[type].push(game);
  });

  // Define sections with colors and labels
  const sections = [
    { type: "W corner", title: "White Wins: Corner escape", color: "#66d17a" },
    { type: "W fort", title: "White Wins: Edge fort", color: "#66d17a" },
    { type: "B", title: "Black Wins", color: "#e46b6b" },
    { type: "D", title: "Draw", color: "#f0b35a" },
    { type: "U", title: "Unkown", color: "#aaaaaa" }
  ];

  sections.forEach(sec => {
    const items = groups[sec.type];
    if (!items || !items.length) return;

    const sectionWrap = createMenuSection(sec.title, sec.color, items.length);

    items.forEach(game => {
      sectionWrap.appendChild(
        createMenuButton(game.name, () => loadGameFromServer(game.file))
      );
    });

    leftfloatingMenu.appendChild(sectionWrap);
  });

  leftfloatingMenu.style.left = "200px";
  leftfloatingMenu.style.top = "150px";
  leftfloatingMenu.classList.remove("hidden");
}

/* =============================================================================================================
======  APP / CONTROLLER  ======
============================================================================================================= */
function loadBoard(srcNode){

  for(let x=0;x<SIZE;x++)
    for(let y=0;y<SIZE;y++)
      board[x][y]=srcNode.board[x][y]

  currentPlayer = srcNode.player
  render()
}

function newGame(){
  createBoardArray()
  placeInitialPieces()

  rootNode = new MoveNode(copyBoard(board), null, null, ATTACKER)
  currentNode = rootNode
  currentPlayer = ATTACKER
  selected=null

  render()
}

function startGame(){
  // Use currentPlayer from edit mode as first player
  rootNode = new MoveNode(copyBoard(board), null, null, currentPlayer)
  rootNode.countPieces[0] = currentNode.countPieces[0]
  rootNode.countPieces[1] = currentNode.countPieces[1]
  rootNode.king = currentNode.king
  currentNode = rootNode
  
  rootNode = currentNode

  gameMode = "play"
  selected = null

  render()
  updateCommentUI()
  renderVariationTree()
}

function startEdit(){

  const confirmDelete = confirm(
    `Edit the board manually? This will define a new starting position and the current analysis will be lost.`
  )
  if (!confirmDelete) return

  gameMode = "edit"
  winner = null;
  selected = null

  render()
}


/* =============================================================================================================
======  MAIN INITIALISATION  ======
============================================================================================================= */
createBoardUI()
newGame()
updateAnalysisNameUI()
renderPieceIcons()
updateAllThemeMenuLabels()

inputListener()
