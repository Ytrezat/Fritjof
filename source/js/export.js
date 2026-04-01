function encodeMove(move){
  const [x1,y1] = move.from
  const [x2,y2] = move.to
  return (x1 << 12) | (y1 << 8) | (x2 << 4) | y2
}

function decodeMove(n){
  return {
    from: [(n >> 12) & 15, (n >> 8) & 15],
    to:   [(n >> 4) & 15,  n & 15]
  }
}

function encodeHistoryMove(h){
  const [x1,y1] = h.from
  const [x2,y2] = h.to
  const c = h.captured

  return (x1 << 16) | (y1 << 12) | (x2 << 8) | (y2 << 4) | c
}

function decodeHistoryMove(n){
  return {
    from: [(n >> 16) & 15, (n >> 12) & 15],
    to:   [(n >> 8) & 15,  (n >> 4) & 15],
    captured: n & 15
  }
}

function serializeNode(node){
  return {
    m: node.move ? encodeMove(node.move) : null,
    p: node.player,
    N: node.moveNumber,
    l: node.lastMoveWithCapture,
    k: node.king,
    H: node.moveHistory
      ? node.moveHistory.map(encodeHistoryMove)
      : undefined,
    cP: node.countPieces,
    c: node.comment,
    co: node.color,
    a: (node.annotations &&
        (node.annotations.highlights.length || node.annotations.arrows.length))
      ? node.annotations
      : undefined,
    ch: node.children.map(child => serializeNode(child)),
    g: node.gameover
  }
}

function deserializeNode(obj, parent=null, parentBoard=null){

  let board = copyBoard(parentBoard)
  let move
  if (obj.m!==null) {
    move = decodeMove(obj.m)
    const [x1,y1] = move.from
    const [x2,y2] = move.to
    playMove(board, x1, y1, x2, y2)
  }
  else{
    move = null
  }

  const node = new MoveNode(board, move, parent, obj.p, obj.N)
  node.king = obj.k
  node.lastMoveWithCapture = obj.l
  node.moveHistory = obj.H
    ? obj.H.map(decodeHistoryMove)
    : []
  node.countPieces = obj.cP

  node.comment = obj.c || ""
  node.color = obj.co || 0
  node.annotations = obj.a || { highlights: [], arrows: [] }

  node.children = obj.ch.map(childObj =>
    deserializeNode(childObj, node, board)
  )
  node.gameover = obj.g || 0
  return node
}

/* =============================================================================================================
======  IMPORT / EXPORT  ======
============================================================================================================= */
function exportAnalysis(){

  if(!rootNode){
    alert("No analysis to export.")
    return
  }

  const data = {
    size: SIZE,
    initialBoard: rootNode.board,   // IMPORTANT
    root: serializeNode(rootNode)
  }

  const json = JSON.stringify(data)

  const blob = new Blob([json], {type: "application/json"})
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url

  const safeName = analysisName
    ? analysisName.replace(/[^a-z0-9_\-]/gi, "_")
    : "hnefatafl_analysis"

  a.download = `${safeName}.json`
  a.click()

  URL.revokeObjectURL(url)
}

function loadAnalysisData(data) {
  if(!data.root || !data.initialBoard){
    throw new Error("Invalid file format")
  }

  rootNode = deserializeNode(data.root, null, data.initialBoard)
  currentNode = rootNode

  loadBoard(rootNode)

  currentPlayer = rootNode.player
  selected = null
  gameMode = "play"

  render()
  updateCommentUI()
  renderVariationTree()
}

function importAnalysis(event){
  const file = event.target.files[0]
  if(!file) return

  const fileName = file.name.replace(/\.json$/i, "").replace(/_/g, " ")
  analysisName = fileName
  updateAnalysisNameUI()

  const reader = new FileReader()

  reader.onload = function(e){
    try{
      const data = JSON.parse(e.target.result)
      loadAnalysisData(data)
    }catch(err){
      alert("Failed to load file: " + err.message)
    }
  }

  reader.readAsText(file)
  event.target.value = ""
}

/* =============================================================================================================
   IMPORT FROM A SIMPLE LIST OF MOVES
============================================================================================================= */

function parseSquare(str) {
  const letters = "abcdefghijk"

  const file = str[0]
  const rank = parseInt(str.slice(1), 10)

  const x = letters.indexOf(file)
  const y = SIZE - rank

  if (x < 0 || isNaN(y)) return null

  return [x, y]
}

