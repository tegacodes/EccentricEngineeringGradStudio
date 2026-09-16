# Hot Outside Tint Extension

A two-part extension that checks the temperature on a timer using the free
[Open-Meteo](https://open-meteo.com/) API (no API key needed) and tints
every page you visit a pale yellow when it's over a set threshold outside.

## Files

- `manifest.json` — declares the background service worker, content script, and permissions
- `background.js` — the alarm + temperature check logic (heavily commented)
- `content.js` — watches for the "hot" flag and adds/removes the yellow overlay (heavily commented)

## Try changing

- `DEFAULT_LAT` / `DEFAULT_LON` at the top of `background.js` — set these to your own location
- `TEMP_THRESHOLD_F` — the temperature that triggers the tint
- `CHECK_INTERVAL_MINUTES` — turn this down (e.g. `0.1` or `1`) while testing so you're not waiting an hour
- The overlay's `backgroundColor` and `opacity` in `content.js` — try a different color, or make it more/less subtle

# How It Works: Hot Outside Tint Extension

This extension checks the temperature periodically, and if it's over a set threshold, it tints every page you're looking at yellow. It covers **background scripts**, **alarms**, **fetching data from an API**, and — new this time — **communicating between a background script and a content script**, and **manipulating the page's DOM directly**.

## What We're Building

1. Every hour or so, the extension wakes up
2. It asks a weather service, "what's the temperature right now?"
3. It saves a simple true/false flag — "is it hot?" — into shared storage
4. A content script running on every page is watching that flag, and adds or removes a yellow overlay in response

Unlike the sunny-day notification extension, this one _does_ reach into web pages — it just doesn't touch their content or text, only adds a visual layer on top. That means we need a content script this time, so there are three files instead of two:

```
hot-outside-tint-extension/
├── manifest.json
├── background.js
└── content.js
```

## The Manifest

The manifest is always first — it's the extension's ID card. It tells the browser the extension's name, what permissions it needs, and where its code lives.

```json
{
  "manifest_version": 3,
  "name": "It's Hot Reminder",
  "version": "1.0",
  "description": "Tints every page yellow when it's over 60°F outside.",
  "permissions": ["alarms", "storage"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ]
}
```

Two things worth pausing on. First, the permissions list is just `"alarms"` and `"storage"` — no `"notifications"`, since we're not using them at all here. Second, there's a `content_scripts` block, the same shape you'd see in a find-and-replace style extension, pointing at `content.js` so it runs on every page.

## Setting the Alarm

First, set up the alarm:

```js
chrome.runtime.onInstalled.addListener(() => {
  checkIfHot();
  chrome.alarms.create("checkTemp", { periodInMinutes: 60 });
});
```

`onInstalled` runs once, the moment the extension gets installed. We call `checkIfHot()` immediately here, on top of setting up the alarm, so there's an instant check on install rather than waiting a full interval for the first result.

An alarm firing doesn't _do_ anything by itself, though — it has to be listened for:

```js
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkTemp") {
    checkIfHot();
  }
});
```

When the alarm goes off, we check its name (useful if you ever have multiple alarms going for different things) and call `checkIfHot()` if it's the temperature one.

## Asking the Internet About the Temperature

One thing worth knowing up front: background scripts don't have access to the DOM, which means no `navigator.geolocation` the way you'd normally grab a user's location in a webpage. The simple workaround is to use a saved location, or fall back to a default spot:

```js
function getSavedLocation() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["lat", "lon"], (result) => {
      if (result.lat && result.lon) {
        resolve({ lat: result.lat, lon: result.lon });
      } else {
        resolve({ lat: 40.7128, lon: -74.006 }); // default: NYC
      }
    });
  });
}
```

This checks storage for a saved latitude/longitude, and defaults to New York City if there isn't one yet. It's easy to swap this out later for a real "type in your city" popup.

Now the actual temperature check:

```js
async function checkIfHot() {
  const { lat, lon } = await getSavedLocation();

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&temperature_unit=fahrenheit`;
  const response = await fetch(url);
  const data = await response.json();
  const temp = data.current.temperature_2m;

  console.log("Current temp:", temp);

  chrome.storage.local.set({
    isHot: temp > TEMP_THRESHOLD_F,
    currentTemp: temp,
  });
}
```

Walking through it: we grab the saved location, then build a URL for the [Open-Meteo](https://open-meteo.com/) API — a good choice for a tutorial since it's free and needs no sign-up or API key. `current=temperature_2m` asks for the air temperature at the standard weather-station height, and `temperature_unit=fahrenheit` gets us °F directly instead of converting from Celsius ourselves.

This is the key difference from a notification-based version: instead of ending with `chrome.notifications.create`, we end with `chrome.storage.local.set`. We're just saving a plain boolean, `isHot`, plus the current temperature. The background script's job stops there — it doesn't know or care what happens next, it's just leaving a note in shared storage for anyone who's listening.

## Reacting on the Page

This is the new part. `content.js` runs inside actual web pages, so it's where we can create real DOM elements:

```js
const OVERLAY_ID = "hot-outside-tint-overlay";

function showTint() {
  if (document.getElementById(OVERLAY_ID)) return; // already showing

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.backgroundColor = "yellow";
  overlay.style.opacity = "0.25";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "999999";
  document.documentElement.appendChild(overlay);
}

function hideTint() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
}
```

A couple of these style properties are doing real work. `position: fixed` pins the overlay to the viewport rather than the page, so it stays in place even if you scroll. `pointerEvents: none` is the important one — without it, this big yellow div would sit on top of the page and block every click; with it, clicks pass straight through to whatever's underneath, so the page still works normally. `zIndex: 999999` makes sure it renders above virtually anything else on the page.

Now, how do we decide when to show or hide it?

```js
chrome.storage.local.get(["isHot"], (result) => {
  if (result.isHot) showTint();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isHot) {
    if (changes.isHot.newValue) {
      showTint();
    } else {
      hideTint();
    }
  }
});
```

Two checks happen here. First, when the page loads, we check storage once immediately, in case it's already hot by the time you open a new tab. Second, `chrome.storage.onChanged` fires any time a stored value changes, from anywhere in the extension — so if you already have a tab open and the background script updates `isHot` while you're on it, this listener catches the change live and reacts instantly, no page reload needed.

## Testing It

Go to `chrome://extensions`, enable Developer Mode, click **Load unpacked**, and select the folder.

You don't even need to wait for a real temperature reading to test the visual side. Open the service worker console (click "service worker" on the extension's card) and run:

```js
chrome.storage.local.set({ isHot: true });
```

Any open tab should tint yellow instantly, since it's listening for exactly this kind of storage change. Run it again with `isHot: false` to confirm it disappears.

Once that's confirmed working, shorten `CHECK_INTERVAL_MINUTES` temporarily so you're not waiting an hour to see the real weather-driven version work end to end. Just remember to change it back before using this day to day.

## Extending It

Ideas to take this further:

- could be more interesting to explore the difference between today and historic conditions
- build something that responds to conditions at the location of a friend elsewhere. Or for a climactically significant place.
- explore different web modifications - content tweaks, design changes, sound?
