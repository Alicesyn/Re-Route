import { PlaceCategory, ReservationInfo } from "../types";

interface PlaceLike {
  name: string;
  category?: PlaceCategory | string;
  address?: string;
}

export function getSpecificMockHighlight(place: PlaceLike): { label: string; text: string } {
  const nameLower = (place.name || "").toLowerCase();
  const cat = (place.category || "").toLowerCase();

  // 1. Famous landmarks & specific venues
  if (nameLower.includes("central park")) {
    return { label: "Best Spot", text: "Bow Bridge & Bethesda Terrace in morning light" };
  }
  if (nameLower.includes("times square")) {
    return { label: "Best Vantage", text: "Red TKTS bleacher steps for 360-degree illuminated billboard views" };
  }
  if (nameLower.includes("empire state")) {
    return { label: "Best Photo Spot", text: "86th floor open-air observation deck facing south toward Lower Manhattan" };
  }
  if (nameLower.includes("statue of liberty")) {
    return { label: "Pro Tip", text: "Reserve pedestal access in advance; catch the 8:30 AM first ferry from Battery Park" };
  }
  if (nameLower.includes("metropolitan museum") || nameLower.includes("the met")) {
    return { label: "Must-See", text: "The Temple of Dendur in Sackler Wing and European Paintings gallery" };
  }
  if (nameLower.includes("brooklyn bridge")) {
    return { label: "Best Walk", text: "Manhattan-bound pedestrian walkway at golden hour starting from DUMBO" };
  }
  if (nameLower.includes("high line")) {
    return { label: "Best Section", text: "Chelsea Thicket and 10th Avenue Square sunken glass overlook" };
  }
  if (nameLower.includes("senso-ji") || nameLower.includes("sensō-ji") || nameLower.includes("浅草寺")) {
    return { label: "Must-Try", text: "Fresh jumbo melonpan from Kagetsudo and warm age-manju from Nakamise-dori stall #14" };
  }
  if (nameLower.includes("skytree")) {
    return { label: "Best Photo Spot", text: "Tembo Deck glass floor section at 350m looking straight down" };
  }
  if (nameLower.includes("shibuya sky") || (nameLower.includes("shibuya") && cat === "landmark")) {
    return { label: "Best Vantage", text: "Sky Edge rooftop corner overlooking the scramble crossing at dusk" };
  }
  if (nameLower.includes("tsukiji") || nameLower.includes("toyosu")) {
    return { label: "Must-Try", text: "Freshly made dashi tamagoyaki from Yamacho stall and grilled scallop skewers" };
  }
  if (nameLower.includes("fushimi inari")) {
    return { label: "Scenic Spot", text: "Senbon Torii path just past Okusha shrine where crowds thin out" };
  }

  // 2. Shopping / Markets / Malls
  if (cat === "shopping" || nameLower.includes("market") || nameLower.includes("mall") || nameLower.includes("plaza")) {
    if (nameLower.includes("market") || nameLower.includes("bazaar") || nameLower.includes("street")) {
      return {
        label: "Where to Go",
        text: "Artisan food stall #24 for freshly grilled regional skewers and local snacks"
      };
    }
    if (nameLower.includes("mall") || nameLower.includes("parco") || nameLower.includes("depato") || nameLower.includes("department")) {
      return {
        label: "Where to Go",
        text: "Basement B1 Depachika food hall for fresh seasonal pastries and 3rd floor specialty boutiques"
      };
    }
    return {
      label: "What to Buy",
      text: "Flagship designer section on the 2nd floor and limited-run artisan goods"
    };
  }

  // 3. Restaurants / Food & Drink
  if (cat === "restaurant") {
    if (nameLower.includes("ramen") || nameLower.includes("noodle") || nameLower.includes("soba") || nameLower.includes("udon")) {
      return {
        label: "Must-Try",
        text: "Special Tonkotsu Tsukemen with rich pork-seafood broth and seasoned soft-boiled ajitama"
      };
    }
    if (nameLower.includes("sushi") || nameLower.includes("sashimi") || nameLower.includes("fish") || nameLower.includes("seafood")) {
      return {
        label: "Must-Try",
        text: "Chef's 8-piece omakase nigiri set featuring seared fatty otoro & Hokkaido sea urchin"
      };
    }
    if (nameLower.includes("wagyu") || nameLower.includes("steak") || nameLower.includes("beef") || nameLower.includes("bbq") || nameLower.includes("yakiniku")) {
      return {
        label: "Must-Try",
        text: "A5 Miyazaki Wagyu sirloin set with fresh grated wasabi and house garlic tare"
      };
    }
    if (nameLower.includes("pizza") || nameLower.includes("pasta") || nameLower.includes("trattoria") || nameLower.includes("italian")) {
      return {
        label: "Must-Try",
        text: "Wood-fired Margherita D.O.P. with buffalo mozzarella, san marzano tomatoes & fresh basil"
      };
    }
    if (nameLower.includes("burger") || nameLower.includes("diner")) {
      return {
        label: "Must-Try",
        text: "Double smash patty burger with caramelized onions and house truffle remoulade"
      };
    }
    if (nameLower.includes("curry")) {
      return {
        label: "Must-Try",
        text: "Crispy kurobuta pork katsu curry with slow-simmered spiced onion roux"
      };
    }
    return {
      label: "Must-Try",
      text: "Chef's signature seasonal tasting dish and house specialty entrée"
    };
  }

  // 4. Cafes / Bakeries
  if (cat === "coffee_shop") {
    if (nameLower.includes("tea") || nameLower.includes("matcha")) {
      return {
        label: "Must-Order",
        text: "Ceremonial grade Uji Matcha Latte with house-made warabimochi"
      };
    }
    return {
      label: "Must-Order",
      text: "Single-origin pour-over brew and freshly baked pistachio cardamom croissant"
    };
  }

  // 5. Bars / Nightlife
  if (cat === "nightlife") {
    return {
      label: "Must-Order",
      text: "House smoked old fashioned infused with Japanese cedar and seasonal bitters"
    };
  }

  // 6. Landmarks & Museums
  if (cat === "landmark" || cat === "museum") {
    return {
      label: "Best Photo Spot",
      text: "Upper terrace balcony overlooking the grand architectural facade and skyline"
    };
  }

  // 7. Parks & Beaches
  if (cat === "park" || cat === "beach") {
    return {
      label: "Best Time to Visit",
      text: "Early morning before 9:00 AM or golden hour right before sunset"
    };
  }

  // 8. Religious sites
  if (cat === "religious_site") {
    return {
      label: "Visitor Tip",
      text: "Stroll past the crowded main hall to the quiet back moss garden and stone pagoda"
    };
  }

  return {
    label: "Pro Tip",
    text: "Visit during shoulder hours to avoid peak queues and get prime seating"
  };
}

