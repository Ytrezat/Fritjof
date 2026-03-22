/* =============================================================================================================
======  HELPERS  ======
============================================================================================================= */
function moveToNotation(move) {
  const letters = "abcdefghijk"
  if (!move) return "Starting board"
  const padRank = (n) => (n < 10 ? n+"\u00A0" : n)  // pad single-digit ranks
  const from = letters[move.from[0]] + padRank(SIZE - move.from[1]);
  const to   = letters[move.to[0]]   + padRank(SIZE - move.to[1]);
  return `${from} → ${to}`
}

function createPieceCanvas(pieceType) {
  const size = 52;
  const canvas = document.createElement("canvas");

  const ctx = canvas.getContext("2d");

  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";

  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;

  if (pieceType === ATTACKER) {
    drawPawnPiece(ctx, cx, cy, "black");
  } else if (pieceType === DEFENDER) {
    drawPawnPiece(ctx, cx, cy, "white");
  } else if (pieceType === KING) {
    drawKingPiece(ctx, cx, cy);
  }

  return canvas;
}

/* =============================================================================================================
======  INTERFACE LAYOUT  ======
============================================================================================================= */
function updateModeUI(gameMode) {
  document.getElementById("modeIndicator").textContent =
    gameMode === "edit" ?  "Edit Mode: Add black (left click), white (right click), king (double click), or remove pieces (click on piece to remove). Once done, click 'Start'." : ""

  const boardEl = document.getElementById("board");
  const editButtons = document.getElementById("editModeButtons")
  const playButtons = document.getElementById("playModeButtons")
  const startButton = document.getElementById("startGameButton")
  const turnIndicator = document.getElementById("turnIndicator");
  const turnSelector = document.getElementById("turnSelector");

  if (gameMode === "edit") {
    boardEl.classList.add("edit-mode");
    editButtons.style.display = "flex"
    playButtons.style.display = "none"
    startButton.style.display = "inline-block"
    turnIndicator.style.display = "none";       // hide old h3
    turnSelector.classList.remove("hidden");    // show toggle
    variationTree.classList.add("hidden")   // hide tree
    variationNote.classList.add("hidden")
    commentBox.classList.add("hidden")
    editStartWrapper.classList.remove("hidden")  // show start button
    document.getElementById("leftPanel").classList.add("edit-mode");

  } else {
    boardEl.classList.remove("edit-mode");
    editButtons.style.display = "none"
    playButtons.style.display = "flex"
    startButton.style.display = "none"
    turnIndicator.style.display = "block";      // show turn in play
    turnSelector.classList.add("hidden");       // hide toggle
    variationTree.classList.remove("hidden")  // show tree
    variationNote.classList.remove("hidden")
    commentBox.classList.remove("hidden")
    editStartWrapper.classList.add("hidden")  // hide start button
    document.getElementById("leftPanel").classList.remove("edit-mode");
  }
}

/* =============================================================================================================
======  MAIN BOARD  ======
============================================================================================================= */
function drawBoardSquares(node){
  const squares = document.querySelectorAll(".square")
  const nodeHighlights = new Set(node?.annotations?.highlights || [])

  squares.forEach(sq => {
    const x = +sq.dataset.x
    const y = +sq.dataset.y

    sq.classList.remove("selected")
    sq.classList.remove("annotated-square")

    const p = board[x][y]
    sq.innerHTML = ""

    if (p !== EMPTY) {
      const pieceCanvas = createPieceCanvas(p)
      sq.appendChild(pieceCanvas)
    }

    if (selected && selected.x === x && selected.y === y)
      sq.classList.add("selected")

    if (nodeHighlights.has(squareKey(x, y))) {
      sq.classList.add("annotated-square")
    }
    
    if (winSquares.some(([wx, wy]) => wx === x && wy === y)) {
        sq.style.boxShadow = "0 0 15px 5px gold";
        }
  })

  squares.forEach(sq => sq.classList.remove("last-move"))

  if (node && node.move) {
    const { from, to } = node.move

    const fromSq = document.querySelector(`.square[data-x='${from[0]}'][data-y='${from[1]}']`)
    const toSq   = document.querySelector(`.square[data-x='${to[0]}'][data-y='${to[1]}']`)

    if (fromSq) fromSq.classList.add("last-move")
    if (toSq) toSq.classList.add("last-move")
  }
}

