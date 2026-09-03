import { format } from "date-fns";

/**
 * Parses an opening hours string like "Monday: 9:00 AM – 5:00 PM"
 * Returns the open and close times in minutes from midnight.
 * Handles "Closed" and "Open 24 hours".
 */
export const parseOpeningHoursString = (
  hoursStr: string
): { open: number; close: number } | "closed" | "24hours" | null => {
  if (hoursStr.toLowerCase().includes("closed")) return "closed";
  if (hoursStr.toLowerCase().includes("24 hours")) return "24hours";

  // Regex to extract times, e.g. "9:00 AM – 5:00 PM" or "9:00 AM to 5:00 PM"
  // Note: the dash might be an en-dash or standard hyphen
  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)\s*(?:–|-|to)\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i;
  const match = hoursStr.match(timeRegex);

  if (!match) return null;

  let [_, openH, openM, openP, closeH, closeM, closeP] = match;
  
  let openMinutes = (parseInt(openH) % 12) * 60 + parseInt(openM);
  if (openP.toUpperCase() === "PM") openMinutes += 12 * 60;

  let closeMinutes = (parseInt(closeH) % 12) * 60 + parseInt(closeM);
  if (closeP.toUpperCase() === "PM") closeMinutes += 12 * 60;
  
  // Handle case where place closes after midnight (e.g. 2:00 AM)
  if (closeMinutes < openMinutes) {
    closeMinutes += 24 * 60;
  }

  return { open: openMinutes, close: closeMinutes };
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
  if (!openingHours || !Array.isArray(openingHours) || openingHours.length === 0) return { hasConflict: false };
  if (!date || isNaN(new Date(date).getTime())) return { hasConflict: false };

  try {
    const dayOfWeekString = format(date instanceof Date ? date : new Date(date), "EEEE");
    const todaysHours = openingHours.find(h => typeof h === "string" && h.startsWith(dayOfWeekString));

    if (!todaysHours || typeof todaysHours !== "string") return { hasConflict: false };

    const parsed = parseOpeningHoursString(todaysHours);

    if (parsed === "closed") {
      return { hasConflict: true, reason: "Closed today" };
    }
    if (parsed === "24hours" || parsed === null) {
      return { hasConflict: false };
    }

    const departureTimeMinutes = arrivalTimeMinutes + durationMinutes;

    if (arrivalTimeMinutes < parsed.open) {
      return { hasConflict: true, reason: "Arriving before opening time" };
    }
    
    if (departureTimeMinutes > parsed.close) {
      return { hasConflict: true, reason: "Leaving after closing time" };
    }

    return { hasConflict: false };
  } catch {
    return { hasConflict: false };
  }
};
