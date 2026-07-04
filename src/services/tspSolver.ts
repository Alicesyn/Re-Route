import {
  Place,
  Hotel,
  DayRoute,
  TravelMode,
  OptimizationResult,
  CategoryConfig,
  PlaceCategory,
} from "../types";
import { getDistance, estimateTime } from "../utils/distance";


// Time-budget-aware clustering
// Distributes places across days so no single day exceeds the budget
// Respects pinnedToDay: pinned places stay on their assigned day
function clusterPlaces(
  places: Place[],
  hotels: Hotel[],
  days: number,
  travelMode: TravelMode,
  dailyBudgets: number[],
  strictBudget: boolean = false,
  arrivalLocation?: Place | null,
  departureLocation?: Place | null,
  categoryConfigs?: Partial<Record<PlaceCategory, CategoryConfig>>,
): Place[] {
  const pinned = places.filter((p) => p.dayIndex !== null && p.pinnedToDay);
  const unassigned = places.filter(
    (p) => p.dayIndex === null || (p.dayIndex !== null && !p.pinnedToDay),
  );

  if (unassigned.length === 0) return places;

  // Calculate already-committed time per day from pinned places
  const dayTimeUsed: number[] = Array(days).fill(0);
  for (const p of pinned) {
    if (p.dayIndex !== null) {
      dayTimeUsed[p.dayIndex] += p.estimatedDuration ?? 60;
    }
  }

  // Add estimated travel time for pinned places (rough: avg travel between pinned stops + to/from hotel)
  for (let d = 0; d < days; d++) {
    const dayPinned = pinned.filter((p) => p.dayIndex === d);
    const hotel = hotels.find((h) => h.dayIndex === d);
    if (dayPinned.length > 0 && hotel) {
      // Rough: add avg travel from hotel to first place and back
      const avgDist =
        dayPinned.reduce(
          (sum, p) => sum + getDistance(hotel.lat, hotel.lng, p.lat, p.lng),
          0,
        ) / dayPinned.length;
      dayTimeUsed[d] += estimateTime(avgDist * 2, travelMode) / 60; // convert seconds to minutes
    }
  }

  const validAnchors = [...hotels];
  if (arrivalLocation) validAnchors.push({ ...arrivalLocation, dayIndex: 0 } as any);
  if (departureLocation) validAnchors.push({ ...departureLocation, dayIndex: days - 1 } as any);

  // Filter out 500km unfeasible ones
  const toAssign: Place[] = [];
  const rejectedUnassigned: Place[] = [];

  for (const p of unassigned) {
    if (validAnchors.length > 0) {
      let minDist = Infinity;
      for (const anchor of validAnchors) {
        const d = getDistance(p.lat, p.lng, anchor.lat, anchor.lng);
        if (d < minDist) minDist = d;
      }
      if (minDist > 500 * 1000) { // 500 km in meters
        rejectedUnassigned.push({
          ...p,
          dayIndex: null,
          orderInDay: null,
          unfeasibleReason: "Over 500km from any hotel or flight.",
        });
        continue;
      }
    }
    
    // Clear out old unfeasible reasons since it passed the distance check
    toAssign.push({
      ...p,
      dayIndex: null,
      orderInDay: null,
      unfeasibleReason: undefined,
    });
  }

  // Sort by longest duration first (greedy: schedule big items first for better packing)
  toAssign.sort(
    (a, b) => (b.estimatedDuration ?? 60) - (a.estimatedDuration ?? 60),
  );

  // Initialize category counts per day (using pinned places)
  const categoryCounts: Record<number, Record<string, number>> = {};
  for (let d = 0; d < days; d++) categoryCounts[d] = {};
  for (const p of pinned) {
    if (p.dayIndex !== null) {
      categoryCounts[p.dayIndex][p.category] = (categoryCounts[p.dayIndex][p.category] || 0) + 1;
    }
  }

  // Greedy assignment: put each place on the day with the most remaining budget
  for (const place of toAssign) {
    let bestDay = -1;
    let maxScore = -Infinity;

    for (let d = 0; d < days; d++) {
      // Resolve effective category config — merge day-specific overrides for first/last day
      const isFirstDay = d === 0;
      const isLastDay = d === days - 1;
      const baseCatConfig = categoryConfigs?.[place.category];
      const dayOverride = isFirstDay
        ? baseCatConfig?.firstDayOverride
        : isLastDay
          ? baseCatConfig?.lastDayOverride
          : undefined;
      const catConfig = dayOverride
        ? { ...baseCatConfig, ...dayOverride }
        : baseCatConfig;

      // 1. Check max limit constraint
      const currentCount = categoryCounts[d]?.[place.category] || 0;
      if (catConfig && catConfig.maxPerDay !== undefined && catConfig.maxPerDay !== null) {
        if (currentCount >= catConfig.maxPerDay) {
          continue; // Skip this day, it's at max capacity for this category
        }
      }

      // Estimate travel time to this place from the day's hotel
      const hotel = hotels.find((h) => h.dayIndex === d);
      let travelMin = 0;
      if (hotel) {
        const dist = getDistance(place.lat, place.lng, hotel.lat, hotel.lng);
        travelMin = estimateTime(dist, travelMode) / 60; // seconds to minutes
      }

      const totalIfAdded =
        dayTimeUsed[d] + (place.estimatedDuration ?? 60) + travelMin;
      const remaining = dailyBudgets[d] - totalIfAdded;

      // Force strict if this day has a reduced budget (e.g. due to a flight cutoff)
      const baseBudget = dailyBudgets.length > 0 ? Math.max(...dailyBudgets) : dailyBudgets[d];
      const dayIsConstrained = dailyBudgets[d] < baseBudget;
      const forceStrict = strictBudget || dayIsConstrained;

      if (!forceStrict || remaining >= 0) {
        let score = remaining;

        // Apply min limit boost if this day is below the minimum
        if (catConfig && catConfig.minPerDay !== undefined && catConfig.minPerDay !== null) {
          if (currentCount < catConfig.minPerDay) {
            score += 10000; // Massive artificial boost to prioritize filling the minimum
          }
        }

        if (score > maxScore) {
          maxScore = score;
          bestDay = d;
        }
      }
    }

    if (bestDay !== -1) {
      place.dayIndex = bestDay;

      // Update time used
      const hotel = hotels.find((h) => h.dayIndex === bestDay);
      let travelMin = 0;
      if (hotel) {
        const dist = getDistance(place.lat, place.lng, hotel.lat, hotel.lng);
        travelMin = estimateTime(dist, travelMode) / 60;
      }
      dayTimeUsed[bestDay] += (place.estimatedDuration ?? 60) + travelMin;
      
      // Update category counts
      if (!categoryCounts[bestDay]) categoryCounts[bestDay] = {};
      categoryCounts[bestDay][place.category] = (categoryCounts[bestDay][place.category] || 0) + 1;
    } else {
      place.dayIndex = null;
      place.unfeasibleReason = "Exceeds daily time budget or category limits.";
      rejectedUnassigned.push(place);
    }
  }

  const successfullyAssigned = toAssign.filter(p => p.dayIndex !== null);

  return [...pinned, ...successfullyAssigned, ...rejectedUnassigned];
}

