import { PlaceCategory } from "../types";
import { emitApiError } from "./apiErrorBus";
import { apiUsageService } from "./apiUsageService";

const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.6-flash",
];

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export interface AISummary {
  description: string;
  category: PlaceCategory;
  estimatedDuration: number;
}

const parseJsonResponse = <T>(rawText: string): T => {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
};

const callGeminiDirectWithFallback = async (
  apiKey: string,
  payload: any,
  signal?: AbortSignal
): Promise<any> => {
  let lastError: Error | null = null;

  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const model = FALLBACK_MODELS[i];
    try {
      apiUsageService.recordCall("gemini");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal,
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty response from Gemini");
        return parseJsonResponse(text);
      }

      let errorMessage = `Failed with status ${response.status}`;
      let isQuota = response.status === 429;
      try {
        const errJson = await response.json();
        errorMessage = errJson.error?.message || errorMessage;
        if (errorMessage.includes("Quota exceeded")) isQuota = true;
      } catch (e) {}

      // If 503 (high demand) or 429 (rate limit) and we have more models, try the next model immediately
      if ((response.status === 503 || response.status === 429) && i < FALLBACK_MODELS.length - 1) {
        console.warn(`[Gemini] Model ${model} returned ${response.status}. Trying fallback model ${FALLBACK_MODELS[i + 1]}...`);
        continue;
      }

      lastError = new Error(errorMessage);
      emitApiError({ source: "gemini", message: errorMessage, isQuota });
      throw lastError;
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      lastError = err;
      if (i < FALLBACK_MODELS.length - 1) {
        continue;
      }
    }
  }

  throw lastError || new Error("All Gemini model attempts failed");
};

export const summarizePlace = async (
  name: string,
  address: string,
  types: string[],
  _retries = 3,
  signal?: AbortSignal
): Promise<AISummary> => {
  const customKey = apiUsageService.getCustomGeminiKey();
  const activeKey = apiUsageService.getActiveGeminiKey();

  // 1. If no custom key and not on localhost, try secure serverless proxy first
  if (!customKey && !isLocalhost) {
    try {
      apiUsageService.recordCall("gemini");
      const proxyRes = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place: { name, address, types } }),
        signal,
      });

      if (proxyRes.ok) {
        return await proxyRes.json();
      }

      if (proxyRes.status !== 404 && proxyRes.status !== 500) {
        const errData = await proxyRes.json().catch(() => ({}));
        const msg = errData.error || "Failed to summarize place";
        emitApiError({ source: "gemini", message: msg, isQuota: proxyRes.status === 429 });
        throw new Error(msg);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      if (!activeKey) {
        throw err;
      }
    }
  }

  // 2. Direct client fallback / Custom BYOK Key execution
  if (!activeKey) {
    throw new Error("Gemini API is not configured. Please add an API key in API Budget / BYOK.");
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

  return await callGeminiDirectWithFallback(
    activeKey,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    },
    signal
  );
};

export const summarizePlacesBatch = async (
  places: { id: string; name: string; address: string; types: string[] }[],
  _retries = 3,
  signal?: AbortSignal
): Promise<(AISummary & { id: string })[]> => {
  const customKey = apiUsageService.getCustomGeminiKey();
  const activeKey = apiUsageService.getActiveGeminiKey();

  // 1. If no custom key and not on localhost, try secure serverless proxy first
  if (!customKey && !isLocalhost) {
    try {
      apiUsageService.recordCall("gemini");
      const proxyRes = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ places }),
        signal,
      });

      if (proxyRes.ok) {
        return await proxyRes.json();
      }

      if (proxyRes.status !== 404 && proxyRes.status !== 500) {
        const errData = await proxyRes.json().catch(() => ({}));
        const msg = errData.error || "Failed to batch summarize places";
        emitApiError({ source: "gemini", message: msg, isQuota: proxyRes.status === 429 });
        throw new Error(msg);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      if (!activeKey) {
        throw err;
      }
    }
  }

  // 2. Direct client fallback / Custom BYOK Key execution
  if (!activeKey) {
    throw new Error("Gemini API is not configured. Please add an API key in API Budget / BYOK.");
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

  return await callGeminiDirectWithFallback(
    activeKey,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    },
    signal
  );
};

export const suggestSights = async (
  lat: number,
  lng: number,
  rejectedNames: string[],
  _retries = 3
): Promise<{ name: string; description: string; category: PlaceCategory; lat: number; lng: number; estimatedDuration: number }[]> => {
  const customKey = apiUsageService.getCustomGeminiKey();
  const activeKey = apiUsageService.getActiveGeminiKey();

  // 1. If no custom key and not on localhost, try secure serverless proxy first
  if (!customKey && !isLocalhost) {
    try {
      apiUsageService.recordCall("gemini");
      const proxyRes = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, rejectedNames }),
      });

      if (proxyRes.ok) {
        return await proxyRes.json();
      }

      if (proxyRes.status !== 404 && proxyRes.status !== 500) {
        const errData = await proxyRes.json().catch(() => ({}));
        const msg = errData.error || "Failed to fetch suggestions";
        emitApiError({ source: "gemini", message: msg, isQuota: proxyRes.status === 429 });
        throw new Error(msg);
      }
    } catch (err: any) {
      if (!activeKey) {
        console.warn("Serverless suggest failed and no client key available:", err);
        return [];
      }
    }
  }

  // 2. Direct client fallback / Custom BYOK Key execution
  if (!activeKey) {
    return [];
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
    return await callGeminiDirectWithFallback(
      activeKey,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }
    );
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
};
