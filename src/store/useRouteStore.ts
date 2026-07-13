import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { get as getIDB, set as setIDB, del as delIDB } from "idb-keyval";
import {
  Place,
  Hotel,
  TravelMode,
  DayRoute,
  ItinerarySnapshot,
  CategoryConfig,
} from "../types";
import { solveSingleDay } from "../services/tspSolver";
import { estimateTime } from "../utils/distance";
import { format, addDays, parseISO, differenceInDays } from "date-fns";
import { CATEGORY_DEFAULTS, ALL_CATEGORIES } from "../utils/categoryConstants";
import { PlaceCategory } from "../types";

interface ModeData {
  places: Place[];
  hotels: Hotel[];
  missingPlaces: string[];
  optimizedRoutes: DayRoute[];
}

interface RouteState extends ModeData {
  // Itinerary core
  title: string;
  days: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dateMode: "fixed" | "duration";
  dayStartTime: string; // HH:mm
  dayEndTime: string; // HH:mm
  showFlights: boolean;
  arrivalFlight: {
    time: string;
    buffer: number;
    location: Place | null;
  } | null;
  departureFlight: {
    time: string;
    buffer: number;
    location: Place | null;
  } | null;
  travelMode: TravelMode;
  dailyBudget: number; // minutes (user-configurable)
  strictBudget: boolean; // if true, won't assign places that exceed daily budget
  appMode: "real" | "mock" | "dropdown-mock";
  theme: "light" | "dark";
  showImages: boolean;
  distanceUnit: "metric" | "imperial";
  timeFormat: "12h" | "24h";
  categoryDurations: Record<PlaceCategory, number>;
  optimizedRoutes: DayRoute[];
  savedTrips: ItinerarySnapshot[];
  isCalculating: boolean;
  calculatingText: string;

  // Per-mode persistence
  mockData: ModeData;
  realData: ModeData;

  // Actions
  setTitle: (title: string) => void;
  setDays: (days: number) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setDateMode: (mode: "fixed" | "duration") => void;
  setDayTimes: (start: string, end: string) => void;
  setShowFlights: (show: boolean) => void;
  setArrivalFlight: (
    flight: { time: string; buffer: number; location: Place | null } | null,
  ) => void;
  setDepartureFlight: (
    flight: { time: string; buffer: number; location: Place | null } | null,
  ) => void;
  setTravelMode: (mode: TravelMode) => void;
  setDailyBudget: (minutes: number) => void;
  setStrictBudget: (strict: boolean) => void;
  setAppMode: (mode: "real" | "mock" | "dropdown-mock") => void;
  setTheme: (theme: "light" | "dark") => void;
  setShowImages: (show: boolean) => void;
  setDistanceUnit: (unit: "metric" | "imperial") => void;
  setTimeFormat: (format: "12h" | "24h") => void;
  setCategoryDuration: (category: PlaceCategory, duration: number) => void;
  setCategoryConfig: (category: PlaceCategory, config: Partial<CategoryConfig>) => void;

  // Places
  addPlace: (
    place: Omit<Place, "dayIndex" | "orderInDay" | "pinnedToDay">,
    targetDayIndex?: number,
  ) => void;
  updatePlace: (id: string, updates: Partial<Place>) => void;
  updatePlacesBulk: (
    updates: { id: string; updates: Partial<Place> }[],
  ) => void;
  removePlace: (id: string) => void;
  reorderPlaces: (places: Place[]) => void;
  applyCategoryDurationsToPlaces: () => void;
  clearAll: () => void;
  unassignAll: () => void;

  // Missing Places
  addMissingPlace: (name: string) => void;
  removeMissingPlace: (name: string) => void;
  clearMissingPlaces: () => void;

  // Day assignment
  assignPlaceToDay: (placeId: string, dayIndex: number) => void;
  unassignPlace: (placeId: string) => void;

  // Hotels
  setHotelForDay: (dayIndex: number, hotel: Hotel | null) => void;
  applyHotelToAllDays: (hotel: Hotel | null) => void;
  setHotelRange: (startDay: number, endDay: number, hotel: Hotel | null) => void;

  // Results
  setOptimizedRoutes: (routes: DayRoute[]) => void;
  updateSegmentTravelMode: (
    dayIndex: number,
    segmentIndex: number,
    mode: TravelMode,
  ) => void;

  // Per-day optimization
  optimizeDay: (dayIndex: number) => void;
  reorderDayStops: (dayIndex: number, activeId: string, overId: string) => void;

