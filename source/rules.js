/* =============================================================================================================
   SQUARE TYPE DETECTION
============================================================================================================= */
const DIRECTIONS = [
  [1,0],[-1,0],[0,1],[0,-1]
]
const center = (SIZE-1)/2


function inBoard(x,y){
  return x>=0 && y>=0 && x<SIZE && y<SIZE
}

function isCorner(x,y){
  return (x===0||x===SIZE-1)&&(y===0||y===SIZE-1)
}

function isThrone(x,y){
  return x===center && y===center
}

function isHostileSquare(x,y){
  return isCorner(x,y) || isThrone(x,y)
}

function isEdge(x,y){
  return x===0 || y===0 || x===SIZE-1 || y===SIZE-1
}

function getEdgeInfo(x, y){
  if (y === 0) return { edge: "top", inward: [0, 1], lineDirs: [[-1,0],[1,0]] }
  if (y === SIZE - 1) return { edge: "bottom", inward: [0, -1], lineDirs: [[-1,0],[1,0]] }
  if (x === 0) return { edge: "left", inward: [1, 0], lineDirs: [[0,-1],[0,1]] }
  if (x === SIZE - 1) return { edge: "right", inward: [-1, 0], lineDirs: [[0,-1],[0,1]] }
  return null
}

/* =============================================================================================================
   INITIAL BOARD POSITION
============================================================================================================= */

function placeInitialPieces(){
  const c=center
  const attackers=[

  [0,c-2],[0,c-1],[0,c],[0,c+1],[0,c+2],
  [SIZE-1,c-2],[SIZE-1,c-1],[SIZE-1,c],[SIZE-1,c+1],[SIZE-1,c+2],

  [c-2,0],[c-1,0],[c,0],[c+1,0],[c+2,0],
  [c-2,SIZE-1],[c-1,SIZE-1],[c,SIZE-1],[c+1,SIZE-1],[c+2,SIZE-1],

  [1,c],[SIZE-2,c],[c,1],[c,SIZE-2]
  ]

  attackers.forEach(([x,y])=>board[x][y]=ATTACKER)

  for(let i=c-2;i<=c+2;i++){
    board[i][c]=DEFENDER
    board[c][i]=DEFENDER
  }
  board[c+1][c+1]=DEFENDER
  board[c-1][c+1]=DEFENDER
  board[c+1][c-1]=DEFENDER
  board[c-1][c-1]=DEFENDER
  board[c][c]=KING
}

/* =============================================================================================================
   MOVE VALIDATION
============================================================================================================= */

function clearPath(x1,y1,x2,y2){
  if(board[x1][y1]!==KING && isHostileSquare(x2,y2)) return false
  if(x1!==x2 && y1!==y2) return false

  if(x1===x2){
    const step=y2>y1?1:-1
    for(let y=y1+step;y!==y2;y+=step)
      if(board[x1][y]!==EMPTY) return false
  }
  else{
    const step=x2>x1?1:-1
    for(let x=x1+step;x!==x2;x+=step)
      if(board[x][y1]!==EMPTY) return false
  }
  return true
}

/**
 * Returns:
 * 1 if there is only one possible move for White (DEFENDER or KING)
 * 2 if there are at least two possible moves
 *
 * @param {number[][]} b - board array
 * @returns {number} 1 or 2
 */
function countWhitePossibleMoves(b) {
  const movesNeeded = 2;
  let moveCount = 0;
  const n = b.length;

  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {

      const piece = b[x][y];
      if (piece !== DEFENDER && piece !== KING) continue;

      for (const [dx, dy] of DIRECTIONS) {
        let nx = x + dx;
        let ny = y + dy;

        while (inBoard(nx,ny)) {

          // Blocked by any piece
          if (b[nx][ny] !== EMPTY) break;

          // Hostile square restriction (matches your clearPath)
          if (piece !== KING && isHostileSquare(nx, ny)) break;

          // Valid move
          moveCount++;
          if (moveCount >= movesNeeded) return 2;

          nx += dx;
          ny += dy;
        }
      }
    }
  }
  return moveCount === 1 ? 1 : 0;
}

