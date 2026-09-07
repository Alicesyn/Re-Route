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

/**
 * Checks if a given arrival time and duration fit within the opening hours for a specific day.
 */
export const checkTimeConflict = (
  arrivalTimeMinutes: number,
  durationMinutes: number,
  openingHours: string[] | undefined,
  date: Date
): { hasConflict: boolean; reason?: string } => {
  if (!openingHours || !Array.isArray(openingHours) || openingHours.length === 0)
    return { hasConflict: false };
  if (!date || isNaN(new Date(date).getTime())) return { hasConflict: false };

  try {
    const parsed = getPlaceDayHours(openingHours, date);

    if (!parsed) return { hasConflict: false };

    if (parsed === "closed") {
      return { hasConflict: true, reason: "Closed today" };
    }
    if (parsed === "24hours") {
      return { hasConflict: false };
    }

    const departureTimeMinutes = arrivalTimeMinutes + durationMinutes;

    // Check if visit completely fits within at least one open interval
    const intervals = parsed.intervals || [{ open: parsed.open, close: parsed.close }];
    const fitsInAnyInterval = intervals.some(
      (inv) => arrivalTimeMinutes >= inv.open && departureTimeMinutes <= inv.close
    );

    if (fitsInAnyInterval) {
      return { hasConflict: false };
    }

    const earliestOpen = Math.min(...intervals.map((i) => i.open));
    const latestClose = Math.max(...intervals.map((i) => i.close));

    if (arrivalTimeMinutes < earliestOpen) {
      return { hasConflict: true, reason: "Arriving before opening time" };
    }

    if (departureTimeMinutes > latestClose) {
      return { hasConflict: true, reason: "Leaving after closing time" };
    }

    return { hasConflict: true, reason: "Closed during midday break" };
  } catch {
    return { hasConflict: false };
  }
};