function parseMove(moveStr) {
  // remove capture notation like "i10xj10"
  moveStr = moveStr.split("x")[0]

  const parts = moveStr.split("-")
  if (parts.length !== 2) return null

  const from = parseSquare(parts[0])
  const to = parseSquare(parts[1])

  if (!from || !to) return null

  return { from, to }
}

function importSimpleGame(text) {
  newGame(); // reset board + initial setup

  gameMode = "play";

  rootNode = new MoveNode(copyBoard(board), null, null, ATTACKER);
  currentNode = rootNode;
  currentPlayer = ATTACKER;
  selected = null;

  const lines = text.split("\n");
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // remove all move numbers anywhere in the line
    line = line.replace(/\b\d+\.\s*/g, "");

    const parts = line.split(/\s+/);

    for (let part of parts) {

      // ✅ HANDLE RESIGNATION
      if (part.toLowerCase().includes("resigned")) {

        // currentPlayer is the player to move → that player resigns
        [xk,yk] = [0,0]
        makeMove(xk,yk,xk,yk)
        if (currentPlayer === DEFENDER) {
          currentNode.gameover = 1; // black resigns → white wins
        } else {
          currentNode.gameover = -1; // white resigns → black wins
        }

        // trigger UI update
        checkEndGame(0,0)
        break;
      }

      // ✅ HANDLE RESIGNATION
      if (part.toLowerCase().includes("timeout")) {

        // currentPlayer is the player to move → that player resigns
        [xk,yk] = [0,0]
        makeMove(xk,yk,xk,yk)
        if (currentPlayer === DEFENDER) {
          currentNode.gameover = 3; // black timeout → white wins
        } else {
          currentNode.gameover = -3; // white timeout → black wins
        }

        // trigger UI update
        checkEndGame(0,0)
        break;
      }

      if (part.toLowerCase().includes("draw")) {
        [xk,yk] = [0,0]
        makeMove(xk,yk,xk,yk)
        currentNode.gameover = 2;
        // trigger UI update
        checkEndGame(0,0)
        break;
      }

      // normal move
      if (!part.includes("-")) continue;

      const move = parseMove(part);
      if (!move) continue;

      const [x1, y1] = move.from;
      const [x2, y2] = move.to;

      makeMove(x1,y1,x2,y2)
    }
  }

  // sync UI turn from final node
  currentPlayer = currentNode.player;

  render();
  renderVariationTree();
}

function pasteSimpleGame() {
  const text = prompt("Paste game notation, e.g. '1. e1-e3 d6-d3 2. e3-i3 e5-b5'")
  if (!text) return

  const name = "(unnamed)"

  try {
    importSimpleGame(text)

    // ✅ Set title from user input
    analysisName = name ? name.trim() : "Game analysis"
    updateAnalysisNameUI()
    updateMetadataUI("");

  } catch (e) {
    alert("Failed to import game: " + e.message)
  }
}

/* =============================================================================================================
   IMPORT A GAME FROM AAGENIELSEN.DK
============================================================================================================= */

function parsePlayer(str){
  if (!str) return { name: "", country: "" }

  const parts = str.split(",").map(s => s.trim())

  return {
    name: parts[0] || "",
    country: parts[parts.length - 1] || ""
  }
}

function extractDateTime(line){
  // Example: "2025-11-12 11:49:38 (Copenhagen time)"
  const match = line.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})/)

  if (!match) return { date: "", time: "" }

  return {
    date: match[1],
    time: `${match[2]}:${match[3]}`
  }
}