function playMove(b,x1,y1,x2,y2){
  b[x2][y2]=b[x1][y1]
  b[x1][y1]=EMPTY

  const captured = applyCaptures(b,x2,y2)
  for (const [px, py] of captured) {
    b[px][py]=EMPTY;
  }
  return captured
}

/* =============================================================================================================
   CAPTURE SYSTEMS
============================================================================================================= */

/* ---------- STANDARD CAPTURE ---------- */

function custodialCapture(board,x,y){
  const removed = []
  const player=(board[x][y] === ATTACKER) ? ATTACKER : DEFENDER;

  for(const [dx,dy] of DIRECTIONS){

    const x1=x+dx
    const y1=y+dy

    const x2=x+dx*2
    const y2=y+dy*2

    if(!inBoard(x2,y2)) continue

    const mid=board[x1]?.[y1]
    if (mid === EMPTY || mid === player || mid === KING) continue

    if (board[x2][y2] !== EMPTY || isHostileSquare(x2,y2) ){
      const player_end = (board[x2][y2] === ATTACKER) ? ATTACKER : DEFENDER;
      if(player_end===player || isHostileSquare(x2,y2)){
        removed.push([x1,y1])
    }
    }
  }
  return removed
}

/* ---------- COPENHAGEN SHIELDWALL ---------- */

function shieldwallCapture(board,x, y) {
  const removed = []
  const player = (board[x][y] === ATTACKER) ? ATTACKER : DEFENDER;
  const enemy = (player === ATTACKER) ? DEFENDER : ATTACKER;

  // Shieldwall only matters if the last move was played ON AN EDGE
  if (!isEdge(x, y)) return [];

  // Determine which edge we're on, and therefore:
  // - which directions run ALONG the edge
  // - which direction points INWARD from the edge
    const edgeInfo = getEdgeInfo(x, y);
    if (!edgeInfo) return [];
    const { lineDirs, inward } = edgeInfo;

  // Each direction along the edge is checked independently
  for (const [dx, dy] of lineDirs) {
    const startX = x + dx;
    const startY = y + dy;

    // Must begin next to an enemy piece on the edge
    if (!inBoard(startX, startY)) continue;
    const startPiece = board[startX][startY];
    if (startPiece !== enemy && startPiece !== KING) continue;

    const line = [];
    let cx = startX;
    let cy = startY;
    let valid = true;

    // Walk ALONG THE EDGE through contiguous enemy pieces
    while (inBoard(cx, cy)) {
      const piece = board[cx][cy];

      // Stop if edge line is broken
      if (piece !== enemy && piece !== KING) break;

      // Check the inward adjacent square for surrounding piece
      const ix = cx + inward[0];
      const iy = cy + inward[1];

      if (!inBoard(ix, iy)) {
        valid = false;
        break;
      }

      const inwardPiece = board[ix][iy];

      // King counts as a normal white piece for shieldwall purposes
      const inwardIsFriendly =
        inwardPiece === player ||
        (player === DEFENDER && inwardPiece === KING);

      if (!inwardIsFriendly) {
        valid = false;
        break;
      }

      line.push([cx, cy]);

      cx += dx;
      cy += dy;
    }

    // Need at least one enemy piece
    if (!valid || line.length === 0) continue;

    // The far end must be closed by a friendly piece or a corner
      const endPiece = board[cx][cy];
      const farClosed =
        endPiece === player ||
        (player === DEFENDER && endPiece === KING) ||
        isCorner(cx, cy);

    if (!farClosed) continue;

    // Capture the entire line
    for (const [px, py] of line) {
      if (board[px][py]!==KING){
      removed.push([px,py]);}
    }
  }
  return removed
}

function applyCaptures(b,x,y){
  const removed = [
    ...custodialCapture(b,x,y),
    ...shieldwallCapture(b,x,y)
  ]
  return removed
}


