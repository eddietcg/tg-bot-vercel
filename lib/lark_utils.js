import dayjs from "dayjs";
function extractValue(text, key) {
  if (!text) return null;

  const lines = text.split("\n");

  for (const line of lines) {
    if (line.includes(key)) {
      const parts = line.split("=");
      if (parts.length >= 2) {
        return trim(parts[1]);
      }
    }
  }

  return null;
}

const createExtractor = (key) => (text) => extractValue(text, key);
export const getReporter = createExtractor("REPORTER");
export const getFarm = createExtractor("FARM");
export const getStatus = createExtractor("STATUS");

export function trim(str) {
  if (!str) return str;
  return (str || "").trim();
}

export function formatDateTime(time = new Date(), timeunit = 8) {
  return dayjs(time).add(timeunit, "hour").format("YYYY-MM-DD HH:mm:ss");
}
