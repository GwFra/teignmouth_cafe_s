// Teignmouth town centre — shared by the map view (as the default centre) and
// the cafe dialog's place autocomplete (as a search bias so "The..." finds a
// Teignmouth cafe, not one in Truro).
export const TEIGNMOUTH = { lat: 50.5462, lng: -3.4966 };

// A rough bounding box around Teignmouth, used to bias (not restrict) the
// Places Autocomplete results in the admin cafe dialog.
export const TEIGNMOUTH_BOUNDS = {
  north: TEIGNMOUTH.lat + 0.03,
  south: TEIGNMOUTH.lat - 0.03,
  east: TEIGNMOUTH.lng + 0.05,
  west: TEIGNMOUTH.lng - 0.05,
};

// `@react-google-maps/api` requires this array to be a stable reference
// across renders (a new array each render triggers a "LoadScript reloaded"
// warning and re-injects the script), so it's defined once here and shared
// by every `useJsApiLoader` call in the app.
export const GOOGLE_MAPS_LIBRARIES: "places"[] = ["places"];