export function getSpecificMockPrice(place: PlaceLike): string {
  const cat = (place.category || "").toLowerCase();
  switch (cat) {
    case "restaurant":
      return "$15 - $30";
    case "coffee_shop":
      return "$5 - $10";
    case "shopping":
      return "$20 - $80";
    case "museum":
      return "$12 - $25";
    case "entertainment":
      return "$20 - $45";
    case "nightlife":
      return "$15 - $35";
    case "park":
    case "beach":
    case "religious_site":
    case "landmark":
      return "Free";
    default:
      return "Free";
  }
}

export function getSpecificMockDescription(place: PlaceLike): string {
  const cat = (place.category || "").toLowerCase();
  const name = place.name || "This location";
  if (cat === "restaurant") {
    return `${name} is an iconic culinary stop known for hearty portions, seasonal local ingredients, and vibrant casual dining.`;
  }
  if (cat === "coffee_shop") {
    return `${name} is a cozy artisan coffee outpost featuring precision-extracted brews, flaky morning pastries, and relaxed neighborhood seating.`;
  }
  if (cat === "shopping") {
    return `${name} is a lively retail hub featuring curated boutiques, regional specialties, and energetic vendor stalls.`;
  }
  if (cat === "museum") {
    return `${name} is a world-class cultural institution showcasing expansive historic collections and interactive rotating exhibits.`;
  }
  if (cat === "landmark") {
    return `${name} is an iconic architectural destination and city centerpiece with sweeping panoramic views.`;
  }
  if (cat === "park") {
    return `${name} is a scenic green haven with shaded winding paths, lush tree canopies, and peaceful open lawns.`;
  }
  return `${name} is a popular local spot celebrated for its unique atmosphere, friendly vibes, and memorable character.`;
}

