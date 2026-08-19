// Returns the start and end of "today" in IST (Asia/Kolkata), used to
// enforce "one attendance mark per calendar day" instead of "ever."
export function getISTDayRange(): { start: Date; end: Date } {
  const now = new Date();

  // Convert current time to IST by applying the +5:30 offset, then
  // truncate to midnight, then convert back to a real UTC Date for the
  // Mongo query.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);

  const istMidnight = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate())
  );

  const start = new Date(istMidnight.getTime() - IST_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}