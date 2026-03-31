// =============================
// THEME / VISUAL MENU
// Supports multiple theme menus
// =============================

let coordinatesVisible = true;
let boardTheme = "default";
let king_design = "" // Simple (default), Ytreza

const stored_coordinatesVisible = localStorage.getItem("coordinatesVisible");
if (stored_coordinatesVisible !== null){ coordinatesVisible = stored_coordinatesVisible === "true";}

const stored_king_design = localStorage.getItem("king_design");
if (stored_king_design){ king_design = stored_king_design;}


function getBoardFrame() {
  return document.getElementById("boardFrame");
}

function toggleThemeMenu(event) {
  if (!event) return;

  event.preventDefault();
  event.stopPropagation();

  const wrapper = event.currentTarget.closest(".themeMenuWrapper");
  if (!wrapper) return;

  const menu = wrapper.querySelector(".themeMenu");
  if (!menu) return;

  // Close all other theme menus first
  document.querySelectorAll(".themeMenu").forEach((otherMenu) => {
    if (otherMenu !== menu) {
      otherMenu.classList.add("hidden");
    }
  });

  menu.classList.toggle("hidden");
  updateAllThemeMenuLabels();
}

function closeThemeMenu(sourceElement = null) {
  if (sourceElement) {
    const wrapper = sourceElement.closest(".themeMenuWrapper");
    if (!wrapper) return;

    const menu = wrapper.querySelector(".themeMenu");
    if (!menu) return;

    menu.classList.add("hidden");
    return;
  }

  // Fallback: close all menus
  document.querySelectorAll(".themeMenu").forEach((menu) => {
    menu.classList.add("hidden");
  });
}

function updateAllThemeMenuLabels() {
  document.querySelectorAll(".toggleCoordinatesOption").forEach((button) => {
    button.textContent = `Coordinates: ${coordinatesVisible ? "On" : "Off"}`;
  });

  document.querySelectorAll(".toggleKingDesignOption").forEach((button) => {
    button.textContent = `Pieces: ${king_design === "Ytreza" ? "Ytreza" : "Standard"}`;
  });

  document.querySelectorAll(".boardThemeLabel").forEach((button) => {
    const pretty =
      boardTheme === "default" ? "Classic" :
      boardTheme.charAt(0).toUpperCase() + boardTheme.slice(1);

    button.textContent = `Board Colors: ${pretty}`;
  });

  document.querySelectorAll(".RuleBlackWin").forEach((button) => {
    button.textContent = `Black win: ${BLACK_SURROUND === "Full" ? "Full" : "Partial"}`;
  });
}

// Close menus when clicking outside any theme menu wrapper
document.addEventListener("click", (e) => {
  if (!e.target.closest(".themeMenuWrapper")) {
    closeThemeMenu();
  }
});

/* =============================
====  SHOW COORDINATES  ====
============================= */

function toggleCoordinates(event) {

  const frame = getBoardFrame();
  if (!frame) return;

  coordinatesVisible = !coordinatesVisible;
  frame.classList.toggle("coords-hidden", !coordinatesVisible);

  localStorage.setItem("coordinatesVisible", coordinatesVisible);
  updateAllThemeMenuLabels();
}

/* =============================
====  KING DESIGN  ====
============================= */

function toggleKingDesign() {
  // Toggle between Standard ("") and Ytreza
  king_design = (king_design === "Ytreza") ? "" : "Ytreza";

  localStorage.setItem("king_design", king_design);
  updateAllThemeMenuLabels();
  render();
}

/* =============================
====  BOARD DESIGN  ====
============================= */
const BOARD_THEMES = [
  "default",
  "forest",
  "slate",
  "walnut",
  "midnight",
];

function applyBoardTheme(theme) {
  const boardEl = document.getElementById("board");
  if (!boardEl) return;

  if (!BOARD_THEMES.includes(theme)) theme = "default";

  // Remove all theme classes first
  BOARD_THEMES.forEach((t) => {
    if (t !== "default") {
      boardEl.classList.remove(`theme-${t}`);
      document.body.classList.remove(`theme-${t}`);
    }
  });

  boardTheme = theme;

  if (theme !== "default") {
    boardEl.classList.add(`theme-${theme}`);
    document.body.classList.add(`theme-${theme}`);
  }
  localStorage.setItem("boardTheme", boardTheme);
  updateBoardThemeButtonLabel();
}

function setBoardTheme(theme, sourceElement = null) {
  applyBoardTheme(theme);
  closeThemeMenu(sourceElement);
}

function updateBoardThemeButtonLabel() {
  const btn = document.getElementById("boardThemeCycleButton");
  if (!btn) return;

  // Nice readable names
  const prettyName = boardTheme === "default" ? "Classic" :
                     boardTheme.charAt(0).toUpperCase() + boardTheme.slice(1);
  btn.textContent = `Board: ${prettyName}`;
}

// Cycle to the next theme
function cycleBoardTheme(event) {
  if (!event) return;

  event.stopPropagation(); // prevent menu from closing immediately

  const currentIndex = BOARD_THEMES.indexOf(boardTheme);
  const nextIndex = (currentIndex + 1) % BOARD_THEMES.length;
  applyBoardTheme(BOARD_THEMES[nextIndex]);
}
