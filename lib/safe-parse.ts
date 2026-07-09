export function parseModelJson<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{"); const startArr = cleaned.indexOf("[");
    const s = (startArr !== -1 && (startArr < start || start === -1)) ? startArr : start;
    if (s === -1) return null;
    return JSON.parse(cleaned.slice(s)) as T;
  } catch { return null; }
}