function parseGameFile(text) {
  const lines = text.split("\n").map(l => l.trim());

  const metadata = {
    event: "",
    white: "",
    black: "",
    result: "",
    date: "",
    variant: ""
  };

  let movesStarted = false;
  let movesLines = [];

  for (let line of lines) {
    if (!line) continue;

    // --- METADATA ---
    if (!movesStarted) {
      if (line.startsWith("Event:")) {
        metadata.event = line.replace("Event:", "").trim();
        continue;
      }
      if (line.startsWith("White:")) {
        metadata.white = line.replace("White:", "").trim();
        continue;
      }
      if (line.startsWith("Black:")) {
        metadata.black = line.replace("Black:", "").trim();
        continue;
      }
      if (line.includes("won")) {
        metadata.result = line;
        continue;
      }
      if (line.match(/\d{4}-\d{2}-\d{2}/)) {
        const dt = extractDateTime(line)
        metadata.date = dt.date
        metadata.time = dt.time
        continue
      }
      if (line.toLowerCase().includes("hnefatafl")) {
        metadata.variant = line;
        continue;
      }

      // Detect start of moves
      if (line.match(/^\d+\./)) {
        movesStarted = true;
      }
    }

    // --- MOVES ---
    if (movesStarted) {
      movesLines.push(line);
    }
  }

  return {
    metadata,
    movesText: movesLines.join("\n")
  };
}

function formatMetadataLines(metadata){
  const w = parsePlayer(metadata.white)
  const b = parsePlayer(metadata.black)

  const line1 = `${w.name} (${w.country}) - ${b.name} (${b.country})`

  // ✅ Build line2 flexibly
  const parts = []

  if (metadata.event) parts.push(metadata.event)

  if (metadata.date && metadata.time) {
    parts.push(`${metadata.date} ${metadata.time}`)
  } else if (metadata.date) {
    parts.push(metadata.date)
  } else if (metadata.time) {
    parts.push(metadata.time)
  }

  const line2 = parts.join(", ")

  return { line1, line2 }
}

function importFullGame(text) {
  const { metadata, movesText } = parseGameFile(text);

  rootMetadata = metadata;

  importSimpleGame(movesText);

  if (rootNode) {
    rootNode.metadata = metadata;
  }

  const { line1 } = formatMetadataLines(metadata);
  analysisName = line1 || "Game analysis";
  updateAnalysisNameUI();

  updateMetadataUI(metadata);
}

function updateMetadataUI(meta) {
  const { line2 } = formatMetadataLines(meta);
  if (!line2) {
    lineMetaData.innerHTML = "";
    return;
  }

  lineMetaData.innerHTML = `<div>${line2}</div>`;
}

function formatGameTitle(metadata){
  if (!metadata) return ""

  const white = metadata.white || "White"
  const black = metadata.black || "Black"

  const event = metadata.event || ""
  const date = metadata.date ? metadata.date.split(" ")[0] : ""

  let extra = ""

  if (event && date) extra = ` (${event}, ${date})`
  else if (event) extra = ` (${event})`
  else if (date) extra = ` (${date})`

  return `${white} - ${black}${extra}`
}

function importGameFile(file){
  if(!file) return

  const fileName = file.name.replace(/\.txt$/i, "").replace(/_/g, " ")
  analysisName = fileName
  updateAnalysisNameUI()

  const reader = new FileReader()

  reader.onload = function(e){
    try{
      const text = e.target.result
      importFullGame(text)

    }catch(err){
      alert("Failed to load game: " + err.message)
    }
  }

  reader.readAsText(file)

  // reset input so same file can be reloaded
}

function loadGameArchive() {
  fetch("Games_Archive/games.json")
    .then(res => res.json())
    .then(games => {
      showArchiveMenu(games);
    })
    .catch(err => {
      alert("Failed to load games archive");
      console.error(err);
    });
}

function loadGameFromServer(fileName) {
  fetch(`Games_Archive/${fileName}`)
    .then(res => res.text())
    .then(text => {
      analysisName = fileName.replace(/\.[^.]+$/i, "").replace(/_/g, " ");
      updateAnalysisNameUI();

      importFullGame(text);
    })
    .catch(err => {
      alert("Failed to load game: " + err.message);
    });
}

/* =============================================================================================================
   OPEN PUZZLE
============================================================================================================= */

function loadPuzzleList() {
  fetch("Puzzles/puzzles.json")
    .then(res => res.json())
    .then(puzzles => {
      showPuzzleMenu(puzzles);
    })
    .catch(err => {
      alert("Failed to load puzzle list");
      console.error(err);
    });
}

function loadPuzzleFromServer(fileName, puzzleName) {
  fetch(`Puzzles/${fileName}`)
    .then(res => res.json())
    .then(data => {
      analysisName = puzzleName;
      updateAnalysisNameUI();
      updateMetadataUI("");
      loadAnalysisData(data);   // same core
    })
    .catch(err => {
      alert("Failed to load puzzle: " + err.message);
    });
}
