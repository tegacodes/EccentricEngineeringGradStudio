// How often to check the temperature, in minutes.
// Currently set to 1 for fast testing — bump this up (e.g. 60) for normal use.
const CHECK_INTERVAL_MINUTES = 1;

// Fallback coordinates if the user hasn't saved a location yet.
// Currently set to New York City.
const DEFAULT_LAT = 40.7128;
const DEFAULT_LON = -74.006;

// The temperature (in Fahrenheit) above which we consider it "hot"
// and flip the isHot flag to true.
const TEMP_THRESHOLD_F = 60;

// Runs once when the extension is first installed.
chrome.runtime.onInstalled.addListener(() => {
  // Check immediately on install, so we don't have to wait for the
  // first alarm to fire before anything happens.
  checkIfHot();

  // Then set up the recurring alarm for all future checks.
  chrome.alarms.create("checkTemp", {
    periodInMinutes: CHECK_INTERVAL_MINUTES,
  });
});

// Fires every time any alarm goes off — we filter for the one we care about.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkTemp") {
    checkIfHot();
  }
});

/**
 * Look up a saved lat/lon from chrome.storage, or fall back to the default
 * location defined above. Background scripts have no DOM, so we can't use
 * navigator.geolocation directly here — that would need to happen in a
 * popup or content script and get saved via chrome.storage instead.
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
 * Fetch the current temperature for the saved/default location and store
 * whether it's "hot" so any open tab's content script can react to it.
 */
async function checkIfHot() {
  const { lat, lon } = await getSavedLocation();

  // current=temperature_2m -> current air temp, measured 2m off the ground
  // temperature_unit=fahrenheit -> get °F back directly, no conversion needed
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&temperature_unit=fahrenheit`;
  const response = await fetch(url);
  const data = await response.json();
  const temp = data.current.temperature_2m;

  // Handy for confirming this is actually running — check it in the
  // service worker console under chrome://extensions.
  console.log("Current temp:", temp);

  // Instead of a notification, we just save a flag. Every open tab's
  // content script is listening for this value to change (see content.js).
  chrome.storage.local.set({
    isHot: temp > TEMP_THRESHOLD_F,
    currentTemp: temp,
  });
}
