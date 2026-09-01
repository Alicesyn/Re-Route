export type PlaceCategory =
  | "museum"
  | "restaurant"
  | "coffee_shop"
  | "park"
  | "landmark"
  | "shopping"
  | "entertainment"
  | "beach"
  | "religious_site"
  | "nightlife"
  | "other";

export interface CategoryDayOverride {
  minPerDay?: number | null;
  maxPerDay?: number | null;
}

export interface CategoryConfig {
  minPerDay?: number | null;
  maxPerDay?: number | null;
  firstDayOverride?: CategoryDayOverride;
  lastDayOverride?: CategoryDayOverride;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  descriptionSource: "user" | "ai" | "mock";
  category: PlaceCategory;
  estimatedDuration: number; // minutes
  dayIndex: number | null; // 0-indexed day
  orderInDay: number | null;
  pinnedToDay: boolean; // true if user manually assigned to a day; optimizer won't move pinned places
  notes?: string;
  openingHours?: string[]; // e.g. ["Monday: 9:00 AM – 5:00 PM", ...]
  unfeasibleReason?: string;
  editorialSummary?: string; // Fallback description from Google Maps
  photoUrl?: string;
}

export interface Hotel {
  dayIndex: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export type TravelMode = "walking" | "transit" | "driving";

export interface RouteSegment {
  distance: number;
  time: number;
  travelMode: TravelMode;
}

export interface DayRoute {
  day: number;
  startHotel: Hotel | null;
  endHotel: Hotel | null;
  stops: Place[];
  segments: RouteSegment[];
  totalDistance: number; // in meters
  totalTime: number; // in seconds (travel only)
  totalVisitTime: number; // in seconds (visit durations)
  manualSequence?: Array<string>; // IDs of stops, hotels, and flights in order
}

export interface OptimizationResult {
  success: boolean;
  days: DayRoute[];
  totalDistance: number;
  totalTime: number;
  unassignedPlaces?: Place[];
}

export interface ItinerarySnapshot {
  id: string;
  title: string;
  days: number;
  startDate?: string;
  endDate?: string;
  dateMode?: "fixed" | "duration";
  dayStartTime?: string;
  dayEndTime?: string;
  showFlights?: boolean;
  arrivalFlight?: {
    time: string;
    buffer: number;
    location: Place | null;
  } | null;
  departureFlight?: {
    time: string;
    buffer: number;
    location: Place | null;
  } | null;
  travelMode: TravelMode;
  dailyBudget?: number;
  strictBudget?: boolean;
  places: Place[];
  hotels: Hotel[];
  missingPlaces?: string[];
  categoryDurations?: Record<PlaceCategory, number>;
  categoryConfigs?: Record<PlaceCategory, CategoryConfig>;
  optimizedRoutes: DayRoute[];
  savedAt: number;
}

export interface TripExportFile {
  version: 1;
  app: "RE-Route";
  exportedAt: string;
  trip: ItinerarySnapshot;
}