/* =============================================================================================================
======  BOARD ANNOTATIONS  ======
============================================================================================================= */
// SVG overlay for arrows
function addSVGOverlay(boardEl){
  annotationSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  annotationSvg.setAttribute("id", "annotationOverlay")
  annotationSvg.setAttribute("viewBox", `0 0 ${SIZE*64} ${SIZE*64}`)
  boardEl.appendChild(annotationSvg)
}

function drawBoardArrow(x1, y1, x2, y2) {
  const cell = 64

  const start = {
    x: x1 * cell + cell / 2,
    y: y1 * cell + cell / 2
  }

  const end = {
    x: x2 * cell + cell / 2,
    y: y2 * cell + cell / 2
  }

  // shorten so arrowhead doesn't fully cover destination piece
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.hypot(dx, dy) || 1

  const padStart = 6
  const padEnd = 20

  const sx = start.x + (dx / len) * padStart
  const sy = start.y + (dy / len) * padStart
  const ex = end.x - (dx / len) * padEnd
  const ey = end.y - (dy / len) * padEnd

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
  line.setAttribute("x1", sx)
  line.setAttribute("y1", sy)
  line.setAttribute("x2", ex)
  line.setAttribute("y2", ey)
  line.setAttribute("stroke", "#2f80ff")
  line.setAttribute("stroke-width", "6")
  line.setAttribute("stroke-linecap", "round")
  line.setAttribute("marker-end", "url(#arrowhead)")
  line.setAttribute("opacity", "0.9")

  annotationSvg.appendChild(line)
}

function renderAnnotations() {
  if (!annotationSvg) return

  annotationSvg.innerHTML = ""

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker")
  marker.setAttribute("id", "arrowhead")
  marker.setAttribute("markerWidth", "9")
  marker.setAttribute("markerHeight", "9")
  marker.setAttribute("refX", "6")
  marker.setAttribute("refY", "3")
  marker.setAttribute("orient", "auto")
  marker.setAttribute("markerUnits", "strokeWidth")

  const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path")
  arrowPath.setAttribute("d", "M1,0 L1,6 L9,3 z")
  arrowPath.setAttribute("fill", "#2f80ff")

  marker.appendChild(arrowPath)
  defs.appendChild(marker)
  annotationSvg.appendChild(defs)

  const arrows = currentNode?.annotations?.arrows || []

  for (const arrow of arrows) {
    const [x1, y1] = arrow.from
    const [x2, y2] = arrow.to
    drawBoardArrow(x1, y1, x2, y2)
  }
}

/* =============================================================================================================
======  INFO BELOW BOARD  ======
============================================================================================================= */
//Text showing "Player to move", or "Winner" in case of win
function updateTurnUI(currentPlayer,winner) {
  const turnEl = document.getElementById("turnIndicator");
  if (winner) {
    turnEl.textContent = `${winner.charAt(0).toUpperCase() + winner.slice(1)} ${winner==="draw" ? "" : "wins"} (${winType})`;
    turnEl.style.color = "gold";       // highlight in gold
    turnEl.style.fontWeight = "bold";
  } else {
    turnEl.textContent = currentPlayer === ATTACKER ? "Black to play" : "White to play";
    turnEl.style.color = "";          // reset color
    turnEl.style.fontWeight = "";
    // remove any previous highlights if no winner
    const squares = document.querySelectorAll(".square");
    squares.forEach(sq => sq.style.boxShadow = "");
  }
}

//Draw the piece counters below the board
function renderPieceIcons() {
  const blackIconEl = document.getElementById("blackIcon");
  const whiteIconEl = document.getElementById("whiteIcon");

  if (!blackIconEl || !whiteIconEl) return;

  // Clear previous
  blackIconEl.innerHTML = "";
  whiteIconEl.innerHTML = "";

  // Create pieces
  const blackPiece = createPieceCanvas(ATTACKER);
  const whitePiece = createPieceCanvas(DEFENDER);

  // Resize to fit counter
  blackPiece.style.width = "32px";
  blackPiece.style.height = "32px";

  whitePiece.style.width = "32px";
  whitePiece.style.height = "32px";

  blackIconEl.appendChild(blackPiece);
  whiteIconEl.appendChild(whitePiece);
}

