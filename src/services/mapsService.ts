const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
    // If local storage is full, we just don't persist this one
    console.warn("Search cache persistence failed:", e);
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
      throw new Error("Failed to fetch places from Google");
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
