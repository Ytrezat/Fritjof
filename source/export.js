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
    root: serializeNode(rootNode)
  }

  const json = JSON.stringify(data)

  const blob = new Blob([json], {type: "application/json"})
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  const safeName = analysisName
    ? analysisName.replace(/[^a-z0-9_\-]/gi, "_")
    : "hnefatafl_analysis";

  a.download = `${safeName}.json`;
  a.click()

  URL.revokeObjectURL(url)
}

function importAnalysis(event){

  const file = event.target.files[0]
  if(!file) return

  const fileName = file.name.replace(/\.json$/i, "");
  analysisName = fileName;
  updateAnalysisNameUI();

  const reader = new FileReader()

  reader.onload = function(e){

    try{
      const data = JSON.parse(e.target.result)

      if(!data.root){
        throw new Error("Invalid file format")
      }

      rootNode = deserializeNode(data.root, null)
      currentNode = rootNode

      // Load initial board (user-edited start position)
      loadBoard(rootNode)

      currentPlayer = rootNode.player

      selected = null
      gameMode = "play"

      render()
      updateCommentUI()
      renderVariationTree()

    }catch(err){
      alert("Failed to load file: " + err.message)
    }

  }

  reader.readAsText(file)

  // reset input so same file can be reloaded
  event.target.value = ""
}

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