// 2-Opt Algorithm for a single day's route (Start -> Stops -> End)
function optimizeDayRoute(
  startHotel: Hotel | null,
  endHotel: Hotel | null,
  dayPlaces: Place[],
): Place[] {
  if (dayPlaces.length <= 1) return dayPlaces;

  const points: (Hotel | Place)[] = [];
  if (startHotel) points.push(startHotel);
  points.push(...dayPlaces);
  if (endHotel) points.push(endHotel);

  // Define the range of indices that are swappable (only the places, not hotels)
  const swapStart = startHotel ? 1 : 0;
  const swapEnd = endHotel ? points.length - 2 : points.length - 1;

  let bestDistance = calculateTotalDistance(points);
  let improved = true;

  // 2-Opt main loop — only swap within the place indices, never touch hotel anchors
  while (improved) {
    improved = false;
    for (let i = swapStart; i <= swapEnd; i++) {
      for (let j = i + 1; j <= swapEnd; j++) {
        const newPoints = swap2Opt(points, i, j);
        const newDistance = calculateTotalDistance(newPoints);

        if (newDistance < bestDistance) {
          for (let k = 0; k < points.length; k++) {
            points[k] = newPoints[k];
          }
          bestDistance = newDistance;
          improved = true;
        }
      }
    }
  }

  // Extract places back from points (hotels are at fixed positions)
  const placeStart = startHotel ? 1 : 0;
  const placeEnd = endHotel ? points.length - 1 : points.length;
  const optimizedPlaces = points.slice(placeStart, placeEnd) as Place[];

  return optimizedPlaces.map((p, idx) => ({ ...p, orderInDay: idx }));
}

