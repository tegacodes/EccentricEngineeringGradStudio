// content.js
//
// This script gets injected into every page (see "matches": ["<all_urls>"]
// in manifest.json). It walks through the page's visible TEXT ONLY (not the
// HTML tags themselves) and replaces any instance of "climate" with
// "capitalism", case-insensitive.

// The word/phrase we're looking for, and what we're swapping it with.
// (Feel free to change these two things to experiment!)
const FIND_PATTERN = /climate/gi;
const REPLACEMENT = "capitalism";

/**
 * Given a single text node, replace the target phrase inside it (if present).
 * We only ever touch node.nodeValue here — never innerHTML — so we can't
 * accidentally break page structure or strip out real HTML elements.
 */
function replaceInTextNode(node) {
  if (FIND_PATTERN.test(node.nodeValue)) {
    node.nodeValue = node.nodeValue.replace(FIND_PATTERN, REPLACEMENT);
  }
}

/**
 * The following function walks every text node inside `root` and run our replace function on it.
 * Uses a TreeWalker, which is a built-in browser tool for efficiently
 * visiting nodes of a certain type (here: SHOW_TEXT, i.e. text only).
 */
function walkAndReplace(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      // Don't touch text inside <script> or <style> tags — that's code/CSS,
      // not content, and rewriting it could break the page.
      const parentTag = node.parentNode && node.parentNode.nodeName;
      if (parentTag === "SCRIPT" || parentTag === "STYLE") {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  //here we call the replaceInTextNode function on any node that is acceped by the above conditional
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    replaceInTextNode(currentNode);
  }
}

// Run once as soon as this script loads (page has already mostly settled,
// since manifest.json sets "run_at": "document_idle").
walkAndReplace(document.body);

// Lots of modern sites load content in dynamically after the initial load
// (infinite scroll, single-page apps, ads, etc). A MutationObserver lets us
// keep watching the page and re-run our replace logic on anything new.
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        replaceInTextNode(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        walkAndReplace(node);
      }
    });
  }
});

observer.observe(document.body, { childList: true, subtree: true });
