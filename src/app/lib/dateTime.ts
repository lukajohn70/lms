/**
 * Utility functions for device-local date and time formatting in 12-hour AM/PM format.
 */

/**
 * Format any date or ISO string into device's local timezone with 12-hour AM/PM format.
 * Example: "Oct 29, 2026, 2:45:22 PM"
 */
export function formatDeviceDateTime(
  dateVal: string | number | Date | null | undefined,
  includeSeconds: boolean = true
): string {
  if (!dateVal || dateVal === "Never") return "Never";

  try {
    let d: Date;
    if (dateVal instanceof Date) {
      d = dateVal;
    } else if (typeof dateVal === "number") {
      d = new Date(dateVal);
    } else {
      const str = String(dateVal).trim();
      if (!str || str === "Never") return "Never";

      if (str.endsWith("Z") || (str.includes("T") && (str.includes("+") || str.includes("-")))) {
        d = new Date(str);
      } else {
        // Handle "YYYY-MM-DD HH:mm:ss" - treat as UTC if server generated, fallback to local parse
        const isoCandidate = str.includes("T") ? str : str.replace(" ", "T") + "Z";
        const testDate = new Date(isoCandidate);
        d = isNaN(testDate.getTime()) ? new Date(str) : testDate;
      }
    }

    if (isNaN(d.getTime())) return String(dateVal);

    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: includeSeconds ? "2-digit" : undefined,
      hour12: true, // Guarantees AM/PM
    });
  } catch (e) {
    return String(dateVal);
  }
}

/**
 * Format only the time portion into device's local timezone with 12-hour AM/PM format.
 * Example: "2:45 PM" or "2:45:22 PM"
 */
export function formatDeviceTime(
  dateVal: string | number | Date | null | undefined,
  includeSeconds: boolean = false
): string {
  if (!dateVal) return "";

  try {
    let d: Date;
    if (dateVal instanceof Date) {
      d = dateVal;
    } else if (typeof dateVal === "number") {
      d = new Date(dateVal);
    } else {
      const str = String(dateVal).trim();
      const isoCandidate = str.includes("T") ? str : str.replace(" ", "T") + "Z";
      const testDate = new Date(isoCandidate);
      d = isNaN(testDate.getTime()) ? new Date(str) : testDate;
    }

    if (isNaN(d.getTime())) return "";

    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: includeSeconds ? "2-digit" : undefined,
      hour12: true, // Guarantees AM/PM
    });
  } catch (e) {
    return "";
  }
}

/**
 * Parses timestamps in terminal or log strings and replaces them with
 * the device's local timezone time formatted in 12-hour AM/PM.
 * 
 * Supports:
 * - Full ISO: "[2026-10-29T13:45:12Z] [INFO] ..." -> "[2:45:12 PM] [INFO] ..."
 * - 24-hour time: "[14:38:05] [INFO] ..." -> "[2:38:05 PM] [INFO] ..."
 */
export function formatLogTimestamp(log: string): string {
  if (!log) return "";

  // 1. Check for ISO-8601 timestamp in square brackets: [2026-10-29T13:45:12Z]
  const isoMatch = log.match(/^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\]/);
  if (isoMatch) {
    try {
      const d = new Date(isoMatch[1]);
      if (!isNaN(d.getTime())) {
        const timeStr = d.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
        return log.replace(isoMatch[0], `[${timeStr}]`);
      }
    } catch (e) {}
  }

  // 2. Check for 24-hour timestamp in square brackets: [HH:mm:ss] or [HH:mm]
  const timeMatch = log.match(/^\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const mins = timeMatch[2];
    const secs = timeMatch[3];
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    const formattedTime = secs !== undefined ? `${h12}:${mins}:${secs} ${ampm}` : `${h12}:${mins} ${ampm}`;
    return log.replace(timeMatch[0], `[${formattedTime}]`);
  }

  return log;
}
