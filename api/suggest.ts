export const config = {
  runtime: "edge",
};

const MODEL = "gemini-flash-lite-latest";

const callGeminiWithRetry = async (apiKey: string, body: any, retries = 2): Promise<Response> => {
  const models = [MODEL, "gemini-3.6-flash", "gemini-2.5-flash-lite"];
  let lastRes: Response | null = null;
  
  for (let i = 0; i <= retries; i++) {
    const currentModel = models[i % models.length];
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) return res;
      lastRes = res;

      // Retry on 503 (High Demand) or 429 (Rate limit)
      if ((res.status === 503 || res.status === 429) && i < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return lastRes!;
};

const parseJsonResponse = <T>(rawText: string): T => {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { lat, lng, rejectedNames = [] } = body;

    if (lat === undefined || lng === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing lat or lng coordinates" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = `
      You are a professional travel planner. I need exactly 6 highly recommended tourist attractions near latitude ${lat}, longitude ${lng}.
      DO NOT recommend any of these places: ${(rejectedNames || []).join(", ") || "None"}.
      
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

    const geminiRes = await callGeminiWithRetry(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    if (!geminiRes.ok) {
      const errorData = await geminiRes.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          error: errorData.error?.message || "Gemini API request failed",
          isQuota: geminiRes.status === 429,
        }),
        {
          status: geminiRes.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await geminiRes.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return new Response(JSON.stringify({ error: "Empty response from Gemini" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsed = parseJsonResponse(rawText);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
