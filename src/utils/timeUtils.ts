import { format } from "date-fns";

export interface ParsedOpeningHours {
  open: number;
  close: number;
  intervals: { open: number; close: number }[];
}

/**
 * Parses an opening hours string like "Monday: 9:00 AM – 5:00 PM" or "Monday: 11:30 AM – 2:00 PM, 5:00 PM – 10:00 PM"
 * Returns the open and close times in minutes from midnight, along with all active intervals.
 * Handles "Closed" and "Open 24 hours".
 */
export const parseOpeningHoursString = (
  hoursStr: string
): ParsedOpeningHours | "closed" | "24hours" | null => {
  if (!hoursStr || typeof hoursStr !== "string") return null;
  const lower = hoursStr.toLowerCase();
  if (lower.includes("closed")) return "closed";
  if (lower.includes("24 hours") || lower.includes("open 24")) return "24hours";

  // Regex to extract all time intervals, e.g. "9:00 AM – 5:00 PM", "9 AM to 5 PM", "11:30 AM – 2:00 PM, 5:30 PM – 10:00 PM"
  // Handles optional minutes, dashes (hyphen, en-dash, em-dash), and 'to'
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*(?:–|-|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi;
  const matches = [...hoursStr.matchAll(timeRegex)];

  if (matches.length === 0) return null;

  const intervals: { open: number; close: number }[] = [];

  for (const match of matches) {
    const [, openH, openM, openP, closeH, closeM, closeP] = match;

    let openMinutes = (parseInt(openH) % 12) * 60 + (openM ? parseInt(openM) : 0);
    if (openP.toUpperCase() === "PM") openMinutes += 12 * 60;

    let closeMinutes = (parseInt(closeH) % 12) * 60 + (closeM ? parseInt(closeM) : 0);
    if (closeP.toUpperCase() === "PM") closeMinutes += 12 * 60;

    // Handle case where place closes after midnight (e.g. 2:00 AM)
    if (closeMinutes < openMinutes) {
      closeMinutes += 24 * 60;
    }

    intervals.push({ open: openMinutes, close: closeMinutes });
  }

  if (intervals.length === 0) return null;

  const earliestOpen = Math.min(...intervals.map((i) => i.open));
  const latestClose = Math.max(...intervals.map((i) => i.close));

  return { open: earliestOpen, close: latestClose, intervals };
};

/**
 * Retrieves the parsed opening hours for a specific calendar date.
 */
export const getPlaceDayHours = (
  openingHours: string[] | undefined,
  date: Date
): ParsedOpeningHours | "closed" | "24hours" | null => {
  if (!openingHours || !Array.isArray(openingHours) || openingHours.length === 0) return null;
  if (!date || isNaN(new Date(date).getTime())) return null;

  try {
    const dayOfWeekString = format(date instanceof Date ? date : new Date(date), "EEEE");
    const todaysHours = openingHours.find(
      (h) => typeof h === "string" && h.startsWith(dayOfWeekString)
    );

    if (!todaysHours || typeof todaysHours !== "string") return null;
    return parseOpeningHoursString(todaysHours);
  } catch {
    return null;
  }
};

export interface TimeConflictResult {
  hasConflict: boolean;
  reason?: string;
  waitMinutes?: number;
  effectiveStartTime?: number;
}

/**
 * Checks if a given arrival time and duration fit within the opening hours for a specific day.
 * If arriving before a venue opens (or during a break before the next opening),
 * calculates the necessary wait buffer so the visit starts when the venue opens,
 * rather than flagging a false conflict.
 */
export const checkTimeConflict = (
  arrivalTimeMinutes: number,
  durationMinutes: number,
  openingHours: string[] | undefined,
  date: Date
): TimeConflictResult => {
  if (!openingHours || !Array.isArray(openingHours) || openingHours.length === 0)
    return { hasConflict: false, waitMinutes: 0, effectiveStartTime: arrivalTimeMinutes };
  if (!date || isNaN(new Date(date).getTime()))
    return { hasConflict: false, waitMinutes: 0, effectiveStartTime: arrivalTimeMinutes };

  try {
    const parsed = getPlaceDayHours(openingHours, date);

    if (!parsed) return { hasConflict: false, waitMinutes: 0, effectiveStartTime: arrivalTimeMinutes };

    if (parsed === "closed") {
      return { hasConflict: true, reason: "Closed today" };
    }
    if (parsed === "24hours") {
      return { hasConflict: false, waitMinutes: 0, effectiveStartTime: arrivalTimeMinutes };
    }

    const intervals = (parsed.intervals || [{ open: parsed.open, close: parsed.close }])
      .slice()
      .sort((a, b) => a.open - b.open);

    const departureTimeMinutes = arrivalTimeMinutes + durationMinutes;

    // 1. Check if visit completely fits within at least one open interval without waiting
    const fitsInAnyInterval = intervals.some(
      (inv) => arrivalTimeMinutes >= inv.open && departureTimeMinutes <= inv.close
    );

    if (fitsInAnyInterval) {
      return { hasConflict: false, waitMinutes: 0, effectiveStartTime: arrivalTimeMinutes };
    }

    // 2. If arriving before an opening time (either in morning or during midday break),
    // wait until the venue opens! Simply insert a wait buffer until opening.
    const candidateInterval = intervals.find(
      (inv) => arrivalTimeMinutes < inv.open && inv.open + durationMinutes <= inv.close
    );

    if (candidateInterval) {
      const waitMinutes = candidateInterval.open - arrivalTimeMinutes;
      return {
        hasConflict: false,
        waitMinutes,
        effectiveStartTime: candidateInterval.open,
      };
    }

    // 3. If arrival is after all intervals close, or visit exceeds latest closing time
    const latestClose = Math.max(...intervals.map((i) => i.close));
    if (departureTimeMinutes > latestClose || arrivalTimeMinutes >= latestClose) {
      return { hasConflict: true, reason: "Leaving after closing time" };
    }

    return { hasConflict: true, reason: "Closed during scheduled visiting hours" };
  } catch {
    return { hasConflict: false, waitMinutes: 0, effectiveStartTime: arrivalTimeMinutes };
  }
};

