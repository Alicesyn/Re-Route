import { PlaceCategory } from "../types";
import { emitApiError } from "./apiErrorBus";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = "gemini-flash-latest";

export interface AISummary {
  description: string;
  category: PlaceCategory;
  estimatedDuration: number;
}

export const summarizePlace = async (
  name: string,
  address: string,
  types: string[],
  retries = 3,
  signal?: AbortSignal
): Promise<AISummary> => {
  if (!API_KEY) {
    throw new Error("Gemini API Key is missing");
  }

  const prompt = `
    Analyze the following place: "${name}" at "${address}".
    Google Maps types: ${types.join(", ")}.

    Provide 3-7 comma-separated, punchy phrases highlighting the core vibe and what it's famous for (e.g. "Best matcha in Kyoto, quiet atmosphere, historic architecture"). 
    IMPORTANT: Make it sound natural, casual, and straight to the point. NO fluff, NO typical AI marketing speak (avoid words like "bustling", "vibrant", "unforgettable").
    Also, categorize it into one of these: museum, restaurant, coffee_shop, park, landmark, shopping, entertainment, beach, religious_site, nightlife, other.
    Finally, suggest a typical visit duration in minutes.

    Return ONLY a JSON object in this format:
    {
      "description": "string",
      "category": "string",
      "estimatedDuration": number
    }
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
        signal,
      },
    );

    if (!response.ok) {
      let errorMessage = "Failed to call Gemini API";
      let isQuotaExceeded = false;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
        if (errorMessage.includes("Quota exceeded")) {
          isQuotaExceeded = true;
        }
      } catch (e) {}

      if (response.status === 429 && retries > 0 && !isQuotaExceeded) {
        console.warn(`Gemini API rate limit hit. Retrying in 25s...`);
        await new Promise((resolve) => setTimeout(resolve, 25000));
        return summarizePlace(name, address, types, retries - 1, signal);
      }
      emitApiError({ source: "gemini", message: errorMessage, isQuota: isQuotaExceeded || response.status === 429 });
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("Empty response from Gemini");

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const summarizePlacesBatch = async (
  places: { id: string; name: string; address: string; types: string[] }[],
  retries = 3,
  signal?: AbortSignal
): Promise<(AISummary & { id: string })[]> => {
  if (!API_KEY) {
    throw new Error("Gemini API Key is missing");
  }

  const prompt = `
    Analyze the following list of places. For each place, provide 3-7 comma-separated, punchy phrases highlighting the core vibe and what it's famous for. 
    IMPORTANT: Make it sound natural, casual, and straight to the point. NO fluff, NO typical AI marketing speak (avoid words like "bustling", "vibrant", "unforgettable").
    Also, categorize each into one of these: museum, restaurant, coffee_shop, park, landmark, shopping, entertainment, beach, religious_site, nightlife, other.
    Finally, suggest a typical visit duration in minutes.

    Places:
    ${places.map(p => `ID: "${p.id}", Name: "${p.name}", Address: "${p.address}", Types: ${p.types.join(", ")}`).join("\n\n")}

    Return ONLY a JSON array of objects, with each object in this exact format:
    [
      {
        "id": "Exact ID provided above",
        "description": "string",
        "category": "string",
        "estimatedDuration": number
      }
    ]
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
        signal,
      },
    );

    if (!response.ok) {
      let errorMessage = "Failed to call Gemini API";
      let isQuotaExceeded = false;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
        if (errorMessage.includes("Quota exceeded")) {
          isQuotaExceeded = true;
        }
      } catch (e) {}

      if (response.status === 429 && retries > 0 && !isQuotaExceeded) {
        console.warn(`Gemini API rate limit hit in batch. Retrying in 25s...`);
        await new Promise((resolve) => setTimeout(resolve, 25000));
        return summarizePlacesBatch(places, retries - 1, signal);
      }
      emitApiError({ source: "gemini", message: errorMessage, isQuota: isQuotaExceeded || response.status === 429 });
      throw new Error(errorMessage);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("Empty response from Gemini");

    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error in batch:", error);
    throw error;
  }
};

export const suggestSights = async (
  lat: number,
  lng: number,
  rejectedNames: string[],
  retries = 3
): Promise<{ name: string; description: string; category: PlaceCategory; lat: number; lng: number; estimatedDuration: number }[]> => {
  if (!API_KEY) {
    throw new Error("Gemini API Key is missing");
  }

  const prompt = `
    You are a professional travel planner. I need exactly 6 highly recommended tourist attractions near latitude ${lat}, longitude ${lng}.
    DO NOT recommend any of these places: ${rejectedNames.join(", ") || "None"}.
    
    Return ONLY a JSON array of objects with this exact structure:
    [
      {
        "name": "Exact Place Name",
        "description": "Short punchy description highlighting vibe and what it is famous for.",
        "category": "museum" | "restaurant" | "coffee_shop" | "park" | "landmark" | "shopping" | "entertainment" | "beach" | "religious_site" | "nightlife" | "other",
        "lat": number,
        "lng": number,
        "estimatedDuration": number (in minutes)
      }
    ]
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      let errorMessage = "Failed to fetch suggestions from Gemini API";
      let isQuotaExceeded = false;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
        if (errorMessage.includes("Quota exceeded")) {
          isQuotaExceeded = true;
        }
      } catch (e) {}

      if (response.status === 429 && retries > 0 && !isQuotaExceeded) {
        console.warn(`Gemini API rate limit hit in suggest. Retrying in 25s...`);
        await new Promise((resolve) => setTimeout(resolve, 25000));
        return suggestSights(lat, lng, rejectedNames, retries - 1);
      }
      emitApiError({ source: "gemini", message: errorMessage, isQuota: isQuotaExceeded || response.status === 429 });
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const jsonStr = data.candidates[0].content.parts[0].text;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
};