export function getSpecificMockReservation(place: PlaceLike): ReservationInfo {
  const nameLower = (place.name || "").toLowerCase();
  const cat = (place.category || "").toLowerCase();

  // 1. Specific iconic venues
  if (nameLower.includes("statue of liberty")) {
    return {
      requirement: "required",
      advanceTime: "Reserve 1-3 months in advance for pedestal or crown access",
      notes: "Tickets through official National Park concessionaire (City Experiences)",
    };
  }
  if (nameLower.includes("empire state")) {
    return {
      requirement: "recommended",
      advanceTime: "Book 1-2 days ahead for sunset observation time slots",
      notes: "Skip-the-line express tickets available online",
    };
  }
  if (nameLower.includes("metropolitan museum") || nameLower.includes("the met")) {
    return {
      requirement: "recommended",
      advanceTime: "Book timed entry ticket online in advance to skip main ticket lines",
    };
  }
  if (nameLower.includes("ghibli")) {
    return {
      requirement: "required",
      advanceTime: "Reserve 1 month in advance (10th of prior month at 10 AM JST)",
      notes: "Strict timed entry via Lawson ticket lottery / official portal",
    };
  }
  if (nameLower.includes("teamlab")) {
    return {
      requirement: "required",
      advanceTime: "Book 2-3 weeks ahead for preferred morning or afternoon slots",
      notes: "Tickets sell out quickly on weekends and holidays",
    };
  }
  if (nameLower.includes("shibuya sky")) {
    return {
      requirement: "recommended",
      advanceTime: "Book sunset slot 4 weeks in advance online (cheaper than door)",
    };
  }
  if (nameLower.includes("skytree")) {
    return {
      requirement: "recommended",
      advanceTime: "Book timed web ticket 1-3 days prior for fast-track elevator queue",
    };
  }
  if (
    nameLower.includes("central park") ||
    nameLower.includes("high line") ||
    nameLower.includes("brooklyn bridge") ||
    nameLower.includes("times square")
  ) {
    return {
      requirement: "not_needed",
      advanceTime: "No reservation needed (open public access)",
    };
  }
  if (nameLower.includes("senso-ji") || nameLower.includes("fushimi inari")) {
    return {
      requirement: "not_needed",
      advanceTime: "No reservation needed (open grounds)",
    };
  }
  if (nameLower.includes("tsukiji") || nameLower.includes("toyosu")) {
    return {
      requirement: "walk_ins_only",
      advanceTime: "Walk-ins only; arrive before 8:30 AM for top seafood stalls",
    };
  }

  // 2. Category-based rules
  if (cat === "restaurant") {
    if (
      nameLower.includes("omakase") ||
      nameLower.includes("sukiyaki") ||
      nameLower.includes("kaiseki") ||
      nameLower.includes("wagyu") ||
      nameLower.includes("michelin") ||
      nameLower.includes("steakhouse")
    ) {
      return {
        requirement: "required",
        advanceTime: "Reserve 2-4 weeks in advance via TableCheck or official site",
        notes: "Strict cancellation policy within 48h",
      };
    }
    if (
      nameLower.includes("ramen") ||
      nameLower.includes("noodle") ||
      nameLower.includes("udon") ||
      nameLower.includes("soba") ||
      nameLower.includes("burger") ||
      nameLower.includes("diner") ||
      nameLower.includes("fast")
    ) {
      return {
        requirement: "walk_ins_only",
        advanceTime: "Walk-ins only via ticket machine; expect 15-30m queue at peak hours",
      };
    }
    return {
      requirement: "recommended",
      advanceTime: "Reserve 3-7 days in advance for dinner & weekend slots",
    };
  }

  if (cat === "coffee_shop") {
    return {
      requirement: "not_needed",
      advanceTime: "Walk-in seating; arrive early on weekend afternoons",
    };
  }

  if (cat === "museum") {
    return {
      requirement: "recommended",
      advanceTime: "Reserve timed entry ticket 1-2 weeks in advance for weekends",
    };
  }

  if (cat === "landmark") {
    return {
      requirement: "recommended",
      advanceTime: "Book timed web ticket 2-5 days ahead for peak time slots",
    };
  }

  if (cat === "entertainment" || cat === "nightlife") {
    return {
      requirement: "recommended",
      advanceTime: "Advance reservation recommended for Friday & Saturday nights",
    };
  }

  return {
    requirement: "not_needed",
    advanceTime: "No reservation needed",
  };
}