/* =============================================================================================================
   WIN DETECTION FOR WHITE: CORNER ESCAPE
============================================================================================================= */
function WhiteWin_Corner(x,y) {
  if (board[x][y] === KING && isCorner(x, y)){
        return { won: true, squares: [[x, y]] };
      }
  return { won: false, squares: [] };
}

/* =============================================================================================================
   WIN DETECTION FOR WHITE: EDGE FORTS (checks two elementary forts)
============================================================================================================= */

function WhiteWin_EdgeFort_type1(x, y) {
  if (board[x][y] !== KING || !isEdge(x, y)) {
    return { won: false, squares: [] };
  }
  const cases = [
    // LEFT
    {
      cond: x === 0,
      patterns: [
        [[0,1],[0,-2],[1,0],[1,-1]],
        [[0,2],[0,-1],[1,0],[1,1]]
      ]
    },
    // RIGHT
    {
      cond: x === SIZE - 1,
      patterns: [
        [[0,1],[0,-2],[-1,0],[-1,-1]],
        [[0,2],[0,-1],[-1,0],[-1,1]]
      ]
    },
    // TOP
    {
      cond: y === 0,
      patterns: [
        [[1,0],[-2,0],[0,1],[-1,1]],
        [[2,0],[-1,0],[0,1],[1,1]]
      ]
    },
    // BOTTOM
    {
      cond: y === SIZE - 1,
      patterns: [
        [[1,0],[-2,0],[0,-1],[-1,-1]],
        [[2,0],[-1,0],[0,-1],[1,-1]]
      ]
    }
  ];

  for (const { cond, patterns } of cases) {
    if (!cond) continue;

    for (const pattern of patterns) {
      const squares = [[x, y]];
      let ok = true;

      for (const [dx, dy] of pattern) {
        const nx = x + dx;
        const ny = y + dy;

        if (!inBoard(nx, ny) || board[nx][ny] !== DEFENDER) {
          ok = false;
          break;
        }
        squares.push([nx, ny]);
      }

      if (ok) return { won: true, squares };
    }
  }

  return { won: false, squares: [] };
}


function WhiteWin_EdgeFort_type2(x, y) {
  if (board[x][y] !== KING || !isEdge(x, y)) {
    return { won: false, squares: [] };
  }

  const cases = [
    { cond: x === 0, dx: 1, dy: 0 },
    { cond: x === SIZE - 1, dx: -1, dy: 0 },
    { cond: y === 0, dx: 0, dy: 1 },
    { cond: y === SIZE - 1, dx: 0, dy: -1 }
  ];

  for (const { cond, dx, dy } of cases) {
    if (!cond) continue;

    const squares = [[x, y]];

    // first layer
    const side1 = [x + (dy !== 0 ? 1 : 0), y + (dx !== 0 ? 1 : 0)];
    const side2 = [x - (dy !== 0 ? 1 : 0), y - (dx !== 0 ? 1 : 0)];

    if (
      !inBoard(...side1) || !inBoard(...side2) ||
      board[side1[0]][side1[1]] !== DEFENDER ||
      board[side2[0]][side2[1]] !== DEFENDER
    ) continue;

    // second layer
    const d1 = [side1[0] + dx, side1[1] + dy];
    const d2 = [side2[0] + dx, side2[1] + dy];

    if (
      !inBoard(...d1) || !inBoard(...d2) ||
      board[d1[0]][d1[1]] !== DEFENDER ||
      board[d2[0]][d2[1]] !== DEFENDER
    ) continue;

    // forward
    const forward = [x + 2*dx, y + 2*dy];
    if (!inBoard(...forward) || board[forward[0]][forward[1]] !== DEFENDER) continue;

    // final condition (either side)
    const f1 = [forward[0] + (dy !== 0 ? 1 : 0), forward[1] + (dx !== 0 ? 1 : 0)];
    const f2 = [forward[0] - (dy !== 0 ? 1 : 0), forward[1] - (dx !== 0 ? 1 : 0)];

    if (
      (inBoard(...f1) && board[f1[0]][f1[1]] === DEFENDER) ||
      (inBoard(...f2) && board[f2[0]][f2[1]] === DEFENDER)
    ) {
      return {
        won: true,
        squares: [ [x,y], side1, side2, d1, d2, forward ]
      };
    }
  }

  return { won: false, squares: [] };
}

