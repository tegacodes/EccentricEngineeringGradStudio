# Getting Started With Google Chrome Extensions (Hello World)

This example demonstrates how to create a simple "Hello World" Chrome Extension.
For more details, visit the [official tutorial](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world).

## Running This Extension

1. Clone this repository.
2. Load this directory in Chrome as an [unpacked extension](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked).
3. Click the extension icon in the Chrome toolbar, then select the "Hello Extensions" extension. A popup will appear displaying the text "Hello Extensions".

# Walk through

Before building anything, it helps to know what a browser extension actually _is_.

## What Is It, Really?

A browser extension is just a small program that lives inside your browser. It does not require installer, no separate app window. An extension is just a folder of files that the browser loads and runs alongside whatever page you're looking at. And because it's just files — HTML, JavaScript, JSON — if you've written any bit of web code before, you already know most of what you need.

## The File Structure

```
my-extension/
├── manifest.json      # required
├── background.js      # optional
├── content.js         # optional
├── popup.html          # optional
├── popup.js
└── icon.png
```

Every extension needs exactly one required file — `manifest.json`. Everything else is optional, and which files you include depends on what your extension actually does. Some extensions are just a popup. Some just quietly run in the background. Some reach into the pages you visit. You mix and match depending on the project.

## The Manifest

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "description": "What it does"
}
```

Think of the manifest as the extension's ID card. The browser opens the folder, reads this file first, and figures out who you are, what version you're on, and what you claim to do. Everything else about the extension — what permissions it has, what files run where — gets declared in here too.

## The Three Worlds

This is the one concept worth understanding before writing any code, because it trips people up: an extension's code can live in three different places, and they don't automatically talk to each other.

| Context            | Runs where                                                |
| ------------------ | --------------------------------------------------------- |
| **Popup**          | The little window when you click the toolbar icon         |
| **Content script** | Inside the actual webpage — can read and edit its content |
| **Background**     | An invisible worker — no page, just listens and reacts    |

Popup is for UI you click on. Content scripts are how you reach INTO a page and change what's on it. Background scripts are for things that should just quietly run, like checking something on a timer. Different jobs, different files.

## Permissions

Extensions have to ask permission for anything sensitive. Want to read the current tab? Ask for `"activeTab"`. Want to save data? Ask for `"storage"`. Want to touch every page you visit? Ask for `"<all_urls>"`. You list these in the manifest, and the browser handles showing the user what's being requested.

## The Mental Model, Summed Up

- A manifest as the ID card
- Three possible "worlds" your code can run in — popup, content script, background
- Permissions declared upfront for anything sensitive

With that in place, the [find-and-replace walkthrough](./find-replace-walkthrough.md) puts it into practice with a real content script.
