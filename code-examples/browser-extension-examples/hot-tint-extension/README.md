# Sunny Day Reminder Extension

A background-only extension that checks the weather on a timer using the
free [Open-Meteo](https://open-meteo.com/) API (no API key needed) and pops
up a system notification when it's clear/sunny outside.

## Files

- `manifest.json` — declares the background service worker and permissions
- `background.js` — the alarm + weather check + notification logic (heavily commented)
- `icon.png` — placeholder icon

## Try changing

- `DEFAULT_LAT` / `DEFAULT_LON` at the top of `background.js` — set these to your own location
- `CHECK_INTERVAL_MINUTES` — turn this down (e.g. `0.1`) while testing so you're not waiting an hour
- `SUNNY_WEATHER_CODES` — see the [Open-Meteo weather code docs](https://open-meteo.com/en/docs) to trigger on rain, snow, etc. instead

# How It Works: Sunny Day Reminder Extension

This extension checks the weather periodically, and if it's sunny outside, it pops up a notification. It covers **background scripts**, **alarms**, **fetching data from an API**, and **browser notifications**, all of which show up constantly in real extensions.

## What We're Building

1. Every hour or so, the extension wakes up
2. It asks a weather service, "what's it like right now?"
3. If the answer comes back "clear" or "sunny," it pops up a notification
4. That's it.

Unlike the find-and-replace extension, which reached _into_ a web page and changed its content, this one doesn't touch any web pages at all — it just quietly lives in the background of the browser. That makes the file structure even simpler:

```
sunny-reminder-extension/
├── manifest.json
└── background.js
```

## The Manifest

The manifest is always first — it's the extension's ID card. It tells the browser the extension's name, what permissions it needs, and where its code lives.

```json
{
  "manifest_version": 3,
  "name": "Sunny Day Reminder",
  "version": "1.0",
  "description": "Pops up a reminder when it's sunny outside.",
  "permissions": ["notifications", "alarms", "storage"],
  "background": {
    "service_worker": "background.js"
  }
}
```

The permissions are worth pausing on:

- **`"notifications"`** — needed to actually show a popup message
- **`"alarms"`** — lets the background script say "wake me up every hour" instead of running constantly and burning battery
- **`"storage"`** — used to remember things, like where the user is located

`"background": { "service_worker": "background.js" }` just tells the browser where the background file lives and to run it invisibly.

## Setting the Alarm

First, set up the alarm:

```js
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("checkWeather", { periodInMinutes: 60 });
});
```

`onInstalled` runs once, the moment the extension gets installed. Inside it, we create an alarm named `"checkWeather"` and tell it to fire every 60 minutes.

An alarm firing doesn't _do_ anything by itself, though — it has to be listened for:

```js
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkWeather") {
    checkIfSunny();
  }
});
```

When the alarm goes off, we check its name (useful if you ever have multiple alarms going for different things) and call `checkIfSunny()` if it's the weather one.

## Asking the Internet About the Weather

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

Now the actual weather check:

```js
async function checkIfSunny() {
  const { lat, lon } = await getSavedLocation();

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`;
  const response = await fetch(url);
  const data = await response.json();

  const code = data.current.weather_code;

  if (code === 0 || code === 1) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "It's sunny outside! ☀️",
      message: "Maybe step away from the screen for a bit?",
    });
  }
}
```

Walking through it: we grab the saved location, then build a URL for the [Open-Meteo](https://open-meteo.com/) API — a good choice for a tutorial since it's free and needs no sign-up or API key. We're asking for the current "weather code" at that latitude/longitude.

After `fetch`-ing the URL and parsing the JSON response, the key line is `data.current.weather_code`. Open-Meteo uses numeric codes for conditions, where `0` means "clear sky" and `1` means "mainly clear." If either of those comes back, `chrome.notifications.create` fires a notification with a type, icon, title, and message.

## Testing It

Go to `chrome://extensions`, enable Developer Mode, click **Load unpacked**, and select the folder.

Since the alarm is set to fire every 60 minutes, you don't want to sit around waiting an hour to test it. Temporarily shorten the interval:

```js
chrome.alarms.create("checkWeather", { periodInMinutes: 0.1 }); // ~6 seconds, for testing only!
```

Just remember to change it back before using this day to day — otherwise your browser will be very persistent about the weather.

If conditions are sunny/clear at your saved (or default) location, you should see the notification pop up within a few seconds.

## Extending It

A few ideas to take this further:

- Only notify once per day, so it's not nagging you every hour
- Swap "sunny" for whatever condition you actually care about — rain, snow, a temperature threshold
- Build a popup page where you get updates for the location of a friend who lives somewhere else. Or for a climactically significant place.
- Pull historic weather data for this date and do something with it
- Dont do a popup, but make a change to the way web pages look.
- Add a settings page using `chrome.storage` so people can customize the message
