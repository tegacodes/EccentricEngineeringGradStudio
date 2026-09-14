# Find & Replace Extension

Replaces every instance of the phrase "climate" with "capitalism" on
any page you visit, using a content script and a `TreeWalker` to safely edit
only the visible text on the page.

## Files

- `manifest.json` — declares the content script and what pages it runs on
- `content.js` — the actual find/replace logic (heavily commented)
- `icon.png` — placeholder icon

## Try changing

- The `FIND_PATTERN` and `REPLACEMENT` constants at the top of `content.js`
- Swap the regex for a plain string if you don't need the case-insensitive matching

## Find & Replace Extension Walk Through

`manifest.json` is the extension's ID card — it tells the browser who this extension is and what it needs. `content.js` is the file that actually gets injected into the page.

## The Manifest

```json
{
  "manifest_version": 3,
  "name": "Climate to Capitalism",
  "version": "1.0",
  "description": "Replaces the phrase 'climate' with 'capitalism' on any page.",
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

The important part is `"content_scripts"`. `"matches": ["<all_urls>"]` tells the browser to run this on every page, and `"js": ["content.js"]` points to the file to inject. `"run_at": "document_idle"` means wait until the page has mostly finished loading before running, so the script isn't fighting the page mid-load.

## The Content Script

We don't want to grab the page's raw HTML and do a big string replace — that's risky, since it can break links, scripts, and other markup. Instead, we walk through only the visible _text_ on the page, using a browser-native tool called a `TreeWalker`.

```js
function replaceInTextNode(node) {
  const pattern = /climate/gi;
  if (pattern.test(node.nodeValue)) {
    node.nodeValue = node.nodeValue.replace(pattern, "capitalism");
  }
}
```

This function takes a single text node, checks it against the pattern — the `i` flag makes it case-insensitive — and swaps in the replacement if it matches.

Next, we walk the page and run that function on every text node:

```js
function walkAndReplace(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parentTag = node.parentNode && node.parentNode.nodeName;
      if (parentTag === "SCRIPT" || parentTag === "STYLE") {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode;
  while ((currentNode = walker.nextNode())) {
    replaceInTextNode(currentNode);
  }
}

walkAndReplace(document.body);
```

`SHOW_TEXT` tells the walker to only stop at text nodes, skipping everything else. Text inside `<script>` or `<style>` tags gets rejected, since we don't want to accidentally rewrite actual code or CSS. The loop then visits every remaining text node and runs the replace function on it.

That covers most of the extension — but many sites load content in dynamically after the initial page load (infinite scroll, single-page apps, etc.), so we add a `MutationObserver` to keep watching for new content and run the same logic on it:

```js
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
```

## Testing It

Go to `chrome://extensions`, enable Developer Mode, click **Load unpacked**, and select the folder. Visit any page with the target phrase on it, and you'll see it swapped in real time.

## Extending It: Add a Popup

You can add a toolbar popup — for example, a toggle to turn the replacement on/off, or fields to customize the find/replace words. To do that, add an `"action"` key to the manifest:

```json
"action": {
  "default_popup": "popup.html",
  "default_icon": "icon.png"
}
```

`default_popup` points to the HTML file that opens when the toolbar icon is clicked; `default_icon` sets the icon shown in the toolbar. From there, `popup.js` can use `chrome.storage` to save preferences, or `chrome.tabs.sendMessage()` to talk to the content script directly.
