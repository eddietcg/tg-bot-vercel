const createExtractor = (key) => (text) => extractValue(text, key);
export const getReporter = createExtractor("REPORTER");
export const getFarm = createExtractor("FARM");

export function trim(str) {
  if (!str) return str;
  return (str || "").trim();
}

export function formatDateTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()} ${pad(now.getMonth() + 1)} ${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