/* =============================================================================================================
   WIN DETECTION FOR BLACK: KING CAPTURED
============================================================================================================= */
// Check if the king is captured (Copenhagen rules)
function BlackWin_KingCaptured(x,y,kingPos) {
  if(!(kingPos)) return { won: false, squares: [] };

  const [kx, ky] = kingPos;
  // Directions: up, down, left, right
  const adj = [
    [kx, ky - 1],
    [kx, ky + 1],
    [kx - 1, ky],
    [kx + 1, ky],
  ];

  const capturers = [];
  for (const [x, y] of adj) {
    if (inBoard(x, y) && (isHostileSquare(x, y) || board[x][y] === ATTACKER)) {
      capturers.push([x, y]);
    }
  }
  // King is captured if all 4 orthogonal sides are hostile
  if (capturers.length >= 4) {
    return { won: true, squares: capturers };
  }
  return { won: false, squares: [] };
}

/* =============================================================================================================
   WIN DETECTION FOR BLACK: BARRICADE CLOSURE
============================================================================================================= */
/************************************************************
 * STRATEGIC BLACK WIN DETECTOR (No escape / no edge fort)
 * - Works on a COPY of the board (does NOT mutate the real game board)
 ************************************************************/

/***********************
 * Board snapshot helpers
 ***********************/

function cloneBoard(srcBoard) {
  return srcBoard.map(col => col.slice());
}

function posKey(x,y){
  return x * SIZE + y
}

function keyToPos(k){
  return [Math.floor(k / SIZE), k % SIZE]
}

/***********************
 * Theorem hostile logic
 * (NOT the same as your existing isHostileSquare)
 ***********************/

function isTheoremHostileSquare(x, y, R) {
  if (!inBoard(x,y)) return false;
  return R.has(posKey(x,y)) || isCorner(x,y) || isThrone(x,y);
}

/***********************
 * White reachability R
 *
 * R = defender/king seeds + flood through EMPTY squares
 ***********************/

function computeWhiteReachable(b) {
  const R = new Set();
  const queue = [];

  for (let x = 0; x < b.length; x++) {
    for (let y = 0; y < b[x].length; y++) {
      if (b[x][y] === DEFENDER || b[x][y] === KING) {
        queue.push([x, y]);
      }
    }
  }

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    const k = posKey(x, y);

    if (R.has(k)) continue;
    R.add(k);

    for (const [dx,dy] of DIRECTIONS){
      const nx = x + dx
      const ny = y + dy
      if (inBoard(nx, ny) && b[nx][ny] === EMPTY) {
        queue.push([nx, ny]);
      }
    }
  }

  return R;
}

/***********************
 * Expand reachability after removing black pieces
 ***********************/

function expandReachable(b, R) {
  const queue = Array.from(R).map(keyToPos);

  while (queue.length > 0) {
    const [x, y] = queue.pop();

    for (const [dx,dy] of DIRECTIONS){
      const nx = x + dx
      const ny = y + dy
      if (!inBoard(nx, ny)) continue;
      if (b[nx][ny] !== EMPTY) continue;

      const nk = posKey(nx, ny);
      if (!R.has(nk)) {
        R.add(nk);
        queue.push([nx, ny]);
      }
    }
  }

  return R;
}


/***********************
 * Black piece capturability in closure:
 * A black piece is "doomed" if it can be sandwiched vertically or horizontally by theorem-hostile squares
 ***********************/

/************************************************************
 * CHECK POSSIBLE SHIELDWALL CAPTURES INC. VIRTUAL WHITE PIECES
 ************************************************************/

