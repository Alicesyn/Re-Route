import fs from "fs";
import path from "path";

// Manually parse .env
const envPath = path.resolve(process.cwd(), ".env");
let API_KEY = "";
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf-8");
  const match = envFile.match(/VITE_GEMINI_API_KEY=(.*)/);
  if (match) {
    API_KEY = match[1].trim();
  }
}

if (!API_KEY) {
  API_KEY = process.env.VITE_GEMINI_API_KEY;
}

if (!API_KEY) {
  console.error("❌ ERROR: VITE_GEMINI_API_KEY is not set in your .env.local file.");
  process.exit(1);
}

const MODEL = "gemini-1.5-flash";

async function testPrompt(name, address, types) {
  console.log(`\n========================================`);
  console.log(`📍 Testing: ${name} (${address})`);
  console.log(`========================================`);

  // This is the exact prompt from your aiService.ts
  const prompt = `
    Analyze the following place: "${name}" at "${address}".
    Google Maps types: ${types.join(", ")}.

    Provide a concise 1-2 sentence description. 
    IMPORTANT: Focus on the "vibe" and what people say about it (reputation/atmosphere) rather than just dry facts.
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
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to call Gemini API");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("Empty response from Gemini");

    const result = JSON.parse(text);
    
    console.log(`📝 Description: ${result.description}`);
    console.log(`🏷️  Category: ${result.category}`);
    console.log(`⏱️  Duration: ${result.estimatedDuration} mins\n`);
    
  } catch (error) {
    console.error("❌ Error testing prompt:", error);
  }
}

async function runTests() {
  console.log("🚀 Starting AI Description Quality Tests...\n");

  // Test 1: A specific food/drink spot (Should mention quality/reputation)
  await testPrompt(
    "Maccha House",
    "Kawaramachi, Kyoto, Japan",
    ["cafe", "food", "point_of_interest"]
  );

  // Test 2: A generic sounding park (Should give vibe instead of just "it's a park")
  await testPrompt(
    "Shinjuku Gyoen National Garden",
    "Shinjuku City, Tokyo, Japan",
    ["park", "tourist_attraction"]
  );

  // Test 3: A nightlife spot (Should capture the atmosphere)
  await testPrompt(
    "Bar BenFiddich",
    "Shinjuku City, Tokyo, Japan",
    ["bar", "nightlife"]
  );
}

runTests();
