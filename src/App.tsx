import { Header } from "./components/layout/Header";
import { PlaceSearch } from "./components/trip-builder/PlaceSearch";
import { PlaceList } from "./components/trip-builder/PlaceList";
import { SuggestedPlaces } from "./components/trip-builder/SuggestedPlaces";
import { TripSettings } from "./components/trip-builder/TripSettings";
import { MapView } from "./components/map/MapView";
import { DailySchedule } from "./components/schedule/DailySchedule";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ToastContainer } from "./components/layout/ToastContainer";
import { toast } from "./services/toastService";
import { useRouteStore } from "./store/useRouteStore";
import { solveTSP } from "./services/tspSolver";
import { clearMapsCache, fetchFreshPhoto } from "./services/mapsService";
import { Wand2, Sparkles, ChevronDown, ChevronUp, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { summarizePlacesBatch, romanizePlaceNames } from "./services/aiService";
import { hasNonLatinScript } from "./utils/textUtils";
import type { DayRoute, Place } from "./types";

function App() {
  const {
    places,
    hotels,
    days,
    travelMode,
    strictBudget,
    optimizedRoutes,
    setOptimizedRoutes,
    clearAll,
    unassignAll,
    appMode,
    updatePlacesBulk,
    theme,
    showFlights,
    arrivalFlight,
    departureFlight,
    dayStartTime,
    dayEndTime,
    categoryConfigs,
  } = useRouteStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Apply dark mode
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const upgradedPhotoPlaceIdsRef = useRef<Set<string>>(new Set());

  // Auto-upgrade any legacy or missing photo URLs to fresh direct Google CDN URLs
  useEffect(() => {
    if (appMode !== "real" || places.length === 0) return;

    const placesNeedingPhotos = places.filter(
      (p) =>
        (!p.photoUrl || p.photoUrl.includes("places.googleapis.com")) &&
        !upgradedPhotoPlaceIdsRef.current.has(p.id)
    );
    if (placesNeedingPhotos.length === 0) return;

    placesNeedingPhotos.forEach((p) => upgradedPhotoPlaceIdsRef.current.add(p.id));

    const upgradeLegacyPhotos = async () => {
      const updates: { id: string; updates: { photoUrl?: string } }[] = [];
      await Promise.all(
        placesNeedingPhotos.map(async (p) => {
          try {
            const freshPhotoUri = await fetchFreshPhoto(p);
            if (freshPhotoUri) {
              updates.push({ id: p.id, updates: { photoUrl: freshPhotoUri } });
            }
          } catch (e) {
            console.warn(`[Auto-Upgrade Photo] Failed for ${p.name}:`, e);
          }
        })
      );

      if (updates.length > 0) {
        updatePlacesBulk(updates);
      }
    };

    upgradeLegacyPhotos();
  }, [places.length, appMode]);

  // Auto-romanize foreign place names that contain non-Latin characters (Japanese, Chinese, Thai, etc.)
  useEffect(() => {
    if (appMode !== "real" || places.length === 0) return;
    const foreignUnromanized = places.filter(
      (p) => hasNonLatinScript(p.name) && !p.romanizedName
    );
    if (foreignUnromanized.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        const results = await romanizePlaceNames(
          foreignUnromanized.map((p) => ({ id: p.id, name: p.name, address: p.address }))
        );
        if (results && results.length > 0) {
          const updates = results
            .filter((r) => r.romanizedName)
            .map((r) => ({ id: r.id, updates: { romanizedName: r.romanizedName! } }));
          if (updates.length > 0) {
            updatePlacesBulk(updates);
          }
        }
      } catch (e) {
        console.warn("[Auto-Romanize] Failed to romanize place names:", e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [places, appMode, updatePlacesBulk]);

  const handleOptimize = async () => {
    const activePlaces = places.filter((p) => !p.isDisabled);
    if (activePlaces.length === 0 || isOptimizing) return;
    setIsOptimizing(true);
    try {
      const [startH, startM] = dayStartTime.split(":").map(Number);
      const [endH, endM] = dayEndTime.split(":").map(Number);
      let baseDayMinutes = endH * 60 + endM - (startH * 60 + startM);
      if (baseDayMinutes < 0) baseDayMinutes += 24 * 60; // Handle overnight

      const dayBudgets = Array.from({ length: days }).map((_, i) => {
        let dayAvailableMinutes = baseDayMinutes;
        const isFirstDay = i === 0;
        const isLastDay = i === days - 1;

        if (showFlights) {
          if (isFirstDay && arrivalFlight) {
            const [arrH, arrM] = arrivalFlight.time.split(":").map(Number);
            const arrivalTotal = arrH * 60 + arrM;
            const dayStartTotal = startH * 60 + startM;
            const effectiveStart = Math.max(dayStartTotal, arrivalTotal);

            let available = endH * 60 + endM - effectiveStart;
            if (available < 0) available += 24 * 60;
            dayAvailableMinutes = available;
          }
          if (isLastDay && departureFlight) {
            const [depH, depM] = departureFlight.time.split(":").map(Number);
            const depTotal = depH * 60 + depM;
            const rawDayEnd = endH * 60 + endM;
            const dayEndTotal = rawDayEnd === 0 ? 24 * 60 : rawDayEnd;
            const effectiveEnd = Math.min(dayEndTotal, depTotal);

            let available = effectiveEnd - (startH * 60 + startM);
            if (available < 0) available += 24 * 60;
            dayAvailableMinutes = available;
          }
        }
        return dayAvailableMinutes;
      });

      const result = await solveTSP(
        activePlaces,
        hotels,
        days,
        travelMode,
        dayBudgets,
        strictBudget,
        showFlights ? arrivalFlight?.location : null,
        showFlights ? departureFlight?.location : null,
        categoryConfigs,
      );

      if (result.success) {
        setOptimizedRoutes(result.days);

        // Update places with their optimizer-assigned days and order
        const placeUpdates: {
          id: string;
          updates: Partial<(typeof places)[0]>;
        }[] = [];
        result.days.forEach((dayRoute: DayRoute) => {
          dayRoute.stops.forEach((stop: Place, idx: number) => {
            const originalPlace = places.find((p) => p.id === stop.id);
            if (originalPlace) {
              placeUpdates.push({
                id: stop.id,
                updates: {
                  dayIndex: dayRoute.day,
                  orderInDay: idx,
                  pinnedToDay: originalPlace.pinnedToDay,
                },
              });
            }
          });
        });

        if (result.unassignedPlaces) {
          result.unassignedPlaces.forEach((unassigned: Place) => {
            placeUpdates.push({
              id: unassigned.id,
              updates: {
                dayIndex: null,
                orderInDay: null,
                unfeasibleReason: unassigned.unfeasibleReason,
              },
            });
          });
        }

        if (placeUpdates.length > 0) {
          updatePlacesBulk(placeUpdates);
        }

        if (result.unassignedPlaces && result.unassignedPlaces.length > 0) {
          toast.warning(
            `${result.unassignedPlaces.length} of ${activePlaces.length} places could not fit within the daily time budget.`,
            "Schedule Over Capacity",
          );
        } else {
          toast.success(
            `Optimized ${activePlaces.length} places across ${days} days!`,
            "Route Optimized",
          );
        }
      } else {
        toast.error(
          "Could not optimize routes. Try adjusting day times or budgets.",
          "Optimization Failed",
        );
      }
    } catch (err: any) {
      console.error("Optimization error:", err);
      toast.error(
        err?.message || "An unexpected error occurred during optimization.",
        "Optimization Error",
      );
    } finally {
      setIsOptimizing(false);
    }
  };


  const abortControllerRef = useRef<AbortController | null>(null);

  const handleGenerateDescriptions = async () => {
    if (isGenerating) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    // Find places that need real AI descriptions
    const placesToUpdate = places.filter(
      (p) => !p.description || p.description.trim() === ""
    );

    if (placesToUpdate.length === 0) {
      setIsGenerating(false);
      return;
    }

    console.log(`[AI Describe] Starting generation for ${placesToUpdate.length} places...`);

    try {
      const updates: { id: string; updates: any }[] = [];

      // Process sequentially for mock, but batch for real API
      if (appMode === "real") {
        try {
          console.log(`[AI Describe] Preparing batch request for Gemini API...`);
          const batchPlaces = placesToUpdate.map(p => ({
            id: p.id,
            name: p.name,
            address: p.address,
            types: (p as any).types || []
          }));

          console.log(`[AI Describe] Sending request to Gemini... Please wait.`);
          const aiDataArray = await summarizePlacesBatch(batchPlaces, 3, abortControllerRef.current.signal);
          console.log(`[AI Describe] Received response from Gemini! Formatting updates...`);

          for (const p of placesToUpdate) {
            const aiData = aiDataArray.find((d) => d.id === p.id);
            if (aiData) {
              updates.push({
                id: p.id,
                updates: {
                  description: aiData.description,
                  category: aiData.category,
                  estimatedDuration: aiData.estimatedDuration,
                  descriptionSource: "ai" as const,
                  ...(aiData.romanizedName ? { romanizedName: aiData.romanizedName } : {}),
                },
              });
            } else if (p.editorialSummary) {
              // Fallback to Google Maps editorial summary if AI missed this place
              updates.push({
                id: p.id,
                updates: {
                  description: p.editorialSummary,
                  descriptionSource: "ai" as const,
                },
              });
            }
          }
        } catch (e: any) {
          if (e.name === 'AbortError') {
            console.log("AI description generation was aborted by the user.");
            return;
          }
          console.error("Batch processing failed", e);
          // Fallback everything to editorial summary if the batch call failed
          for (const p of placesToUpdate) {
            if (p.editorialSummary) {
              updates.push({
                id: p.id,
                updates: {
                  description: p.editorialSummary,
                  descriptionSource: "ai" as const,
                },
              });
            }
          }
        }
      } else {
        for (const p of placesToUpdate) {
          updates.push({
            id: p.id,
            updates: {
              description: `[MOCK AI] This is a simulated high-quality description of ${p.name}. It focuses on the legendary reputation and the vibrant, unique atmosphere of the location.`,
              category: p.category,
              estimatedDuration: p.estimatedDuration,
              descriptionSource: "ai" as const,
            },
          });
        }
      }

      if (updates.length > 0) {
        console.log(`[AI Describe] Saving ${updates.length} descriptions to state...`);
        updatePlacesBulk(updates);
        toast.success(`Generated AI descriptions for ${updates.length} places!`, "AI Descriptions Ready");
      } else {
        toast.info("No description updates needed.", "AI Describe");
      }
    } catch (err: any) {
      console.error("AI Batch Processing Error:", err);
      toast.error(err?.message || "Failed to generate AI descriptions.", "AI Error");
    } finally {
      setIsGenerating(false);
    }
  };

  const [isSyncingPhotos, setIsSyncingPhotos] = useState(false);

  const handleSyncPhotos = async () => {
    if (places.length === 0 || isSyncingPhotos) return;
    setIsSyncingPhotos(true);
    try {
      clearMapsCache();

      const updates: { id: string; updates: any }[] = [];
      await Promise.all(
        places.map(async (p) => {
          try {
            const freshPhotoUri = await fetchFreshPhoto(p);
            if (freshPhotoUri) {
              updates.push({
                id: p.id,
                updates: { photoUrl: freshPhotoUri },
              });
            }
          } catch (err) {
            console.error(`[Sync Photos] Failed for ${p.name}:`, err);
          }
        })
      );

      if (updates.length > 0) {
        updatePlacesBulk(updates);
        toast.success(`Synced fresh photos for ${updates.length} places!`, "Photos Synced");
      } else {
        toast.info("All place photos are already up to date.", "Photos Synced");
      }
    } catch (err: any) {
      console.error("Photo Sync Error:", err);
      toast.error("Failed to sync photos from Google Maps.", "Photo Sync Error");
    } finally {
      setIsSyncingPhotos(false);
    }
  };

  const handleUnassignAll = () => {
    unassignAll();
    toast.info("All places unassigned from schedule.", "Schedule Cleared");
  };

  const handleClearAll = () => {
    clearAll();
    toast.info("All places removed from trip.", "Places Cleared");
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col font-sans transition-colors overflow-hidden">
      <Header />
      <ToastContainer />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 w-full custom-scrollbar">
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12">
          {/* Top Row: Trip Settings & Map */}
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            <div className="w-full lg:w-1/3 flex flex-col bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
              <div className="p-5 flex-1">
                <TripSettings />
              </div>
            </div>

            <div className="w-full lg:w-2/3 flex flex-col min-h-[400px] rounded-xl overflow-hidden shadow-sm border border-surface-200 dark:border-surface-700 relative">
              <div className="absolute inset-0">
                <MapView />
              </div>
            </div>
          </div>

          {/* Middle Row: Places to Visit */}
          <div className="bg-white dark:bg-surface-800 rounded-xl p-4 sm:p-6 shadow-sm border border-surface-200 dark:border-surface-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                  Places to Visit
                </h2>
                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-sm font-semibold px-2.5 py-0.5 rounded-full">
                  {places.filter((p) => !p.isDisabled).length}
                </span>
                {places.some((p) => p.isDisabled) && (
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full" title="Places kept in reserve without routing">
                    {places.filter((p) => p.isDisabled).length} excluded
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {places.some(
                  (p) => !p.description || p.description.trim() === "",
                ) && (
                  <button
                    onClick={handleGenerateDescriptions}
                    className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-all"
                    title={isGenerating ? "Stop generating descriptions" : "Auto-generate missing descriptions"}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isGenerating ? "Stop AI" : "AI Describe"}
                  </button>
                )}
                 {places.length > 0 && (
                  <button
                    onClick={handleSyncPhotos}
                    disabled={isSyncingPhotos}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/10 dark:hover:bg-primary-950/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                    title="Refresh all place photos from Google Maps"
                  >
                    {isSyncingPhotos ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {isSyncingPhotos ? "Syncing..." : "Sync Photos"}
                  </button>
                )}
                {places.some((p) => p.dayIndex !== null) && (
                  <button
                    onClick={handleUnassignAll}
                    className="text-sm font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/10 dark:hover:bg-amber-900/20 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Unassign All
                  </button>
                )}
                {places.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-sm font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <PlaceSearch />

            <div className="mt-4">
              <PlaceList isExpanded={isExpanded} />

              {places.length > 6 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200 bg-surface-100 hover:bg-surface-200 dark:bg-surface-700 dark:hover:bg-surface-600 py-2.5 rounded-lg transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" /> Collapse Grid
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" /> Expand Grid to Show
                      All {places.length} Places
                    </>
                  )}
                </button>
              )}
              
              <SuggestedPlaces />
            </div>
          </div>

          {/* Optimize Button */}
          <button
            onClick={handleOptimize}
            disabled={places.filter((p) => !p.isDisabled).length === 0 || isOptimizing}
            className="btn-primary w-full flex items-center justify-center gap-2 group py-4 text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>
                  Optimizing Route ({places.filter((p) => !p.isDisabled).length} places)...
                </span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>
                  Optimize Route
                  {places.some((p) => p.isDisabled)
                    ? ` (${places.filter((p) => !p.isDisabled).length} active)`
                    : ""}
                </span>
              </>
            )}
          </button>

          {/* Bottom Row: Daily Schedule */}
          {optimizedRoutes.length > 0 && (
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
              <ErrorBoundary fallbackTitle="Could not load daily schedule">
                <DailySchedule />
              </ErrorBoundary>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