function updatePieceCounters(node) {
  document.getElementById("blackCount").textContent = node.countPieces[0];
  document.getElementById("whiteCount").textContent = node.countPieces[1];
}

function updatePlayComment(comment) {
  const box = document.getElementById("playCommentBox");

  if (gameMode !== "play") {
    box.classList.add("hidden");
    box.textContent = "";
    return;
  }

  if (comment) {
    box.classList.remove("hidden");
    box.textContent = comment;
  } else {
    box.classList.add("hidden");
    box.textContent = "";
  }
}

/* =============================================================================================================
======  VARIATION TREE  ======
============================================================================================================= */
function getNodeBackground(tagColor, isCurrent, isActive) {
  if (tagColor === 1) return isCurrent ? "#f5b5b5" : "#f8d0d0";
  if (tagColor === 2) return isCurrent ? "#b5d4f5" : "#d0e4f8";
  if (tagColor === 3) return isCurrent ? "#f5e6a5" : "#f8f1d0";
  if (tagColor === 4) return isCurrent ? "#b5f5c0" : "#d0f8da";

  if (isCurrent) return "#dfefff";
  if (isActive) return "#f4f8ff";

  return "";
}

function drawMoveTag(div,node,currentNode,pos,activePathSet){
    div.style.gridColumn = pos.col + 1
    div.style.gridRow = pos.row + 1
    div.style.display = "inline-flex"
    div.style.alignItems = "center"
    div.style.whiteSpace = "nowrap"
    div.style.cursor = "pointer"
    div.style.fontFamily = "monospace"
    div.style.fontSize = "14px"
    div.style.padding = "1px 4px"
    div.style.borderRadius = "4px"
    
    //SELECTED NODE
    if (node === currentNode) { div.style.fontWeight = "bold"; }
    div.style.background = getNodeBackground(
        node.color,
        node === currentNode,
        activePathSet.has(node)
    );

    //ROOT NODE
    if (!node.move) {
        const label = document.createElement("span")
        label.textContent = "Starting board"
        label.style.fontStyle = "italic"
        label.style.color = "#666"

        div.appendChild(label)
    }
    //NORMAL NODES
    else {
    const isMainLine = pos.col === 0

    const moveNumber = 1+Math.floor(node.moveNumber / 2);
    const isBlackMove = node.parent?.player === ATTACKER

        // Move numbers only on main line
        if (isMainLine) {
        const moveNum = document.createElement("span")

        if (isBlackMove) {
            moveNum.textContent = `${moveNumber}. `
        } else {
            moveNum.textContent = `.. `
        }

        moveNum.style.marginRight = "4px"
        moveNum.style.fontWeight = "bold"
        moveNum.style.color = "#000"

        div.appendChild(moveNum)
        }

        const label = document.createElement("span")
        label.textContent = moveToNotation(node.move)
        label.style.color = isBlackMove ? "#fff" : "#000";
        label.style.background = isBlackMove ? "#000" : "#f8f8f8";
        label.style.padding = "1px 4px";
        label.style.borderRadius = "4px";
        label.style.border = "1px solid #000";

        div.appendChild(label)
    }
    //COMMENT ICON
    if (node.comment) {
        const commentMark = document.createElement("span")
        commentMark.textContent = "\u00A0💬"
        commentMark.title = node.comment
        commentMark.style.color = "#888"
        div.appendChild(commentMark)
    }
}

function drawArrowExpander(expander,variationCount,hiddenCount){
    expander.textContent = ` ◀${variationCount}`
    expander.style.color = "blue"
    expander.style.marginLeft = "4px"
    expander.style.cursor = "pointer"
    expander.style.fontSize = "12px"
    expander.title = `Show ${hiddenCount} hidden variation(s)`
}