function getEdgeLineSquares(b, edgeName) {
  const n = b.length - 1;
  const arr = [];

  switch (edgeName) {
    case "top":
      for (let x = 0; x <= n; x++) arr.push([x, 0]);
      break;
    case "bottom":
      for (let x = 0; x <= n; x++) arr.push([x, n]);
      break;
    case "left":
      for (let y = 0; y <= n; y++) arr.push([0, y]);
      break;
    case "right":
      for (let y = 0; y <= n; y++) arr.push([n, y]);
      break;
  }

  return arr;
}

function getInwardSquareForEdge(b, edgeName, x, y){
  const info = getEdgeInfo(x, y);
  if (!info || info.edge !== edgeName) return null;

  return [x + info.inward[0], y + info.inward[1]];
}

/**
 * Returns arrays of positions [[x,y], ...] representing contiguous
 * attacker segments on a given edge.
 */
function getAttackerEdgeSegments(b, edgeName) {
  const edgeSquares = getEdgeLineSquares(b, edgeName);
  const segments = [];
  let current = [];

  for (const [x, y] of edgeSquares) {
    if (b[x][y] === ATTACKER) {
      current.push([x, y]);
    } else {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

/**
 * Check whether a contiguous attacker segment on an edge is closed by
 * White support at both ends ALONG THE EDGE ITSELF.
 */
function isEdgeSegmentClosedByWhite(b, edgeName, segment, R) {
  const edgeSquares = getEdgeLineSquares(b, edgeName);

  // Map edge position -> index
  const indexMap = new Map();
  for (let i = 0; i < edgeSquares.length; i++) {
    indexMap.set(posKey(edgeSquares[i][0], edgeSquares[i][1]), i);
  }

  const first = segment[0];
  const last = segment[segment.length - 1];

  const firstIdx = indexMap.get(posKey(first[0], first[1]));
  const lastIdx = indexMap.get(posKey(last[0], last[1]));

  let leftClosed = false;
  let rightClosed = false;

  // Left side (before the segment on the edge)
  if (firstIdx === 0) {
    // Segment reaches edge endpoint => corner side is closed
    leftClosed = true;
  } else {
    const [lx, ly] = edgeSquares[firstIdx - 1];
    leftClosed = isWhiteSupportSquare(b, lx, ly, R);
  }

  // Right side (after the segment on the edge)
  if (lastIdx === edgeSquares.length - 1) {
    // Segment reaches edge endpoint => corner side is closed
    rightClosed = true;
  } else {
    const [rx, ry] = edgeSquares[lastIdx + 1];
    rightClosed = isWhiteSupportSquare(b, rx, ry, R);
  }

  return leftClosed && rightClosed;
}

/**
 * Real or virtual White support for shieldwall:
 * - actual DEFENDER or KING
 * - or White-reachable virtual square in R
 */
function isWhiteSupportSquare(b, x, y, R) {
  if (!inBoard(x, y)) return false;

  const v = b[x][y];

  // Real white
  if (v === DEFENDER || v === KING) return true;

  // Virtual white reachability
  if (R.has(posKey(x, y))) return true;

  // Permanent virtual white support (corners + throne)
  if (isTheoremHostileSquare(x, y, R)) return true;

  return false;
}

/**
 * Build the inward line corresponding to an attacker segment.
 * If segment is on top edge from x=3..6, inward line is y=1, x=3..6.
 */
function getInwardLineForSegment(b, edgeName, segment) {
  const inward = [];

  for (const [x, y] of segment) {
    const p = getInwardSquareForEdge(b, edgeName, x, y);
    if (!p) return null;
    inward.push(p);
  }

  return inward;
}

/**
 * Check if the inward line is completely fillable by White support
 * (real or virtual).
 */
function isCompleteShieldwallInnerLine(b, inwardLine, R) {
  if (!inwardLine || inwardLine.length === 0) return false;

  for (const [x, y] of inwardLine) {
    if (!isWhiteSupportSquare(b, x, y, R)) {
      return false;
    }
  }

  return true;
}


/**
 * Find all shieldwall-capturable attacker positions using the simplified rule:
 *
 * - contiguous attacker segment on edge
 * - inward line fully White-supported
 * - segment closed by White support at both ends
 * - enough material: whiteCount >= segment length
 */
function findShieldwallCapturableBlackEdgeGroups(b, R) {
  const toRemove = [];
  const totalWhite = currentNode.countPieces[1];
  const edges = ["top", "bottom", "left", "right"];

  for (const edge of edges) {
    const edgeSquares = getEdgeLineSquares(b, edge);
    const segments = getAttackerEdgeSegments(b, edge);

    // Build edge position -> index map once per edge
    const indexMap = new Map();
    for (let i = 0; i < edgeSquares.length; i++) {
      indexMap.set(posKey(edgeSquares[i][0], edgeSquares[i][1]), i);
    }

    for (const seg of segments) {
      const N = seg.length;
      if (N <= 0) continue;

      const first = seg[0];
      const last = seg[seg.length - 1];

      const firstIdx = indexMap.get(posKey(first[0], first[1]));
      const lastIdx = indexMap.get(posKey(last[0], last[1]));

      const touchesLeftCorner = firstIdx === 0;
      const touchesRightCorner = lastIdx === edgeSquares.length - 1;

      // If the segment spans corner-to-corner (entire edge), never capturable
      if (touchesLeftCorner && touchesRightCorner) continue;

      // Material requirement depends on how many non-corner end closures White must supply
      let requiredWhite;

      if (touchesLeftCorner || touchesRightCorner) {
        // One side closed by corner, one side must be supplied by White
        requiredWhite = N + 1;
      } else {
        // Both ends must be supplied by White
        requiredWhite = N + 2;
      }

      if (totalWhite < requiredWhite) continue;

      const inwardLine = getInwardLineForSegment(b, edge, seg);
      if (!inwardLine) continue;

      // Entire inward side must be White-supported
      if (!isCompleteShieldwallInnerLine(b, inwardLine, R)) continue;

      // Segment must be closed on both ends along the edge
      if (!isEdgeSegmentClosedByWhite(b, edge, seg, R)) continue;

      // Then the whole segment is theoretically shieldwall-capturable
      for (const pos of seg) {
        toRemove.push(pos);
      }
    }
  }

  return toRemove;
}

/***********************
 * Closure remove all doomed black pieces
 ***********************/

function closureRemoveBlack(b, R) {
  let changed = true;
  const removedSquares = [];

  while (changed) {
    changed = false;

    // Use a Set to avoid duplicates between normal capture and shieldwall capture
    const toRemoveSet = new Set();

    /************************************************
     * A) Normal theorem capture: individually doomed
     ************************************************/
    for (let x = 0; x < b.length; x++) {
      for (let y = 0; y < b[x].length; y++) {
        if (b[x][y] === ATTACKER) {
          let verticalSandwich = isTheoremHostileSquare(x, y-1, R) && isTheoremHostileSquare(x, y+1, R);
          let horizontalSandwich = isTheoremHostileSquare(x-1, y, R) && isTheoremHostileSquare(x+1, y, R);
          if (verticalSandwich || horizontalSandwich) {
            toRemoveSet.add(posKey(x, y));
          }
        }
      }
    }

    /************************************************
     * B) Shieldwall theorem capture: edge groups
     *    (complete inner white line + end anchors)
     ************************************************/
    const shieldwallRemovals = findShieldwallCapturableBlackEdgeGroups(b, R);
    for (const [x, y] of shieldwallRemovals) {
      toRemoveSet.add(posKey(x, y));
    }

    if (toRemoveSet.size === 0) break;

    for (const key of toRemoveSet) {
      const [x, y] = keyToPos(key);
      b[x][y] = EMPTY;
      R.add(key);
      removedSquares.push([x, y]);
      changed = true;
    }

    // Expand White reachability after removals
    R = expandReachable(b, R);
  }

  return { board: b, R, removedSquares };
}

/***********************
 * King reachable region K
 * This is theorem reachability, it treats DEFENDER pieces as passable support.
 ***********************/

function computeKingReachable(b,kingPos) {
  const K = new Set();
  const queue = [];

  if (!kingPos) return K;

  queue.push(kingPos);

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    const k = posKey(x, y);

    if (K.has(k)) continue;
    K.add(k);

    for (const [dx,dy] of DIRECTIONS){
      const nx = x + dx
      const ny = y + dy
      if (!inBoard(nx, ny)) continue;

      const v = b[nx][ny];
      if (v === EMPTY || v === DEFENDER || v === KING) {
        queue.push([nx, ny]);
      }
    }
  }

  return K;
}


/***********************
 * Region tests
 ***********************/

function regionTouchesCorner(b, regionSet) {
  for (const k of regionSet) {
    const [x, y] = keyToPos(k);
    if (isCorner( x, y)) return true;
  }
  return false;
}

function regionTouchesEdge(b, regionSet) {
  for (const k of regionSet) {
    const [x, y] = keyToPos(k);
    if (isEdge( x, y)) return true;
  }
  return false;
}

function countWhiteInRegion(b, regionSet) {
  let count = 0;

  for (const k of regionSet) {
    const [x, y] = keyToPos(k);
    const v = b[x][y];
    if (v === DEFENDER || v === KING) {
      count++;
    }
  }

  return count;
}


/***********************
 * Edge segment extraction
 ***********************/
function edgeSegmentsInRegion(b, edgeName, regionSet) {
  const ordered = getEdgeLineSquares(b, edgeName);
  const segments = [];
  let current = [];

  for (const [x,y] of ordered){
    if (regionSet.has(posKey(x,y))) current.push([x,y])
    else if (current.length) segments.push(current), current=[]
  }
  if (current.length) segments.push(current)

  return segments
}


/***********************
 * Main closure barricade checker
 ***********************/

function BlackWin_NoEscapeNoFortress(kingPos) {
  // Work on a copy only
  let b = cloneBoard(board);

  // Phase 1: White reachable closure
  let R = computeWhiteReachable(b);
  const closure = closureRemoveBlack(b, R);
  b = closure.board;
  R = closure.R;

  // Phase 2: King reachable region
  const K = computeKingReachable(b,kingPos);

  // No king found? Don't claim theorem win here.
  if (K.size === 0) {
    return { won: false, squares: [] };
  }

  // If king can reach a corner => White may still escape
  if (regionTouchesCorner(b, K)) {
    return { won: false, squares: [] };
  }

  // If king cannot even reach an edge => Black strategic win
  if (!regionTouchesEdge(b, K)) {
    const highlight = Array.from(K).map(keyToPos);
    return {
      won: true,
      squares: highlight,
      reducedBoard: b
    };
  }

  // Phase 3: Fortress potential
  const Wk = countWhiteInRegion(b, K);
  const edges = ["top", "bottom", "left", "right"];

  for (const edge of edges) {
    const segments = edgeSegmentsInRegion(b, edge, K);

    for (const seg of segments) {
      const L = seg.length;

      // Type 1 fortress possible
      if (Wk >= 5 && L >= 4) {
        return { won: false, squares: [] };
      }

      // Type 2 fortress possible
      if (Wk >= 7 && L >= 3) {
        return { won: false, squares: [] };
      }
    }
  }

  // No corner escape, edge reachable but no fortress possible => Black wins
  const highlight = Array.from(K).map(keyToPos);
  return {
    won: true,
    squares: highlight,
    reducedBoard: b
  };
}

/* =============================================================================================================
   WIN DETECTION FOR BLACK: STALEMATE
============================================================================================================= */
//no legal move remaining for white
function BlackWin_Starving() {
  const whiteMoves = countWhitePossibleMoves(board);
  if (whiteMoves === 0) {
    // Collect all white piece positions on the board
    const n = board.length;
    winSquares = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (board[i][j] === DEFENDER || board[i][j] === KING) {
          winSquares.push([i, j]);
        }
      }
    }
    return { won: true, squares: winSquares };
  }
  return { won: false, squares: [] };
}

