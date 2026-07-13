import { MapsPlace } from "./mapsService";

const EKISPERT_API_KEY = import.meta.env.VITE_EKISPERT_API_KEY;
const EKISPERT_API_ENDPOINT = "https://api.ekispert.jp/v1/json"; // Assuming JSON format

export const fetchEkispertTransitRoute = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<{ distanceM: number; durationS: number } | null> => {
  if (!EKISPERT_API_KEY) {
    console.error("Ekispert API Key is missing");
    return null;
  }

  // Ekispert API requires coordinates in a specific format, typically 'lat,lng'
  // and uses viaList for origin and destination.
  // Note: Ekispert API is GET only, so parameters are in query string.

  const viaList = `${origin.lat},${origin.lng}:${destination.lat},${destination.lng}`;

  try {
    const url = new URL(`${EKISPERT_API_ENDPOINT}/search/course/extreme`);
    url.searchParams.append("key", EKISPERT_API_KEY);
    url.searchParams.append("viaList", viaList);
    // You might need to add other parameters like date/time, searchType etc.
    // based on Ekispert documentation for specific needs.
    // For now, we'll keep it minimal to get a basic route.

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ekispert API request failed: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();

    // Parse Ekispert API response
    // The structure of the response needs to be confirmed from documentation/testing.
    // Assuming a basic structure for now.
    if (data && data.ResultSet && data.ResultSet.Course) {
      const firstCourse = data.ResultSet.Course[0]; // Take the first course
      if (firstCourse && firstCourse.Route && firstCourse.Route.time) {
        // Ekispert API often returns time in minutes or seconds. Need to confirm.
        // Assuming 'time' is in minutes for now for example, convert to seconds.
        const durationMinutes = parseInt(firstCourse.Route.time, 10);
        const durationS = durationMinutes * 60; // Convert to seconds

        // Distance might not be directly available or needs to be calculated from segments.
        // For simplicity, returning a placeholder or 0 if not available.
        const distanceM = 0; // Placeholder

        return { distanceM, durationS };
      }
    }

    console.warn("No route found or unexpected response format from Ekispert API", data);
    return null;
  } catch (error) {
    console.error("Error fetching Ekispert transit route:", error);
    return null;
  }
};