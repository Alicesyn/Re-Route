import React, { useEffect, useState, useRef } from "react";
import { useRouteStore } from "../../store/useRouteStore";
import { getSuggestedPlaces } from "../../services/recommendationService";
import { Place } from "../../types";
import { getCategoryEmoji, getCategoryLabel, getCategoryFallbackImage, getActivePhotoUrl } from "../../utils/categoryUtils";
import { getDistance } from "../../utils/distance";
import { Sparkles, MapPin, Plus, Check, ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";

export const SuggestedPlaces: React.FC = () => {
  const { places, hotels, appMode, addPlace, showImages } = useRouteStore();
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [dismissedNames, setDismissedNames] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Recalculate trip center to show estimated distance
  const getCenterCoord = (): { lat: number; lng: number } | null => {
    const points = [...hotels];
    places.forEach((p) => points.push(p as any));
    if (points.length === 0) return null;

    const latSum = points.reduce((sum, p) => sum + p.lat, 0);
    const lngSum = points.reduce((sum, p) => sum + p.lng, 0);
    return { lat: latSum / points.length, lng: lngSum / points.length };
  };

  const center = getCenterCoord();

  // Track previous mode/hotels to know when to completely replace vs when to backfill
  const prevAppModeRef = useRef(appMode);
  const prevHotelsLengthRef = useRef(hotels.length);

  useEffect(() => {
    const loadSuggestions = async () => {
      const modeChanged = prevAppModeRef.current !== appMode;
      const hotelsChanged = prevHotelsLengthRef.current !== hotels.length;

      // Don't spam the API on every single dismiss/add unless we are running out of suggestions
      if (!modeChanged && !hotelsChanged && suggestions.length >= 3) {
        return;
      }

      // Only show full loading spinner if we are doing a total wipe
      if (modeChanged || hotelsChanged || suggestions.length === 0) {
        setLoading(true);
      }

      try {
        const fetched = await getSuggestedPlaces(places, hotels, appMode, dismissedNames);
        
        setSuggestions((prev) => {
          const isTotalRefresh = modeChanged || hotelsChanged || prev.length === 0;
          if (isTotalRefresh) {
            return fetched;
          }
          // Backfill strategy: Keep existing items in order, append only the completely new ones
          const existingNames = new Set(prev.map(p => p.name.toLowerCase()));
          const newSuggestions = fetched.filter(p => !existingNames.has(p.name.toLowerCase()));
          return [...prev, ...newSuggestions];
        });
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      } finally {
        setLoading(false);
        prevAppModeRef.current = appMode;
        prevHotelsLengthRef.current = hotels.length;
      }
    };

    loadSuggestions();
  }, [places.length, hotels.length, appMode, dismissedNames]);

  const handleDismiss = (e: React.MouseEvent, place: Place) => {
    e.stopPropagation();
    // Optimistically remove from view
    setSuggestions((prev) => prev.filter((p) => p.id !== place.id));
    setDismissedNames((prev) => [...prev, place.name]);
  };

  const handleAdd = (place: Place) => {
    // Add success state animation
    setAddedIds((prev) => {
      const next = new Set(prev);
      next.add(place.id);
      return next;
    });

    // Animate item out of recommendations after brief checkmark delay
    setTimeout(() => {
      // Destructure to remove dayIndex, orderInDay, pinnedToDay as addPlace requires
      const { dayIndex, orderInDay, pinnedToDay, ...cleanPlace } = place;
      addPlace(cleanPlace);
      
      setSuggestions((prev) => prev.filter((p) => p.id !== place.id));
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(place.id);
        return next;
      });
    }, 800);
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (loading) {
    return (
      <div className="mt-8 border-t border-surface-100 dark:border-surface-700/50 pt-6">
        <div className="flex items-center gap-2 mb-4 animate-pulse">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <div className="h-6 w-48 bg-surface-200 dark:bg-surface-700 rounded-md"></div>
        </div>
        <div className="flex gap-4 overflow-hidden py-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="w-72 h-44 bg-surface-100 dark:bg-surface-800 border border-surface-200/50 dark:border-surface-700/50 rounded-xl flex-shrink-0 animate-pulse p-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-4 w-16 bg-surface-200 dark:bg-surface-700 rounded-full"></div>
                <div className="h-5 w-40 bg-surface-200 dark:bg-surface-700 rounded-md"></div>
                <div className="h-3 w-48 bg-surface-200 dark:bg-surface-700 rounded-md"></div>
              </div>
              <div className="h-9 w-24 bg-surface-200 dark:bg-surface-700 rounded-lg self-end"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null; // Don't show recommendations if there are none or they are all added
  }

  return (
    <div className="mt-8 border-t border-surface-100 dark:border-surface-700/50 pt-6 relative group/section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
          <h3 className="text-sm font-black text-surface-900 dark:text-white uppercase tracking-wider">
            Suggested Sights
          </h3>
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded-full uppercase tracking-tight">
            Curated Hidden Gems
          </span>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-1.5 opacity-0 group-hover/section:opacity-100 transition-opacity duration-300">
          <button
            onClick={() => scroll("left")}
            className="p-1.5 rounded-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-primary-500 hover:text-primary-500 text-surface-400 shadow-sm transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 rounded-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-primary-500 hover:text-primary-500 text-surface-400 shadow-sm transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Carousel Container */}
      <div className="relative">
        {/* Left Gradient Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-surface-800 to-transparent pointer-events-none z-10 opacity-60" />
        
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2 pr-12 pl-2 -ml-2"
        >
          {suggestions.map((place) => {
            const isAdded = addedIds.has(place.id);
            let distanceStr = "";

            if (center) {
              const d = getDistance(place.lat, place.lng, center.lat, center.lng);
              distanceStr = d > 1000 ? `${(d / 1000).toFixed(1)} km away` : `${Math.round(d)} m away`;
            }

            return (
              <div
                key={place.id}
                className={`w-72 md:w-80 flex-shrink-0 bg-white dark:bg-surface-800 border border-surface-200/60 dark:border-surface-700/50 rounded-xl flex flex-col justify-between shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-900/50 transition-all duration-300 relative overflow-hidden ${
                  isAdded ? "scale-[0.98] border-emerald-400 dark:border-emerald-800/80 bg-emerald-50/10 dark:bg-emerald-950/10" : ""
                }`}
              >
                {/* Visual Glassmorphism Highlight */}
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />

                {/* Dismiss Button */}
                <button
                  onClick={(e) => handleDismiss(e, place)}
                  className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-surface-900/80 backdrop-blur-sm rounded-full text-surface-400 hover:text-red-500 dark:hover:text-red-400 shadow-sm z-20 transition-colors"
                  title="Dismiss suggestion"
                >
                  <X className="w-4 h-4" />
                </button>

                {showImages && (
                  <div className="h-32 w-full relative shrink-0">
                    <img
                      src={getActivePhotoUrl(place.photoUrl) || getCategoryFallbackImage(place.category)}
                      alt={place.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = getCategoryFallbackImage(place.category);
                      }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-surface-800 via-transparent to-transparent opacity-90" />
                  </div>
                )}

                <div className={`flex flex-col flex-grow ${showImages ? "p-4 pt-1" : "p-4"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-surface-400 uppercase tracking-tight bg-surface-50 dark:bg-surface-900 border border-surface-200/50 dark:border-surface-700/50 px-2 py-0.5 rounded-full relative z-10">
                      <span>{getCategoryEmoji(place.category)}</span>
                      <span>{getCategoryLabel(place.category)}</span>
                    </span>
                    {distanceStr && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-surface-400 relative z-10">
                        <MapPin className="w-3 h-3 text-purple-400" />
                        {distanceStr}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-black text-surface-900 dark:text-white mb-1 leading-tight group-hover:text-purple-600 relative z-10">
                    {place.name}
                  </h4>
                  {place.address && (
                    <p className="text-[10px] text-surface-400 dark:text-surface-500 mb-2 truncate relative z-10" title={place.address}>
                      {place.address}
                    </p>
                  )}
                  <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-relaxed line-clamp-2 relative z-10">
                    {place.description}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 pt-0 z-10">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + place.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:underline transition-colors"
                    title="View on Google Maps"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View on Google
                  </a>
                  <button
                    onClick={() => handleAdd(place)}
                    disabled={isAdded}
                    className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm ${
                      isAdded
                        ? "bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none pointer-events-none scale-95"
                        : "bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 dark:text-purple-400 border border-purple-200/40 dark:border-purple-900/30 hover:scale-105 active:scale-95"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Add to Trip
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Gradient Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-surface-800 to-transparent pointer-events-none z-10 opacity-60" />
      </div>
    </div>
  );
};