/* =============================================================================================================
   WIN DETECTION FOR BLACK: DIRECT REPETITION
============================================================================================================= */
function isInverse(a, b) {
  if (!a || !b) return false;
  if (a.captured !== 0 || b.captured !== 0) return false;

  return a.from[0] === b.to[0] &&
         a.from[1] === b.to[1] &&
         a.to[0] === b.from[0] &&
         a.to[1] === b.from[1];
}

function BlackWin_Repetition(moveHistory) {
  const n = moveHistory.length;
  if (n < MAXLENGTH_DIRECTION_REPETITION) {
    return { won: false, squares: [] };
  }

  let count = 0;
  // Walk backwards checking inverse pairs
  for (let i = n - 1; i >= 2; i--) {
    if (isInverse(moveHistory[i], moveHistory[i - 2])) {
      count++;
    } else {
      break;
    }
  }
  
  if (count >= MAXLENGTH_DIRECTION_REPETITION-2) {
    const squares = [];
    // Collect involved squares (last full cycle)
    for (let i = n - 4; i < n; i++) {
      const m = moveHistory[i];
      if (m) squares.push(m.from, m.to);
    }
    return { won: true, squares };
  }
  return { won: false, squares: [] };
}

/* =============================================================================================================
   WIN AND REPETITION DETECTION
============================================================================================================= */

