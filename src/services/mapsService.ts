const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
import { emitApiError } from "./apiErrorBus";

// Persistent cache for search queries
const CACHE_KEY = "reroute_search_cache";
let searchCache: Record<string, any[]> = JSON.parse(
  localStorage.getItem(CACHE_KEY) || "{}",
);

export const clearMapsCache = () => {
  searchCache = {};
  localStorage.removeItem(CACHE_KEY);
};


const saveToCache = (query: string, results: any[]) => {
  searchCache[query] = results;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(searchCache));
  } catch (e) {
    console.warn("Search cache persistence failed:", e);
  }
};

const ROUTES_CACHE_KEY = "reroute_routes_cache";
let routesCache: Record<string, { distanceM: number; durationS: number }> = JSON.parse(
  localStorage.getItem(ROUTES_CACHE_KEY) || "{}"
);

const saveToRoutesCache = (key: string, result: { distanceM: number; durationS: number }) => {
  routesCache[key] = result;
  try {
    localStorage.setItem(ROUTES_CACHE_KEY, JSON.stringify(routesCache));
  } catch (e) {
    console.warn("Routes cache persistence failed:", e);
  }
};

export interface MapsPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  openingHours?: string[];
  editorialSummary?: string;
  photoUrl?: string;
}

export const searchPlaces = async (
  query: string,
  biasLocation?: { lat: number; lng: number }
): Promise<MapsPlace[]> => {
  if (!query) return [];

  const cacheKey = biasLocation
    ? `${query}_${Math.round(biasLocation.lat)}_${Math.round(biasLocation.lng)}`
    : query;

  if (searchCache[cacheKey]) return searchCache[cacheKey];

  if (!API_KEY) {
    throw new Error("Google Maps API Key is missing");
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places:searchText`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.regularOpeningHours,places.editorialSummary,places.photos",
        },
        body: JSON.stringify({
          textQuery: query,
          ...(biasLocation && {
            locationBias: {
              circle: {
                center: {
                  latitude: biasLocation.lat,
                  longitude: biasLocation.lng,
                },
                radius: 50000.0, // 50km radius
              },
            },
          }),
        }),
      },
    );

    if (!response.ok) {
      let errorMessage = "Failed to fetch places from Google";
      let isQuota = false;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
        isQuota = response.status === 429 && errorMessage.toLowerCase().includes("quota");
      } catch (e) {}
      emitApiError({ source: "google-maps", message: errorMessage, isQuota });
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const results: MapsPlace[] = (data.places || []).map((p: any) => ({
      id: p.id,
      name: p.displayName.text,
      address: p.formattedAddress,
      lat: p.location.latitude,
      lng: p.location.longitude,
      types: p.types || [],
      openingHours: p.regularOpeningHours?.weekdayDescriptions || [],
      editorialSummary: p.editorialSummary?.text,
      photoUrl: p.photos?.[0]?.name
        ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?key=${API_KEY}&maxHeightPx=400&maxWidthPx=400`
        : undefined,
    }));

    saveToCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error("Maps Search Error:", error);
    throw error;
  }
};

export const fetchRouteSegment = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: "driving" | "transit" | "walking",
  departureTime?: Date
): Promise<{ distanceM: number; durationS: number }> => {
  if (!API_KEY) throw new Error("Google Maps API Key is missing");

  // Format mode for API
  let travelMode = "DRIVE";
  if (mode === "transit") travelMode = "TRANSIT";
  if (mode === "walking") travelMode = "WALK";

  // Cache key (round to 4 decimals to avoid tiny jitter cache misses)
  const oLat = origin.lat.toFixed(4);
  const oLng = origin.lng.toFixed(4);
  const dLat = destination.lat.toFixed(4);
  const dLng = destination.lng.toFixed(4);
  const cacheKey = `${oLat},${oLng}_${dLat},${dLng}_${travelMode}`;

  if (routesCache[cacheKey] && mode !== "transit") {
    // Transit is time-dependent, so we might not want to aggressively cache it if departureTime matters a lot.
    // However, for limited API calls, caching transit is also fine. We'll cache all modes.
    return routesCache[cacheKey];
  }

  try {
    const body: any = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: travelMode,
      ...(travelMode === "DRIVE" && { routingPreference: "TRAFFIC_AWARE" }),
    };

    if (travelMode === "TRANSIT" && departureTime) {
      body.departureTime = departureTime.toISOString();
    }

    const response = await fetch(`https://routes.googleapis.com/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMessage = "Failed to fetch route";
      let isQuota = false;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
        isQuota = response.status === 429 && errorMessage.toLowerCase().includes("quota");
      } catch (e) {}
      emitApiError({ source: "google-maps", message: errorMessage, isQuota });
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) {
      throw new Error("No route found");
    }

    const distanceM = route.distanceMeters || 0;
    const durationS = route.duration ? parseInt(route.duration.replace("s", "")) : 0;

    const result = { distanceM, durationS };
    saveToRoutesCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Maps Routes Error:", error);
    throw error;
  }
};