  // Trips
  saveTrip: () => void;
  loadTrip: (id: string) => void;
  deleteTrip: (id: string) => void;
}

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await getIDB(name);
    if (value) {
      return value;
    }
    // Fallback to localStorage for migration
    const localValue = localStorage.getItem(name);
    if (localValue) {
      await setIDB(name, localValue);
      return localValue;
    }
    return null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await setIDB(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await delIDB(name);
  },
};

export const useRouteStore = create<RouteState>()(
  persist(
    (set, get) => ({
      title: "RE:ROUTE",
      days: 3,
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(addDays(new Date(), 2), "yyyy-MM-dd"),
      dateMode: "duration",
      dayStartTime: "09:00",
      dayEndTime: "21:00",
      showFlights: false,
      arrivalFlight: null,
      departureFlight: null,
      travelMode: "driving",
      dailyBudget: 720, // 12 hours default
      strictBudget: true,
      places: [],
      hotels: [],
      missingPlaces: [],
      appMode: "mock",
      theme: "light",
      showImages: true,
      distanceUnit: "metric",
      timeFormat: "12h",
      categoryDurations: ALL_CATEGORIES.reduce(
        (acc, cat) => ({
          ...acc,
          [cat]: CATEGORY_DEFAULTS[cat]?.duration || 60,
        }),
        {} as Record<PlaceCategory, number>,
      ),
      categoryConfigs: {},
      optimizedRoutes: [],
      savedTrips: [],
      isCalculating: false,
      calculatingText: "",
      mockData: {
        places: [],
        hotels: [],
        missingPlaces: [],
        optimizedRoutes: [],
      },
      realData: {
        places: [],
        hotels: [],
        missingPlaces: [],
        optimizedRoutes: [],
      },

      setTitle: (title) => set({ title }),
      setDays: (days) =>
        set((state) => {
          // Adjust hotels array if days shrink
          const newHotels = state.hotels.filter((h) => h.dayIndex < days);
          // If a hotel exists for day 0, propagate it to any new days that don't have one
          const baseHotel = state.hotels.find((h) => h.dayIndex === 0);
          if (baseHotel) {
            for (let i = 0; i < days; i++) {
              if (!newHotels.find((h) => h.dayIndex === i)) {
                newHotels.push({ ...baseHotel, dayIndex: i });
              }
            }
          }
          // Reset dayIndex on places that exceed the new days limit
          const newPlaces = state.places.map((p) =>
            p.dayIndex !== null && p.dayIndex >= days
              ? { ...p, dayIndex: null, orderInDay: null, pinnedToDay: false }
              : p,
          );
          const newEndDate = format(
            addDays(parseISO(state.startDate), days - 1),
            "yyyy-MM-dd",
          );
          return {
            days,
            hotels: newHotels,
            places: newPlaces,
            endDate: newEndDate,
          };
        }),
      setStartDate: (startDate) =>
        set((state) => {
          if (state.dateMode === "fixed") {
            let endDate = state.endDate;
            if (parseISO(startDate) > parseISO(state.endDate)) {
              endDate = startDate;
            }
            const days = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
            return { startDate, endDate, days: Math.max(1, days) };
          } else {
            const endDate = format(
              addDays(parseISO(startDate), state.days - 1),
              "yyyy-MM-dd",
            );
            return { startDate, endDate };
          }
        }),
      setEndDate: (endDate) =>
        set((state) => {
          const days =
            differenceInDays(parseISO(endDate), parseISO(state.startDate)) + 1;
          return { endDate, days: Math.max(1, days) };
        }),
      setDateMode: (dateMode) => set({ dateMode }),
      setDayTimes: (dayStartTime, dayEndTime) =>
        set({ dayStartTime, dayEndTime }),
      setShowFlights: (showFlights) => set({ showFlights }),
      setArrivalFlight: (arrivalFlight) => set({ arrivalFlight }),
      setDepartureFlight: (departureFlight) => set({ departureFlight }),
      setTravelMode: (travelMode) => set({ travelMode }),
      setDailyBudget: (dailyBudget) => set({ dailyBudget }),
      setStrictBudget: (strictBudget) => set({ strictBudget }),
      setAppMode: (newMode) =>
        set((state) => {
          const oldMode = state.appMode;
          if (oldMode === newMode) return state;

          // 1. Save current state into the storage for the old mode
          const currentItinerary: ModeData = {
            places: state.places,
            hotels: state.hotels,
            missingPlaces: state.missingPlaces,
            optimizedRoutes: state.optimizedRoutes,
          };

          const isOldModeReal = oldMode === "real";
          const updatedMockData = isOldModeReal
            ? state.mockData
            : currentItinerary;
          const updatedRealData = isOldModeReal
            ? currentItinerary
            : state.realData;

          // 2. Load state from the storage for the new mode
          const isNewModeReal = newMode === "real";
          const targetData = isNewModeReal ? updatedRealData : updatedMockData;

          return {
            appMode: newMode,
            mockData: updatedMockData,
            realData: updatedRealData,
            ...targetData,
          };
        }),
      setTheme: (theme) => set({ theme }),
      setShowImages: (showImages) => set({ showImages }),
      setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setCategoryDuration: (category, duration) =>
        set((state) => ({
          categoryDurations: { ...state.categoryDurations, [category]: duration },
        })),
      setCategoryConfig: (category, config) =>
        set((state) => ({
          categoryConfigs: {
            ...state.categoryConfigs,
            [category]: {
              ...state.categoryConfigs[category],
              ...config,
            },
          },
        })),

      addPlace: (place, targetDayIndex) =>
        set((state) => {
          const newPlace: Place = {
            ...place,
            dayIndex: targetDayIndex !== undefined ? targetDayIndex : null,
            orderInDay:
              targetDayIndex !== undefined
                ? state.places.filter((p) => p.dayIndex === targetDayIndex)
                    .length
                : null,
            pinnedToDay: targetDayIndex !== undefined,
          };
          return { places: [...state.places, newPlace] };
        }),

      updatePlace: (id, updates) =>
        set((state) => ({
          places: state.places.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      updatePlacesBulk: (updates) =>
        set((state) => ({
          places: state.places.map((p) => {
            const update = updates.find((u) => u.id === p.id);
            return update ? { ...p, ...update.updates } : p;
          }),
        })),

      removePlace: (id) =>
        set((state) => ({
          places: state.places.filter((p) => p.id !== id),
        })),

      reorderPlaces: (places) => set({ places }),

      applyCategoryDurationsToPlaces: () =>
        set((state) => {
          const newPlaces = state.places.map((p) => ({
            ...p,
            estimatedDuration: state.categoryDurations[p.category] || p.estimatedDuration,
          }));
          return { places: newPlaces };
        }),

      clearAll: () => {
        console.log("Zustand clearAll executed");
        set({ places: [], hotels: [], missingPlaces: [], optimizedRoutes: [] });
      },

      unassignAll: () =>
        set((state) => ({
          places: state.places.map((p) => ({
            ...p,
            dayIndex: null,
            orderInDay: null,
            pinnedToDay: false,
          })),
          optimizedRoutes: [],
        })),

      addMissingPlace: (name) =>
        set((state) => ({
          missingPlaces: state.missingPlaces.includes(name)
            ? state.missingPlaces
            : [...state.missingPlaces, name],
        })),
      removeMissingPlace: (name) =>
        set((state) => ({
          missingPlaces: state.missingPlaces.filter((n) => n !== name),
        })),
      clearMissingPlaces: () => set({ missingPlaces: [] }),

      // Day assignment actions
      assignPlaceToDay: async (placeId, dayIndex) => {
        set({ isCalculating: true, calculatingText: "Calculating routes..." });
        try {
          const state = get();
          const newPlaces = state.places.map((p) =>
            p.id === placeId
              ? {
                  ...p,
                  dayIndex,
                  orderInDay: state.places.filter(
                    (pl) => pl.dayIndex === dayIndex,
                  ).length,
                  pinnedToDay: true,
                }
              : p,
          );

          let newRoutes = [...state.optimizedRoutes];
          const dayPlaces = newPlaces.filter((p) => p.dayIndex === dayIndex);
          
          const idx = newRoutes.findIndex((r) => r.day === dayIndex);
          let manualSequence: string[] | undefined = undefined;

          if (idx >= 0 && newRoutes[idx].manualSequence) {
             manualSequence = [...newRoutes[idx].manualSequence, placeId];
          }

          const result = await solveSingleDay(
            dayPlaces,
            state.hotels,
            dayIndex,
            state.travelMode,
            dayIndex === 0 && state.showFlights ? state.arrivalFlight?.location : null,
            dayIndex === state.days - 1 && state.showFlights ? state.departureFlight?.location : null,
            !!manualSequence,
            manualSequence,
            state.startDate,
            state.dayStartTime
          );
          
          if (idx >= 0) {
             newRoutes[idx] = result;
          } else {
             newRoutes.push(result);
             newRoutes.sort((a, b) => a.day - b.day);
          }

          set({ places: newPlaces, optimizedRoutes: newRoutes, isCalculating: false });
        } catch (e) {
          console.error(e);
          set({ isCalculating: false });
        }
      },

      unassignPlace: async (placeId) => {
        set({ isCalculating: true, calculatingText: "Updating routes..." });
        try {
          const state = get();
          const place = state.places.find((p) => p.id === placeId);
          const dayIndex = place?.dayIndex;

          const newPlaces = state.places.map((p) =>
            p.id === placeId
              ? { ...p, dayIndex: null, orderInDay: null, pinnedToDay: false }
              : p,
          );

          let newRoutes = [...state.optimizedRoutes];
          if (dayIndex !== null && dayIndex !== undefined) {
            const dayPlaces = newPlaces.filter((p) => p.dayIndex === dayIndex);
            
            const idx = newRoutes.findIndex((r) => r.day === dayIndex);
            let manualSequence: string[] | undefined = undefined;
            if (idx >= 0 && newRoutes[idx].manualSequence) {
               manualSequence = newRoutes[idx].manualSequence.filter(id => id !== placeId);
            }

            const result = await solveSingleDay(
              dayPlaces,
              state.hotels,
              dayIndex,
              state.travelMode,
              dayIndex === 0 && state.showFlights
                ? state.arrivalFlight?.location
                : null,
              dayIndex === state.days - 1 && state.showFlights
                ? state.departureFlight?.location
                : null,
              !!manualSequence,
              manualSequence,
              state.startDate,
              state.dayStartTime
            );
            if (idx >= 0) newRoutes[idx] = result;
          }

          set({ places: newPlaces, optimizedRoutes: newRoutes, isCalculating: false });
        } catch (e) {
          console.error(e);
          set({ isCalculating: false });
        }
      },

      setHotelForDay: (dayIndex, hotel) =>
        set((state) => {
          const existing = state.hotels.filter((h) => h.dayIndex !== dayIndex);
          if (hotel) {
            existing.push({ ...hotel, dayIndex });
          }
          return { hotels: existing.sort((a, b) => a.dayIndex - b.dayIndex) };
        }),

      applyHotelToAllDays: (hotel) =>
        set((state) => {
          if (!hotel) return { hotels: [] };
          const hotels = Array.from({ length: state.days }).map((_, i) => ({
            ...hotel,
            dayIndex: i,
          }));
          return { hotels };
        }),

      setHotelRange: (startDay, endDay, hotel) =>
        set((state) => {
          let existing = state.hotels.filter(
            (h) => h.dayIndex < startDay || h.dayIndex > endDay
          );
          if (hotel) {
            for (let i = startDay; i <= endDay; i++) {
              existing.push({ ...hotel, dayIndex: i });
            }
          }
          return { hotels: existing.sort((a, b) => a.dayIndex - b.dayIndex) };
        }),

      setOptimizedRoutes: (optimizedRoutes) => set({ optimizedRoutes }),

      updateSegmentTravelMode: (dayIndex, segmentIndex, mode) =>
        set((state) => {
          const newRoutes = [...state.optimizedRoutes];
          const routeIdx = newRoutes.findIndex((r) => r.day === dayIndex);
          if (routeIdx >= 0) {
            const route = { ...newRoutes[routeIdx] };
            const segments = [...route.segments];
            if (segments[segmentIndex]) {
              const seg = { ...segments[segmentIndex] };
              seg.travelMode = mode;
              seg.time = estimateTime(seg.distance, mode);
              segments[segmentIndex] = seg;

              // Recalculate total time
              route.segments = segments;
              route.totalTime = segments.reduce((sum, s) => sum + s.time, 0);
              newRoutes[routeIdx] = route;
            }
          }
          return { optimizedRoutes: newRoutes };
        }),

      // Per-day optimization
      optimizeDay: async (dayIndex) => {
        set({ isCalculating: true, calculatingText: "Optimizing day..." });
        try {
          const state = get();
          const dayPlaces = state.places.filter((p) => p.dayIndex === dayIndex);
          if (dayPlaces.length === 0) {
            set({ isCalculating: false });
            return;
          }

          const result = await solveSingleDay(
            dayPlaces,
            state.hotels,
            dayIndex,
            state.travelMode,
            dayIndex === 0 && state.showFlights
              ? state.arrivalFlight?.location
              : null,
            dayIndex === state.days - 1 && state.showFlights
              ? state.departureFlight?.location
              : null,
            false,
            undefined,
            state.startDate,
            state.dayStartTime
          );

          const newRoutes = [...state.optimizedRoutes];
          const existingIdx = newRoutes.findIndex((r) => r.day === dayIndex);
          if (existingIdx >= 0) {
            newRoutes[existingIdx] = result;
          } else {
            newRoutes.push(result);
            newRoutes.sort((a, b) => a.day - b.day);
          }

          const updatedPlaces = state.places.map((p) => {
            if (p.dayIndex !== dayIndex) return p;
            const stopIdx = result.stops.findIndex((s) => s.id === p.id);
            return stopIdx >= 0 ? { ...p, orderInDay: stopIdx } : p;
          });

          set({ optimizedRoutes: newRoutes, places: updatedPlaces, isCalculating: false });
        } catch (e) {
          console.error(e);
          set({ isCalculating: false });
        }
      },

      reorderDayStops: async (dayIndex, activeId, overId) => {
        set({ isCalculating: true, calculatingText: "Updating route..." });
        try {
          const state = get();
          const routes = [...state.optimizedRoutes];
          const routeIdx = routes.findIndex((r) => r.day === dayIndex);
          if (routeIdx === -1) {
            set({ isCalculating: false });
            return;
          }

          const route = routes[routeIdx];

          let currentOrder: string[] = [];
          if (route.manualSequence) {
            currentOrder = [...route.manualSequence];
          } else {
            if (dayIndex === 0 && state.showFlights && state.arrivalFlight)
              currentOrder.push("arrival");
            if (route.startHotel) currentOrder.push("start-hotel");
            route.stops.forEach((s) => currentOrder.push(s.id));
            if (route.endHotel) currentOrder.push("end-hotel");
            if (
              dayIndex === state.days - 1 &&
              state.showFlights &&
              state.departureFlight
            )
              currentOrder.push("departure");
          }

          const oldIndex = currentOrder.indexOf(activeId);
          const newIndex = currentOrder.indexOf(overId);

          if (oldIndex === -1 || newIndex === -1) {
            set({ isCalculating: false });
            return;
          }

          const newSequence = [...currentOrder];
          const [movedItem] = newSequence.splice(oldIndex, 1);
          newSequence.splice(newIndex, 0, movedItem);

          const dayPlaces = state.places.filter((p) => p.dayIndex === dayIndex);
          const result = await solveSingleDay(
            dayPlaces,
            state.hotels,
            dayIndex,
            state.travelMode,
            dayIndex === 0 && state.showFlights
              ? state.arrivalFlight?.location
              : null,
            dayIndex === state.days - 1 && state.showFlights
              ? state.departureFlight?.location
              : null,
            true, // manualOrder = true
            newSequence,
            state.startDate,
            state.dayStartTime
          );

          routes[routeIdx] = result;

          const updatedPlaces = state.places.map((p) => {
            if (p.dayIndex !== dayIndex) return p;
            const stopIdx = result.stops.findIndex((s) => s.id === p.id);
            return stopIdx >= 0
              ? { ...p, orderInDay: stopIdx, pinnedToDay: true }
              : p;
          });

          set({ optimizedRoutes: routes, places: updatedPlaces, isCalculating: false });
        } catch (e) {
          console.error(e);
          set({ isCalculating: false });
        }
      },

      saveTrip: () =>
        set((state) => {
          const snapshot: ItinerarySnapshot = {
            id: `trip_${Date.now()}`,
            title: state.title,
            days: state.days,
            travelMode: state.travelMode,
            places: state.places,
            hotels: state.hotels,
            optimizedRoutes: state.optimizedRoutes,
            savedAt: Date.now(),
          };
          // Update existing trip if title matches exactly (simple heuristic), otherwise create new
          const existingIndex = state.savedTrips.findIndex(
            (t) => t.title === state.title,
          );
          if (existingIndex >= 0) {
            const newTrips = [...state.savedTrips];
            newTrips[existingIndex] = {
              ...snapshot,
              id: state.savedTrips[existingIndex].id,
            }; // keep old ID
            return { savedTrips: newTrips };
          }
          return { savedTrips: [...state.savedTrips, snapshot] };
        }),

      loadTrip: (id) =>
        set((state) => {
          const trip = state.savedTrips.find((t) => t.id === id);
          if (!trip) return state;
          return {
            title: trip.title,
            days: trip.days,
            travelMode: trip.travelMode,
            places: trip.places,
            hotels: trip.hotels,
            optimizedRoutes: trip.optimizedRoutes,
          };
        }),


      deleteTrip: (id) =>
        set((state) => ({
          savedTrips: state.savedTrips.filter((t) => t.id !== id),
        })),
    }),
    {
      name: "reroute-storage",
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
