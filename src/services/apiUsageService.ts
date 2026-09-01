/**
 * Service to track real-time API usage, calculate daily budget consumption,
 * track cache savings, and manage Bring Your Own Key (BYOK) custom keys.
 */

export interface ApiUsageStats {
  date: string; // YYYY-MM-DD
  mapsSearchCalls: number;
  mapsPhotoCalls: number;
  mapsRouteCalls: number;
  geminiCalls: number;
  cacheHits: number;
  lastResetTime: number;
}

export interface ApiBudgetLimits {
  dailyMapsLimit: number; // default ~1,000 queries/day
  dailyGeminiLimit: number; // default ~1,500 queries/day (free tier)
}

const STORAGE_KEY_USAGE = "reroute_api_usage_stats_v1";
const STORAGE_KEY_CUSTOM_MAPS = "reroute_custom_maps_key";
const STORAGE_KEY_CUSTOM_GEMINI = "reroute_custom_gemini_key";
const STORAGE_KEY_LIMITS = "reroute_api_budget_limits_v1";

const DEFAULT_LIMITS: ApiBudgetLimits = {
  dailyMapsLimit: 1000,
  dailyGeminiLimit: 1500,
};

const getTodayDateString = () => new Date().toISOString().split("T")[0];

const getInitialStats = (): ApiUsageStats => {
  const today = getTodayDateString();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USAGE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load API usage from localStorage:", e);
  }
  return {
    date: today,
    mapsSearchCalls: 0,
    mapsPhotoCalls: 0,
    mapsRouteCalls: 0,
    geminiCalls: 0,
    cacheHits: 0,
    lastResetTime: Date.now(),
  };
};

let currentStats: ApiUsageStats = getInitialStats();

type UsageListener = (stats: ApiUsageStats) => void;
const listeners = new Set<UsageListener>();

const persistAndNotify = () => {
  try {
    localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(currentStats));
  } catch (e) {
    console.warn("Failed to persist API usage:", e);
  }
  listeners.forEach((fn) => fn({ ...currentStats }));
};

const checkDayRollover = () => {
  const today = getTodayDateString();
  if (currentStats.date !== today) {
    currentStats = {
      date: today,
      mapsSearchCalls: 0,
      mapsPhotoCalls: 0,
      mapsRouteCalls: 0,
      geminiCalls: 0,
      cacheHits: 0,
      lastResetTime: Date.now(),
    };
    persistAndNotify();
  }
};

export const apiUsageService = {
  getStats: (): ApiUsageStats => {
    checkDayRollover();
    return { ...currentStats };
  },

  getLimits: (): ApiBudgetLimits => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LIMITS);
      if (raw) return { ...DEFAULT_LIMITS, ...JSON.parse(raw) };
    } catch (e) {}
    return { ...DEFAULT_LIMITS };
  },

  setLimits: (limits: Partial<ApiBudgetLimits>) => {
    const newLimits = { ...apiUsageService.getLimits(), ...limits };
    localStorage.setItem(STORAGE_KEY_LIMITS, JSON.stringify(newLimits));
    persistAndNotify();
  },

  recordCall: (type: "maps_search" | "maps_photo" | "maps_route" | "gemini") => {
    checkDayRollover();
    if (type === "maps_search") currentStats.mapsSearchCalls++;
    else if (type === "maps_photo") currentStats.mapsPhotoCalls++;
    else if (type === "maps_route") currentStats.mapsRouteCalls++;
    else if (type === "gemini") currentStats.geminiCalls++;
    persistAndNotify();
  },

  recordCacheHit: (count = 1) => {
    checkDayRollover();
    currentStats.cacheHits += count;
    persistAndNotify();
  },

  resetStats: () => {
    currentStats = {
      date: getTodayDateString(),
      mapsSearchCalls: 0,
      mapsPhotoCalls: 0,
      mapsRouteCalls: 0,
      geminiCalls: 0,
      cacheHits: 0,
      lastResetTime: Date.now(),
    };
    persistAndNotify();
  },

  subscribe: (listener: UsageListener) => {
    listeners.add(listener);
    listener({ ...currentStats });
    return () => {
      listeners.delete(listener);
    };
  },

  // BYOK (Bring Your Own Key) helpers
  getCustomMapsKey: (): string => {
    return localStorage.getItem(STORAGE_KEY_CUSTOM_MAPS) || "";
  },

  setCustomMapsKey: (key: string) => {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_MAPS, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_MAPS);
    }
    persistAndNotify();
  },

  getCustomGeminiKey: (): string => {
    return localStorage.getItem(STORAGE_KEY_CUSTOM_GEMINI) || "";
  },

  setCustomGeminiKey: (key: string) => {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_GEMINI, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_GEMINI);
    }
    persistAndNotify();
  },

  getActiveMapsKey: (): string => {
    const custom = apiUsageService.getCustomMapsKey();
    if (custom) return custom;
    return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  },

  getActiveGeminiKey: (): string => {
    const custom = apiUsageService.getCustomGeminiKey();
    if (custom) return custom;
    return import.meta.env.VITE_GEMINI_API_KEY || "";
  },

  isUsingCustomMapsKey: (): boolean => {
    return !!apiUsageService.getCustomMapsKey();
  },

  isUsingCustomGeminiKey: (): boolean => {
    return !!apiUsageService.getCustomGeminiKey();
  },
};
