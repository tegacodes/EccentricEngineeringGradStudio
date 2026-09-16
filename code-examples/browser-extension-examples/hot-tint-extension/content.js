// A unique id for our overlay div, so we can find/remove it later
// and so we don't accidentally add a second one on top of the first.
const OVERLAY_ID = "hot-outside-tint-overlay";

/**
 * Adds a semi-transparent yellow div covering the whole viewport.
 */
function showTint() {
  if (document.getElementById(OVERLAY_ID)) return; // already showing, don't duplicate

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;

  // Fix it to the viewport (not the page), so it stays in place even
  // if the user scrolls, and covers the full visible screen.
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";

  overlay.style.backgroundColor = "yellow";
  overlay.style.opacity = "0.25"; // keep it subtle, not a solid wall of yellow

  overlay.style.pointerEvents = "none"; // lets you still click through it to the page underneath
  overlay.style.zIndex = "999999"; // sit on top of virtually anything else on the page

  document.documentElement.appendChild(overlay);
}

/**
 * Removes the overlay, if it exists.
 */
function hideTint() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
}

// Check current state as soon as the page loads, in case it's already
// hot by the time this page opens (rather than only reacting to future changes).
chrome.storage.local.get(["isHot"], (result) => {
  if (result.isHot) showTint();
});

// Stay reactive: if background.js updates isHot while this page is already
// open, react immediately without needing a page reload.
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isHot) {
    if (changes.isHot.newValue) {
      showTint();
    } else {
      hideTint();
    }
  }
});
