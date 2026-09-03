const getApiKey = () => import.meta.env.VITE_EKISPERT_API_KEY || "";
const EKISPERT_API_ENDPOINT = "https://api.ekispert.jp/v1/json";

/**
 * Searches for stations matching a name using the Ekispert Free Plan (/station/light)
 */
export const searchEkispertStation = async (
  name: string
): Promise<{ code: string; name: string; type?: string }[]> => {
  const key = getApiKey();
  if (!key || !name.trim()) return [];

  try {
    const url = new URL(`${EKISPERT_API_ENDPOINT}/station/light`);
    url.searchParams.append("key", key);
    url.searchParams.append("name", name.trim());

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    const data = await response.json();
    const points = data?.ResultSet?.Point;
    if (!points) return [];

    const list = Array.isArray(points) ? points : [points];
    return list.map((p: any) => ({
      code: p.Station?.code || "",
      name: p.Station?.Name || "",
      type: p.Station?.Type || "train",
    }));
  } catch (e) {
    console.warn("Ekispert station search error:", e);
    return [];
  }
};

/**
 * Generates an Ekispert official transit route URL using the Free Plan endpoint (/search/course/light).
 * Returns the ResourceURI linking to roote.ekispert.net with live timetables and transfers.
 */
export const getEkispertRouteUrl = async (
  from: string,
  to: string
): Promise<string | null> => {
  const key = getApiKey();
  if (!key || !from.trim() || !to.trim()) return null;

  try {
    const url = new URL(`${EKISPERT_API_ENDPOINT}/search/course/light`);
    url.searchParams.append("key", key);
    url.searchParams.append("from", from.trim());
    url.searchParams.append("to", to.trim());

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    return data?.ResultSet?.ResourceURI || null;
  } catch (e) {
    console.warn("Ekispert route light error:", e);
    return null;
  }
};

/**
 * Checks if Ekispert API is configured
 */
export const isEkispertConfigured = (): boolean => {
  return !!getApiKey();
};