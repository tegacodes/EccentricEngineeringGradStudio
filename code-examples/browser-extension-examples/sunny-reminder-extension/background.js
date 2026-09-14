// background.js
//
// This is a "service worker" — code that runs invisibly in the background,
// with no web page and no DOM of its own. It periodically checks the
// weather using the free Open-Meteo API (no API key required) and fires a
// browser notification if it's clear/sunny.

// How often to check the weather, in minutes. 60 = once an hour.
// (Turn this down to something small, like 0.1, while testing so you don't
// have to wait an hour to see it work — just remember to change it back!)
const CHECK_INTERVAL_MINUTES = 60;

// Fallback coordinates if the user hasn't saved a location yet.
// Defaults to New York City — swap these for your own city while testing.
const DEFAULT_LAT = 40.7128;
const DEFAULT_LON = -74.0060;

// Open-Meteo "weather codes" that count as sunny/clear for our purposes.
// 0 = clear sky, 1 = mainly clear.
const SUNNY_WEATHER_CODES = [0, 1];

// Set up the recurring alarm once, when the extension is first installed.
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("checkWeather", {
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });
});

// Whenever any alarm fires, check if it's the one we care about.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkWeather") {
    checkIfSunny();
  }
});

/**
 * Look up a saved lat/lon from chrome.storage, or fall back to the default
 * location defined above. (Background scripts can't use navigator.geolocation
 * directly since there's no DOM/page — that would need to happen in a popup
 * or content script and get saved here via chrome.storage.)
 */
function getSavedLocation() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["lat", "lon"], (result) => {
      if (result.lat && result.lon) {
        resolve({ lat: result.lat, lon: result.lon });
      } else {
        resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
      }
    });
  });
}

/**
 * Fetch current weather for the saved/default location, and fire a
 * notification if the weather code indicates clear/sunny skies.
 */
async function checkIfSunny() {
  const { lat, lon } = await getSavedLocation();

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`;

  const response = await fetch(url);
  const data = await response.json();
  const code = data.current.weather_code;

  if (SUNNY_WEATHER_CODES.includes(code)) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "It's sunny outside! ☀️",
      message: "Maybe step away from the screen for a bit?"
    });
  }
}
