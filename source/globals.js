/* =============================
   RULES
============================= */
const SIZE = 11
const MAXLENGTH_DIRECTION_REPETITION = 10
const MAXLENGTH_WITHOUT_CAPTURE = 50

let analysisName = "(unnamed)";

/* =============================
   CONSTANTS / ENUMS
============================= */
const EMPTY = 0
const ATTACKER = 1
const DEFENDER = 2
const KING = 3

let rightDragStart = null
let annotationSvg = null

/* =============================
   GAME STATE
============================= */
const board = []
let gameMode = "edit"   // "edit" | "play"
let currentPlayer = ATTACKER
let selected = null
let rootNode
let currentNode
let winner = null;       // null = no winner, "white" = white won
let winType = "";        // reason for win, e.g., "Corner escape"
let winSquares = [];     // coordinates of squares contributing to the win

/* =============================
   DOM
============================= */
const boardEl = document.getElementById("board")
const leftfloatingMenu = document.getElementById("leftContextMenu");
const contextMenu = document.getElementById("treeContextMenu");
