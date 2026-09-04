export const config = {
  runtime: "edge",
};

const MODEL = "gemini-3.5-flash-lite";

const callGeminiWithRetry = async (apiKey: string, body: any, retries = 2): Promise<Response> => {
  const models = [MODEL, "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.6-flash"];
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
    const { place, places } = body;

    let prompt = "";
    if (places && Array.isArray(places)) {
      prompt = `
        Analyze the following list of places. For each place, provide 3-7 comma-separated, punchy phrases highlighting the core vibe and what it's famous for. 
        IMPORTANT: Make it sound natural, casual, and straight to the point. NO fluff, NO typical AI marketing speak (avoid words like "bustling", "vibrant", "unforgettable").
        Also, categorize each into one of these: museum, restaurant, coffee_shop, park, landmark, shopping, entertainment, beach, religious_site, nightlife, other.
        Suggest a typical visit duration in minutes.
        If the place name contains foreign or non-Latin scripts (Japanese Kanji/Kana, Chinese Hanzi, Thai, Korean Hangul, etc.), provide its clean English/romanized transliteration in "romanizedName" (e.g. "Senso-ji" for "浅草寺", "Wat Phra Kaew" for "วัดพระแก้ว"). If already English/Latin, return null.

        Also provide a specific, high-value highlight in "highlight" object with "label" and "text":
        - For restaurant: label="Must-Try", text=<signature dish, must-eat item, or specialty food/drink>
        - For coffee_shop: label="Must-Order", text=<signature brew, specialty drink, or pastry>
        - For landmark/museum: label="Best Photo Spot" or "Must-See", text=<best vantage point, specific room, or view angle>
        - For park/beach: label="Best Time to Visit" or "Scenic Spot", text=<ideal time of day, sunset spot, or quiet corner>
        - For religious_site: label="Visitor Tip" or "Etiquette", text=<dress code, quiet garden, or inner shrine tip>
        - For shopping: label="What to Buy" or "Bargaining Tip", text=<specialty item, unique souvenir, or floor to visit>
        - For nightlife/entertainment: label="Best Time to Go" or "Highlight", text=<peak hours, reservation advice, or top experience>
        - For other: label="Pro Tip" or "Advice", text=<actionable insider advice>
        Keep the highlight text concise (1-2 sentences), punchy, and highly practical.

        Places:
        ${places
          .map(
            (p: any) =>
              `ID: "${p.id}", Name: "${p.name}", Address: "${p.address}", Types: ${(p.types || []).join(", ")}`
          )
          .join("\n\n")}

        Return ONLY a JSON array of objects, with each object in this exact format:
        [
          {
            "id": "Exact ID provided above",
            "description": "string",
            "category": "string",
            "estimatedDuration": number,
            "romanizedName": "string or null",
            "highlight": {
              "label": "string",
              "text": "string"
            }
          }
        ]
      `;
    } else if (place) {
      prompt = `
        Analyze the following place: "${place.name}" at "${place.address}".
        Google Maps types: ${(place.types || []).join(", ")}.

        Provide 3-7 comma-separated, punchy phrases highlighting the core vibe and what it's famous for (e.g. "Best matcha in Kyoto, quiet atmosphere, historic architecture"). 
        IMPORTANT: Make it sound natural, casual, and straight to the point. NO fluff, NO typical AI marketing speak (avoid words like "bustling", "vibrant", "unforgettable").
        Also, categorize it into one of these: museum, restaurant, coffee_shop, park, landmark, shopping, entertainment, beach, religious_site, nightlife, other.
        Suggest a typical visit duration in minutes.
        If the place name contains foreign or non-Latin scripts (Japanese Kanji/Kana, Chinese Hanzi, Thai, Korean Hangul, etc.), provide its clean English/romanized transliteration in "romanizedName" (e.g. "Senso-ji" for "浅草寺", "Wat Phra Kaew" for "วัดพระแก้ว"). If already English/Latin, return null.

        Also provide a specific, high-value highlight in "highlight" object with "label" and "text":
        - For restaurant: label="Must-Try", text=<signature dish, must-eat item, or specialty food/drink>
        - For coffee_shop: label="Must-Order", text=<signature brew, specialty drink, or pastry>
        - For landmark/museum: label="Best Photo Spot" or "Must-See", text=<best vantage point, specific room, or view angle>
        - For park/beach: label="Best Time to Visit" or "Scenic Spot", text=<ideal time of day, sunset spot, or quiet corner>
        - For religious_site: label="Visitor Tip" or "Etiquette", text=<dress code, quiet garden, or inner shrine tip>
        - For shopping: label="What to Buy" or "Bargaining Tip", text=<specialty item, unique souvenir, or floor to visit>
        - For nightlife/entertainment: label="Best Time to Go" or "Highlight", text=<peak hours, reservation advice, or top experience>
        - For other: label="Pro Tip" or "Advice", text=<actionable insider advice>
        Keep the highlight text concise (1-2 sentences), punchy, and highly practical.

        Return ONLY a JSON object in this format:
        {
          "description": "string",
          "category": "string",
          "estimatedDuration": number,
          "romanizedName": "string or null",
          "highlight": {
            "label": "string",
            "text": "string"
          }
        }
      `;
    } else {
      return new Response(
        JSON.stringify({ error: "Missing place or places payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

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