function drawArrowCollapser(collapse,variationCount){
    collapse.textContent = ` ▶${variationCount}`
    collapse.style.color = "blue"
    collapse.style.marginLeft = "4px"
    collapse.style.cursor = "pointer"
    collapse.style.fontSize = "12px"
    collapse.title = "Collapse variations"
}

function drawVariationLines(container, nodeElements, nodePos, divByNode) {
  const svgId = "variationLines"
  const oldSvg = document.getElementById(svgId)
  if (oldSvg) oldSvg.remove()

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("id", svgId)
  svg.style.position = "absolute"
  svg.style.inset = "0"
  svg.style.width = "100%"
  svg.style.height = "100%"
  svg.style.pointerEvents = "none"
  svg.style.overflow = "visible"
  container.appendChild(svg)

  const containerRect = container.getBoundingClientRect()

  const getCenter = (rect) => ({
    x: rect.left - containerRect.left + rect.width / 2 + container.scrollLeft,
    y: rect.top - containerRect.top + rect.height / 2 + container.scrollTop
  })

  nodeElements.forEach(({ node, div }) => {
    if (!node.parent) return

    const parentEl = divByNode.get(node.parent)
    if (!parentEl) return

    const pRect = parentEl.getBoundingClientRect()
    const nRect = div.getBoundingClientRect()

    const p = getCenter(pRect)
    const n = getCenter(nRect)

    const parentPos = nodePos.get(node.parent)
    const nodePosEntry = nodePos.get(node)
    const sameCol = parentPos.col === nodePosEntry.col

    if (sameCol) {
      // straight vertical line
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
      line.setAttribute("x1", p.x)
      line.setAttribute("y1", p.y + 8)
      line.setAttribute("x2", n.x)
      line.setAttribute("y2", n.y - 8)
      line.setAttribute("stroke", "#666")
      line.setAttribute("stroke-width", "1.5")
      svg.appendChild(line)
    } else {
      // cleaner L-connector: down a bit, across, then down
      const elbowY = p.y + 10

      const v1 = document.createElementNS("http://www.w3.org/2000/svg", "line")
      v1.setAttribute("x1", p.x)
      v1.setAttribute("y1", p.y + 8)
      v1.setAttribute("x2", p.x)
      v1.setAttribute("y2", elbowY)
      v1.setAttribute("stroke", "#666")
      v1.setAttribute("stroke-width", "1.5")
      svg.appendChild(v1)

      const h = document.createElementNS("http://www.w3.org/2000/svg", "line")
      h.setAttribute("x1", p.x)
      h.setAttribute("y1", elbowY)
      h.setAttribute("x2", n.x)
      h.setAttribute("y2", elbowY)
      h.setAttribute("stroke", "#666")
      h.setAttribute("stroke-width", "1.5")
      svg.appendChild(h)

      const v2 = document.createElementNS("http://www.w3.org/2000/svg", "line")
      v2.setAttribute("x1", n.x)
      v2.setAttribute("y1", elbowY)
      v2.setAttribute("x2", n.x)
      v2.setAttribute("y2", n.y - 8)
      v2.setAttribute("stroke", "#666")
      v2.setAttribute("stroke-width", "1.5")
      svg.appendChild(v2)
    }
  })
}

/* =============================================================================================================
======  SCREENSHOT  ======
============================================================================================================= */

function drawArrowOnCanvas(ctx, x1, y1, x2, y2, CELL, BORDER) {
  const start = {
    x: BORDER + x1 * CELL + CELL / 2,
    y: BORDER + y1 * CELL + CELL / 2
  };

  const end = {
    x: BORDER + x2 * CELL + CELL / 2,
    y: BORDER + y2 * CELL + CELL / 2
  };

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;

  const ux = dx / len;
  const uy = dy / len;

  const padStart = 8;
  const padEnd = 2;

  const sx = start.x + ux * padStart;
  const sy = start.y + uy * padStart;
  const ex = end.x - ux * padEnd;
  const ey = end.y - uy * padEnd;

  // Arrow head
  const headLength = 45;
  const headWidth = 30;

  const bx = ex - ux * headLength;
  const by = ey - uy * headLength;

  // Shaft
  ctx.strokeStyle = "#2f80ff";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(bx, by);
  ctx.stroke();

  const px = -uy;
  const py = ux;

  const leftX = bx + px * (headWidth / 2);
  const leftY = by + py * (headWidth / 2);
  const rightX = bx - px * (headWidth / 2);
  const rightY = by - py * (headWidth / 2);

  ctx.fillStyle = "#2f80ff";
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();
  ctx.fill();
}