function swap2Opt(route: any[], i: number, k: number): any[] {
  return [
    ...route.slice(0, i),
    ...route.slice(i, k + 1).reverse(),
    ...route.slice(k + 1),
  ];
}

function calculateTotalDistance(
  points: { lat: number; lng: number }[],
): number {
  let dist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    dist += getDistance(
      points[i].lat,
      points[i].lng,
      points[i + 1].lat,
      points[i + 1].lng,
    );
  }
  return dist;
}

function buildDayRoute(
  dayPlaces: Place[],
  hotels: Hotel[],
  dayIndex: number,
  travelMode: TravelMode,
  arrivalLocation?: Place | null,
  departureLocation?: Place | null,
  manualOrder: boolean = false,
  manualSequence?: string[],
): DayRoute {
  const endHotelRaw = hotels.find((h) => h.dayIndex === dayIndex) || null;
  const startHotelRaw =
    dayIndex > 0
      ? hotels.find((h) => h.dayIndex === dayIndex - 1) || null
      : endHotelRaw;

  // Sanitize locations to avoid "Null Island" (0,0) bug
  const sanitize = (loc: any) =>
    loc && loc.lat === 0 && loc.lng === 0 ? null : loc;

  const startHotel = sanitize(startHotelRaw);
  const endHotel = sanitize(endHotelRaw);
  const arrivalLoc = sanitize(arrivalLocation);
  const departureLoc = sanitize(departureLocation);

  let optimizedPlaces = manualOrder
    ? dayPlaces
    : optimizeDayRoute(startHotel, endHotel, dayPlaces);

  let dayDist = 0;
  let points: (Place | Hotel)[] = [];

  const rawPoints: (Place | Hotel)[] = [];
  const ids = manualSequence && manualSequence.length > 0 
    ? manualSequence 
    : (() => {
        const defaultIds: string[] = [];
        if (arrivalLocation) defaultIds.push("arrival");
        if (startHotel) defaultIds.push("start-hotel");
        optimizedPlaces.forEach((p) => defaultIds.push(p.id));
        if (endHotel) defaultIds.push("end-hotel");
        if (departureLocation) defaultIds.push("departure");
        return defaultIds;
      })();

  ids.forEach((id) => {
    let loc = null;
    if (id === "arrival") loc = arrivalLoc;
    else if (id === "start-hotel") loc = startHotel;
    else if (id === "end-hotel") loc = endHotel;
    else if (id === "departure") loc = departureLoc;
    else loc = dayPlaces.find((p) => p.id === id);
    rawPoints.push(loc);
  });

  // Two-pass fallback to ensure every point has a valid coordinate
  const processedPoints: (Place | Hotel)[] = [];
  const firstValid = rawPoints.find(p => p && !(p.lat === 0 && p.lng === 0));

  rawPoints.forEach((loc, idx) => {
    let current = loc;
    if (!current || (current.lat === 0 && current.lng === 0)) {
      if (idx > 0 && processedPoints[idx - 1]) {
        current = { ...processedPoints[idx - 1], name: "Unknown" } as any;
      } else if (firstValid) {
        current = { ...firstValid, name: "Unknown" } as any;
      } else {
        current = { name: "Unknown", lat: 0, lng: 0 } as any;
      }
    }
    processedPoints.push(current!);
  });

  points = processedPoints;

  if (manualSequence && manualSequence.length > 0) {
    optimizedPlaces = points.filter(
      (p) => (p as Place).id !== undefined,
    ) as Place[];
  }

  const segments: { distance: number; time: number; travelMode: TravelMode }[] =
    [];

  for (let i = 0; i < points.length - 1; i++) {
    const segDist = getDistance(
      points[i].lat,
      points[i].lng,
      points[i + 1].lat,
      points[i + 1].lng,
    );
    dayDist += segDist;
    segments.push({
      distance: segDist,
      time: estimateTime(segDist, travelMode),
      travelMode,
    });
  }

  const dayTravelTime = segments.reduce((sum, s) => sum + s.time, 0);
  const dayVisitTime = optimizedPlaces.reduce(
    (sum, p) => sum + (p.estimatedDuration ?? 60) * 60,
    0,
  ); // minutes to seconds

  return {
    day: dayIndex,
    startHotel,
    endHotel,
    stops: optimizedPlaces,
    segments,
    totalDistance: dayDist,
    totalTime: dayTravelTime,
    totalVisitTime: dayVisitTime,
    manualSequence,
  };
}

