// Mapbox geocoding wrapper. Uses forward geocoding.
// If no MAPBOX_TOKEN is set, returns a deterministic mock coordinate so the app remains usable.
const fetch = require("node-fetch");

const { MAPBOX_TOKEN } = process.env;

async function geocode(place) {
  if (!place) return { coordinates: [0, 0], country: "" };
  if (!MAPBOX_TOKEN) {
    // Deterministic pseudo coordinate from string hash (for demo without keys)
    let h = 0;
    for (let i = 0; i < place.length; i++) h = (h * 31 + place.charCodeAt(i)) | 0;
    const lng = ((h % 3600) / 10) - 180;
    const lat = (((h >> 3) % 1700) / 10) - 85;
    return { coordinates: [lng, lat], country: "" };
  }
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    place
  )}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    const feat = data.features && data.features[0];
    if (!feat) return { coordinates: [0, 0], country: "" };
    const country =
      (feat.context || []).find((c) => c.id && c.id.startsWith("country"))?.text || "";
    return { coordinates: feat.center, country };
  } catch (e) {
    return { coordinates: [0, 0], country: "" };
  }
}

module.exports = { geocode, hasToken: !!MAPBOX_TOKEN, MAPBOX_TOKEN: MAPBOX_TOKEN || "" };