function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function takeBoardScreenshot() {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const CELL = 64;
    const BORDER = 6;
    const BOARD_PIXELS = SIZE * CELL;
    const TOTAL = BOARD_PIXELS + BORDER * 2;

    canvas.width = TOTAL;
    canvas.height = TOTAL;

    // Outer background
    ctx.fillStyle = "#b8956a";
    ctx.fillRect(0, 0, TOTAL, TOTAL);

    // Board border
    roundRect(ctx, 0, 0, TOTAL, TOTAL, 6);
    ctx.fillStyle = "#3a2a1a";
    ctx.fill();

    // Clip board interior so rounded corners stay nice
    ctx.save();
    roundRect(ctx, BORDER, BORDER, BOARD_PIXELS, BOARD_PIXELS, 2);
    ctx.clip();

    // Squares
      const boardEl = document.getElementById("board");

      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

          const squareEl = boardEl.children[y * SIZE + x];
          const style = getComputedStyle(squareEl);

          const fill = style.backgroundColor;

          ctx.fillStyle = fill;
          ctx.fillRect(
            BORDER + x * CELL,
            BORDER + y * CELL,
            CELL,
            CELL
          );

          // OPTIONAL: draw corner/throne borders from CSS
          const borderWidth = parseFloat(style.borderWidth);
          if (borderWidth > 0) {
            ctx.strokeStyle = style.borderColor;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(
              BORDER + x * CELL,
              BORDER + y * CELL,
              CELL,
              CELL
            );
          }
        }
      }

    // Annotation highlights
    const highlights = currentNode?.annotations?.highlights || []

    for (const key of highlights) {
      const [x, y] = key.split(",").map(Number)
      const px = BORDER + x * CELL
      const py = BORDER + y * CELL

      ctx.strokeStyle = "#2f80ff"
      ctx.lineWidth = 4
      ctx.strokeRect(px + 2, py + 2, CELL - 4, CELL - 4)

      ctx.strokeStyle = "rgba(255,255,255,0.45)"
      ctx.lineWidth = 2
      ctx.strokeRect(px + 5, py + 5, CELL - 10, CELL - 10)
    }

    // Last move highlight
    if (currentNode && currentNode.move) {
      const { from, to } = currentNode.move;

      for (const [x, y] of [from, to]) {
        const px = BORDER + x * CELL;
        const py = BORDER + y * CELL;

        ctx.strokeStyle = "#0000ff";
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3);
      }
    }

    // Pieces (vector-drawn, no PNGs)
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const p = board[x][y];
        if (p === EMPTY) continue;

        const cx = BORDER + x * CELL + CELL / 2;
        const cy = BORDER + y * CELL + CELL / 2;

        if (p === KING) {
          drawKingPiece(ctx, cx, cy); // Keep king separate
        } else {
          drawPawnPiece(ctx, cx, cy, p === ATTACKER ? "black" : "white");
        }
      }
    }

    // Highlighted squares
    if (selected) {
      const px = BORDER + selected.x * CELL;
      const py = BORDER + selected.y * CELL;

      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      ctx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3);
    }

    // Arrows
    const arrows = currentNode?.annotations?.arrows || []
    for (const arrow of arrows) {
      const [x1, y1] = arrow.from
      const [x2, y2] = arrow.to

      drawArrowOnCanvas(ctx, x1, y1, x2, y2, CELL, BORDER);
    }

    ctx.restore();

    // Export
    const safeName = analysisName
      ? analysisName.replace(/[^a-z0-9_\-]/gi, "_")
      : "hnefatafl_analysis";

    const link = document.createElement("a");
    link.download = `${safeName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

  } catch (err) {
    console.error(err);
    alert("Failed to create screenshot: " + err.message);
  }
}