// Optimize a single day's route
export function solveSingleDay(
  dayPlaces: Place[],
  hotels: Hotel[],
  dayIndex: number,
  travelMode: TravelMode,
  arrivalLocation?: Place | null,
  departureLocation?: Place | null,
  manualOrder: boolean = false,
  manualSequence?: string[],
): DayRoute {
  return buildDayRoute(
    dayPlaces,
    hotels,
    dayIndex,
    travelMode,
    arrivalLocation,
    departureLocation,
    manualOrder,
    manualSequence,
  );
}

export function solveTSP(
  places: Place[],
  hotels: Hotel[],
  days: number,
  travelMode: TravelMode,
  dailyBudgets: number[],
  strictBudget: boolean = false,
  arrivalLocation?: Place | null,
  departureLocation?: Place | null,
  categoryConfigs?: Partial<Record<PlaceCategory, CategoryConfig>>,
): OptimizationResult {
  const startTime = performance.now();

  // 1. Cluster unassigned places (time-budget-aware, respects pinnedToDay)
  const clusteredPlaces = clusterPlaces(
    places,
    hotels,
    days,
    travelMode,
    dailyBudgets,
    strictBudget,
    arrivalLocation,
    departureLocation,
    categoryConfigs,
  );

  let totalTripDistance = 0;
  let totalTripTime = 0;
  const dayRoutes: DayRoute[] = [];

  // 2. Optimize each day
  for (let d = 0; d < days; d++) {
    let dayPlaces = clusteredPlaces.filter((p) => p.dayIndex === d);
    let route = buildDayRoute(
      dayPlaces,
      hotels,
      d,
      travelMode,
      d === 0 ? arrivalLocation : null,
      d === days - 1 ? departureLocation : null,
    );

    const limit = dailyBudgets[d];
    
    // Force strict eviction on any day whose budget was reduced below the maximum
    // (e.g. flight departure/arrival days), regardless of the global strictBudget toggle.
    const baseBudget = Math.max(...dailyBudgets);
    const forceStrict = strictBudget || limit < baseBudget;

    if (forceStrict) {
      let totalDayMin =
        dayPlaces.reduce((sum, p) => sum + (p.estimatedDuration ?? 60), 0) +
        Math.round(route.totalTime / 60);

      // On flight-constrained days, flights are a hard physical deadline.
      // Treat all places as evictable (even user-pinned ones).
      const flightConstrained = limit < baseBudget;

      while (dayPlaces.length > 0 && totalDayMin > limit) {
        const evictable = flightConstrained
          ? dayPlaces
          : dayPlaces.filter((p) => !p.pinnedToDay);
        if (evictable.length === 0) {
          break; // only pinned places left and not a flight day
        }

        // Evict the last evictable place (lowest priority/greedy order)
        const toEvict = evictable[evictable.length - 1];

        // Mutate original object in clusteredPlaces so it gets returned as unassigned
        const matched = clusteredPlaces.find((p) => p.id === toEvict.id);
        if (matched) {
          matched.dayIndex = null;
          matched.orderInDay = null;
          matched.unfeasibleReason = "Exceeds daily time budget.";
        }

        // Update dayPlaces local filter
        dayPlaces = dayPlaces.filter((p) => p.id !== toEvict.id);

        // Rebuild route
        route = buildDayRoute(
          dayPlaces,
          hotels,
          d,
          travelMode,
          d === 0 ? arrivalLocation : null,
          d === days - 1 ? departureLocation : null,
        );

        // Recalculate totalDayMin
        totalDayMin =
          dayPlaces.reduce((sum, p) => sum + (p.estimatedDuration ?? 60), 0) +
          Math.round(route.totalTime / 60);
      }
    }

    dayRoutes.push(route);
    totalTripDistance += route.totalDistance;
    totalTripTime += route.totalTime;
  }

  console.log(`Optimization took ${performance.now() - startTime}ms`);

  return {
    success: true,
    days: dayRoutes,
    totalDistance: totalTripDistance,
    totalTime: totalTripTime,
    unassignedPlaces: clusteredPlaces.filter((p) => p.dayIndex === null),
  };
}
