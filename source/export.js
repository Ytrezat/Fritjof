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
    ch: node.children.map(child => serializeNode(child))
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
  const text = prompt("Paste game notation:")
  if (!text) return

  try {
    importSimpleGame(text)
  } catch (e) {
    alert("Failed to import game: " + e.message)
  }
}

/* =============================================================================================================
   OPEN PUZZLE
============================================================================================================= */

async function loadPuzzleList() {
  try {
    const res = await fetch("Puzzles/puzzles.json");
    const puzzles = await res.json();

    showPuzzleMenu(puzzles);

  } catch (err) {
    alert("Failed to load puzzle list");
    console.error(err);
  }
}


async function loadPuzzleFromServer(fileName) {
  try {
    const res = await fetch(`Puzzles/${fileName}`)
    const data = await res.json()

    analysisName = fileName.replace(/\.json$/i, "").replace(/_/g, " ")
    updateAnalysisNameUI()

    loadAnalysisData(data)   // ✅ SAME CORE

  } catch (err) {
    alert("Failed to load puzzle: " + err.message)
  }
}