function checkWinforWhite(x,y) {
  // 1️⃣ White corner escape
  const cornerResult = WhiteWin_Corner(x,y);
  if (cornerResult.won) {
    winner = "white";
    winType = "Corner escape";
    winSquares = cornerResult.squares;
  }

  // 2️⃣ White edge fort
  const edgeFortResult1 = WhiteWin_EdgeFort_type1(x,y);
  if (edgeFortResult1.won) {
    winner = "white";
    winType = "Edge fort";
    winSquares = edgeFortResult1.squares;
  }

  const edgeFortResult2 = WhiteWin_EdgeFort_type2(x,y);
  if (edgeFortResult2.won) {
    winner = "white";
    winType = "Edge fort";
    winSquares = edgeFortResult2.squares;
  }
}

function checkWinforBlack(x,y,kingPos) {
  // reset by default
  winner = null;
  winType = "";
  winSquares = [];

  // 1️⃣ Black captures king (tactical immediate win)
  const kingCapturedResult = BlackWin_KingCaptured(x,y,kingPos);
  if (kingCapturedResult.won) {
    winner = "black";
    winType = "King captured";
    winSquares = kingCapturedResult.squares;
  }

  // 2️⃣ Black strategic theorem win:
  //    no eventual corner escape, no edge fort possible
  const strategicBlackResult = BlackWin_NoEscapeNoFortress(kingPos);
  if (strategicBlackResult.won) {
    winner = "black";
    winType = "Closed barricade";
    winSquares = strategicBlackResult.squares;
  }

  // 3 Black wins if White has no legal moves
  const starvingBlackResult = BlackWin_Starving();
  if (starvingBlackResult.won) {
    winner = "black";
    winType = "Starving";
    winSquares = starvingBlackResult.squares;
  }
}

function checkRepetition(moveHistory) {
  // Black wins on direct repetition
  const repetitionBlackResult = BlackWin_Repetition(moveHistory);
  if (repetitionBlackResult.won) {
    winner = "black";
    winType = "Direct repetition";
    winSquares = repetitionBlackResult.squares;
  }
}

function checkInfiniteGame(moveNumber,lastMoveWithCapture,lastmove) {
  if (moveNumber-lastMoveWithCapture >= MAXLENGTH_WITHOUT_CAPTURE*2) {
    winner = "draw";
    winType = `more than ${MAXLENGTH_WITHOUT_CAPTURE} moves without capture`;
    winSquares = [lastmove];
    return { winner, winType, winSquares };
  }
}
