import React, { useState } from "react";
import { useRouteStore } from "../../store/useRouteStore";
import {
  Clock,
  Building2,
  Wand2,
  X,
  Timer,
  Car,
  Footprints,
  Train,
  ChevronDown,
  PlaneTakeoff,
  PlaneLanding,
  GripVertical,
  AlertTriangle,
  Loader2,
  Pin,
  Coins,
} from "lucide-react";
import { toast } from "../../services/toastService";
import { TravelMode, RouteSegment } from "../../types";
import { getCategoryEmoji } from "../../utils/categoryUtils";
import { format, addDays, parseISO } from "date-fns";
import { checkTimeConflict } from "../../utils/timeUtils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PlaceHighlightBadge } from "../common/PlaceHighlightBadge";
import { ReservationBadge } from "../common/ReservationBadge";

const EditPlaceModal = React.lazy(() =>
  import("./EditPlaceModal").then((m) => ({ default: m.EditPlaceModal }))
);

const formatTime = (totalMinutes: number) => {
  const { timeFormat } = useRouteStore.getState();
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = Math.floor(totalMinutes % 60);
  
  if (timeFormat === "24h") {
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, "0")} ${period}`;
};

const formatTimeString = (timeStr: string) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  return formatTime(h * 60 + m);
};

const BufferPill: React.FC<{ minutes: number; showLine?: boolean }> = ({
  minutes,
  showLine = true,
}) => {
  return (
    <div className="pt-0 pb-3 pl-12 relative group">
      {/* Line connector segment */}
      {showLine && (
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-surface-200 dark:bg-surface-700/50" />
      )}
      <div className="travel-pill inline-flex items-center gap-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-2 py-1 rounded-full text-[10px] font-bold text-surface-400 uppercase tracking-tight">
        <Clock className="w-3 h-3" />
        <span>{minutes} min buffer</span>
      </div>
    </div>
  );
};

const ExpandableDescription: React.FC<{ text: any }> = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const rawText =
    typeof text === "string"
      ? text
      : text && typeof text === "object" && "text" in text
      ? String(text.text)
      : text && typeof text === "object"
      ? JSON.stringify(text)
      : String(text || "");

  if (!rawText.trim()) return null;

  const shouldTruncate = rawText.length > 100;

  return (
    <div className="relative">
      <p
        className={`text-xs text-surface-500 dark:text-surface-400 leading-relaxed ${!isExpanded && shouldTruncate ? "line-clamp-2" : ""}`}
      >
        {rawText}
      </p>
      {shouldTruncate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline mt-1"
        >
          {isExpanded ? "Show Less" : "Show More"}
        </button>
      )}
    </div>
  );
};

interface SortableStopProps {
  stop: any;
  stopIdx: number;
  stopArrivalTime: number;
  isFirst: boolean;
  isLast: boolean;
  unassignPlace: (id: string) => void;
  leadingSegIdx: number;
  route: any;
  dayIndex: number;
  currentTime: number;
  dateMode: "fixed" | "duration";
  currentDate: Date;
  onEdit: () => void;
}

const SortableStop: React.FC<SortableStopProps> = React.memo(({
  stop,
  stopArrivalTime,
  isFirst,
  isLast,
  unassignPlace,
  dateMode,
  currentDate,
  onEdit,
}) => {
  const timeConflict = 
    dateMode === "fixed" 
      ? checkTimeConflict(stopArrivalTime, stop.estimatedDuration || 60, stop.openingHours, currentDate)
      : { hasConflict: false };
      
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: "relative" as const,
    opacity: isDragging ? 0.3 : 1,
    scale: isDragging ? 1.02 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group content-auto ${isDragging ? "cursor-grabbing" : ""}`}
    >
      {/* Visual Drop Indicator */}
      {isDragging && (
        <div className="absolute inset-x-0 -top-2 h-1 bg-primary-500/50 rounded-full blur-[1px] animate-pulse" />
      )}

      {/* Line connector */}
      <div
        className={`absolute left-5 w-0.5 bg-surface-200 dark:bg-surface-700/50 ${isFirst ? "top-5" : "top-0"} ${isLast ? "h-5" : "bottom-0"}`}
      />

      <div className="flex gap-4 relative z-10">
        <div className="relative z-20">
          <button
            onClick={onEdit}
            className="w-10 h-10 rounded-full bg-white dark:bg-surface-800 border-2 border-surface-100 dark:border-surface-700 flex items-center justify-center shrink-0 shadow-sm hover:border-primary-500 group-hover:border-primary-500 transition-colors"
            title="Edit Place Details"
          >
            <span className="text-sm">{getCategoryEmoji(stop.category)}</span>
          </button>

          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="absolute -left-7 top-5 -translate-y-1/2 p-1 text-surface-300 dark:text-surface-600 hover:text-surface-600 dark:hover:text-surface-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-0.5 pb-4">
          <div className="flex items-center justify-between gap-2 relative">
            <button
              onClick={onEdit}
              className="text-sm font-bold text-surface-900 dark:text-white truncate hover:text-primary-600 group-hover:text-primary-600 transition-colors pr-8 text-left outline-none focus:ring-2 focus:ring-primary-500 rounded"
              title="Edit Place Details"
            >
              {stop.name}
              {stop.romanizedName && stop.romanizedName.toLowerCase() !== stop.name.toLowerCase() && (
                <span className="ml-1.5 text-xs font-normal text-surface-500 dark:text-surface-400 italic">
                  ({stop.romanizedName})
                </span>
              )}
            </button>
            <div className="flex items-center gap-1.5 shrink-0">
              {timeConflict.hasConflict && (
                <div 
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold border border-red-200 dark:border-red-800"
                  title={timeConflict.reason}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span className="hidden sm:inline">Closed</span>
                </div>
              )}
              {stop.pinnedToDay && (
                <span
                  className="p-1 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  title="Pinned to this day (optimizer won't move this stop)"
                >
                  <Pin className="w-3 h-3 fill-current" />
                </span>
              )}
            </div>
            <button
              onClick={() => unassignPlace(stop.id)}
              className="absolute right-0 top-0.5 p-1 text-surface-300 dark:text-surface-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Remove from day"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-bold font-mono text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded">
              {formatTime(stopArrivalTime)}
            </span>
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-tight flex items-center gap-1">
              <Timer className="w-2.5 h-2.5" />
              {stop.estimatedDuration || 60}m visit
            </span>
            {stop.priceEstimate && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border ${
                  stop.priceEstimate.toLowerCase().includes("free")
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                    : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-200 dark:border-surface-700"
                }`}
                title={`Estimated price: ${stop.priceEstimate}`}
              >
                <Coins className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                {stop.priceEstimate}
              </span>
            )}
            {stop.reservation && (
              <ReservationBadge reservation={stop.reservation} compact />
            )}
          </div>

          {(stop.description || (Array.isArray(stop.openingHours) && stop.openingHours.length > 0)) && (
            <div className="mt-1 space-y-1">
              {stop.description && <ExpandableDescription text={stop.description} />}
              {Array.isArray(stop.openingHours) && stop.openingHours.length > 0 && (
                <div 
                  className="inline-flex items-center gap-1 text-[10px] text-surface-400 dark:text-surface-500 cursor-help"
                  title={stop.openingHours.filter((h: any) => typeof h === "string").join("\n")}
                >
                  <Clock className="w-3 h-3" />
                  <span>View Hours</span>
                </div>
              )}
            </div>
          )}

          {/* Contextual Highlight (Must-Try, Photo Spot, etc.) - Always visible, never cut off */}
          {stop.highlight && stop.highlight.text && (
            <div className="mt-2">
              <PlaceHighlightBadge highlight={stop.highlight} category={stop.category} compact />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const SortableAnchor: React.FC<{
  id: string;
  type: "arrival" | "departure" | "start-hotel" | "end-hotel";
  name: string;
  time?: string;
  calculatedTime?: number;
  buffer?: number;
  isFirst: boolean;
  isLast: boolean;
}> = React.memo(({ id, type, name, time, calculatedTime, buffer, isFirst, isLast }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: "relative" as const,
    opacity: isDragging ? 0.3 : 1,
    scale: isDragging ? 1.02 : 1,
  };

  const getIcon = () => {
    switch (type) {
      case "arrival":
        return <PlaneLanding className="w-5 h-5" />;
      case "departure":
        return <PlaneTakeoff className="w-5 h-5" />;
      default:
        return <Building2 className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "arrival":
        return "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400";
      case "departure":
        return "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400";
      default:
        return "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "cursor-grabbing" : ""}`}
    >
      {/* Visual Drop Indicator */}
      {isDragging && (
        <div className="absolute inset-x-0 -top-2 h-1 bg-primary-500/50 rounded-full blur-[1px] animate-pulse" />
      )}

      {/* Line connector */}
      <div
        className={`absolute left-5 w-0.5 bg-surface-200 dark:bg-surface-700/50 ${isFirst ? "top-5" : "top-0"} ${isLast ? "h-5" : "bottom-0"}`}
      />

      <div className="flex items-start gap-4 relative z-20">
        <div className="relative">
          <div
            className={`w-10 h-10 rounded-full ${getColors()} flex items-center justify-center shrink-0 shadow-sm border border-white/50 dark:border-surface-700`}
          >
            {getIcon()}
          </div>

          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="absolute -left-7 top-5 -translate-y-1/2 p-1 text-surface-300 dark:text-surface-600 hover:text-surface-600 dark:hover:text-surface-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-0.5 pb-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-surface-900 dark:text-white truncate">
              {name}
            </h4>
            {time && (
              <span className="text-[10px] font-bold font-mono text-surface-400">
                {formatTimeString(time)}
              </span>
            )}
            {calculatedTime !== undefined && (
              <span className="text-[10px] font-bold font-mono text-surface-400">
                {formatTime(calculatedTime)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-surface-500 uppercase font-bold tracking-tight">
            {type === "arrival"
              ? "Airport/Station Arrival"
              : type === "departure"
                ? "Trip Departure"
                : type === "start-hotel"
                  ? "Day Start / Hotel"
                  : "Day End / Hotel"}
          </p>
        </div>
      </div>
      {buffer !== undefined && (
        <BufferPill minutes={buffer} showLine={!isLast} />
      )}
    </div>
  );
});

const SegmentPill: React.FC<{
  segment: RouteSegment;
  dayIndex: number;
  segmentIndex: number;
}> = React.memo(({ segment, dayIndex, segmentIndex }) => {
  const updateSegmentTravelMode = useRouteStore((s) => s.updateSegmentTravelMode);
  const distanceUnit = useRouteStore((s) => s.distanceUnit);

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSegmentTravelMode(
      dayIndex,
      segmentIndex,
      e.target.value as TravelMode,
    );
  };

  const getModeIcon = () => {
    switch (segment.travelMode) {
      case "walking":
        return <Footprints className="w-3.5 h-3.5" />;
      case "transit":
        return <Train className="w-3.5 h-3.5" />;
      case "driving":
      default:
        return <Car className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="pt-0 pb-3 pl-12 relative group">
      {/* Line connector segment - always full height for segments as they are intermediate */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-surface-200 dark:bg-surface-700/50" />
      <div className="travel-pill inline-flex items-center gap-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-2 py-1 rounded-full text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors cursor-pointer relative overflow-hidden">
        {getModeIcon()}
        <span>{Math.round(segment.time / 60)} min</span>
        <span className="text-surface-300 dark:text-surface-600 mx-0.5">•</span>
        <span>
          {(() => {
            const dist = segment.distance;
            if (distanceUnit === "imperial") {
              const ft = dist * 3.28084;
              if (ft >= 100) {
                const mi = ft / 5280;
                return `${mi < 0.1 ? mi.toFixed(2) : mi.toFixed(1)} mi`;
              }
              return `${Math.round(ft)} ft`;
            } else {
              if (dist >= 30) {
                const km = dist / 1000;
                return `${km < 0.1 ? km.toFixed(2) : km.toFixed(1)} km`;
              }
              return `${Math.round(dist)} m`;
            }
          })()}
        </span>

        <select
          value={segment.travelMode || "driving"}
          onChange={handleModeChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          title="Change travel mode for this segment"
        >
          <option value="driving">Driving</option>
          <option value="transit">Transit</option>
          <option value="walking">Walking</option>
        </select>
        <ChevronDown className="w-3 h-3 text-surface-400 dark:text-surface-500 group-hover:text-surface-600 dark:group-hover:text-surface-300 ml-0.5" />
      </div>
    </div>
  );
});


export const DailySchedule: React.FC = () => {
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [optimizingDayIndex, setOptimizingDayIndex] = useState<number | null>(null);
  const {
    optimizedRoutes,
    optimizeDay,
    unassignPlace,
    reorderDayStops,
    startDate,
    dateMode,
    dayStartTime,
    dayEndTime,
    showFlights,
    arrivalFlight,
    departureFlight,
  } = useRouteStore();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleOptimizeSingleDay = async (dayIndex: number) => {
    if (optimizingDayIndex !== null) return;
    setOptimizingDayIndex(dayIndex);
    try {
      await optimizeDay(dayIndex);
      toast.success(`Day ${dayIndex + 1} route re-optimized!`, "Day Optimized");
    } catch (err: any) {
      toast.error(err?.message || `Failed to optimize Day ${dayIndex + 1}`, "Optimization Error");
    } finally {
      setOptimizingDayIndex(null);
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (optimizedRoutes.length === 0) return null;

  // Calculate day total in minutes
  const [startH, startM] = dayStartTime.split(":").map(Number);
  const [endH, endM] = dayEndTime.split(":").map(Number);
  let baseDayMinutes = endH * 60 + endM - (startH * 60 + startM);
  if (baseDayMinutes < 0) baseDayMinutes += 24 * 60; // Handle overnight

  const scrollToDay = (dayIndex: number) => {
    const element = document.getElementById(`schedule-day-${dayIndex}`);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    }
  };

  return (
    <>
      <div className="schedule-container">
      <div className="px-6 py-3 border-b border-surface-100 dark:border-surface-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-50 dark:bg-surface-800 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">
            Optimized Schedule
          </h2>
        </div>

        {/* Day Quick Navigation */}
        <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1 sm:justify-end">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-surface-400 uppercase tracking-wider whitespace-nowrap">
              Jump to:
            </span>

            {optimizedRoutes.length > 18 && (
              <input
                type="number"
                placeholder="Day #"
                min={1}
                max={optimizedRoutes.length}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) scrollToDay(val - 1);
                }}
                className="w-20 bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-md px-2 py-0.5 text-xs font-bold text-primary-600 outline-none focus:ring-1 focus:ring-primary-500 text-center"
              />
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {optimizedRoutes.map((_, i) => {
              const btnDate = addDays(parseISO(startDate), i);
              return (
                <button
                  key={i}
                  onClick={() => scrollToDay(i)}
                  className={`px-3 py-1.5 rounded-lg bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 font-bold text-surface-600 dark:text-surface-300 hover:border-primary-500 hover:text-primary-600 transition-all whitespace-nowrap flex flex-col items-center justify-center min-w-[60px] ${dateMode === "fixed" ? "text-[10px]" : "text-xs"}`}
                >
                  {dateMode === "fixed" ? (
                    <>
                      <span className="opacity-50">D{i + 1}</span>
                      <span>{format(btnDate, "MMM d")}</span>
                    </>
                  ) : (
                    <span>Day {i + 1}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="p-6 overflow-x-auto overflow-y-hidden custom-scrollbar flex gap-6 snap-x snap-mandatory"
      >
        {optimizedRoutes.map((route, i) => {
          const currentDate = addDays(parseISO(startDate), i);
          const isFirstDay = i === 0;
          const isLastDay = i === optimizedRoutes.length - 1;

          // Calculate base day start time in minutes
          const [startH, startM] = dayStartTime.split(":").map(Number);
          let currentTime = startH * 60 + startM;

          // Calculate available time for this day
          let dayAvailableMinutes = baseDayMinutes;
          if (showFlights) {
            if (isFirstDay && arrivalFlight) {
              const [arrH, arrM] = arrivalFlight.time.split(":").map(Number);
              const arrivalTotal = arrH * 60 + arrM;
              const dayStartTotal = startH * 60 + startM;
              const effectiveStart = Math.max(dayStartTotal, arrivalTotal);
              currentTime = effectiveStart; // Day starts after flight

              let available = endH * 60 + endM - effectiveStart;
              if (available < 0) available += 24 * 60;
              dayAvailableMinutes = available;
            }
            if (isLastDay && departureFlight) {
              const [depH, depM] = departureFlight.time.split(":").map(Number);
              const depTotal = depH * 60 + depM;
              // Handle overnight: if dayEndTime is "00:00" (midnight), treat as 1440
              const rawDayEnd = endH * 60 + endM;
              const dayEndTotal = rawDayEnd === 0 ? 24 * 60 : rawDayEnd;
              const effectiveEnd = Math.min(dayEndTotal, depTotal);

              let available = effectiveEnd - (startH * 60 + startM);
              if (available < 0) available += 24 * 60;
              dayAvailableMinutes = available;
            }
          }

          const visitMin = route.stops.reduce(
            (acc, s) => acc + (s.estimatedDuration || 0),
            0,
          );
          const travelMin = Math.round(route.totalTime / 60);
          const totalDayMin = visitMin + travelMin;
          const remainingTime = Math.max(0, dayAvailableMinutes - totalDayMin);
          const isOverBudget = totalDayMin > dayAvailableMinutes;
          const budgetPct = Math.min(
            100,
            Math.round((totalDayMin / dayAvailableMinutes) * 100),
          );

          return (
            <div
              key={i}
              id={`schedule-day-${i}`}
              className="flex-shrink-0 w-80 md:w-96 snap-start"
            >
              <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-100 dark:border-surface-700 shadow-xl overflow-hidden flex flex-col h-full max-h-[600px]">
                <div className="p-4 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                      <h3 className="text-lg font-bold text-surface-900 dark:text-white leading-tight">
                        Day {i + 1}
                      </h3>
                      {dateMode === "fixed" && (
                        <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                          {format(currentDate, "MMM d (EEE)")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {route.stops.length > 1 && (
                        <button
                          onClick={() => handleOptimizeSingleDay(i)}
                          disabled={optimizingDayIndex !== null}
                          className="p-1.5 rounded-lg bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all disabled:opacity-50"
                          title="Optimize this day's route"
                        >
                          {optimizingDayIndex === i ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                          ) : (
                            <Wand2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-surface-500 uppercase tracking-tight">
                      <span className="flex items-center gap-1.5 bg-surface-100 dark:bg-surface-700/50 px-2 py-0.5 rounded-full">
                        <Timer className="w-3 h-3 text-primary-500" />
                        <span className="text-surface-400">Visit:</span>
                        <span className="text-surface-600 dark:text-surface-300">
                          {visitMin > 60
                            ? `${Math.floor(visitMin / 60)}h ${visitMin % 60}m`
                            : `${visitMin}m`}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 bg-surface-100 dark:bg-surface-700/50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-primary-500" />
                        <span className="text-surface-400">Travel:</span>
                        <span className="text-surface-600 dark:text-surface-300">
                          {travelMin > 60
                            ? `${Math.floor(travelMin / 60)}h ${travelMin % 60}m`
                            : `${travelMin}m`}
                        </span>
                      </span>
                    </div>
                    <div
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isOverBudget ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      {isOverBudget
                        ? "OVER BUDGET"
                        : remainingTime >= 60
                          ? `${Math.floor(remainingTime / 60)}h ${remainingTime % 60}m left`
                          : `${remainingTime}m left`}
                    </div>
                  </div>

                  {/* Budget bar */}
                  <div className="w-full bg-surface-100 dark:bg-surface-700 rounded-full h-1 mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOverBudget ? "bg-red-500" : "bg-primary-500"}`}
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 space-y-0 relative">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                      const { active, over } = event;
                      if (over && active.id !== over.id) {
                        reorderDayStops(
                          i,
                          active.id as string,
                          over.id as string,
                        );
                      }
                    }}
                  >
                    <SortableContext
                      items={(() => {
                        if (route.manualSequence) return route.manualSequence;
                        const items = [];
                        if (showFlights && isFirstDay && arrivalFlight)
                          items.push("arrival");
                        if (route.startHotel) items.push("start-hotel");
                        route.stops.forEach((s) => items.push(s.id));
                        if (route.endHotel) items.push("end-hotel");
                        if (showFlights && isLastDay && departureFlight)
                          items.push("departure");
                        return items;
                      })()}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col relative">
                        {(() => {
                          const items =
                            route.manualSequence ||
                            (() => {
                              const ids = [];
                              if (showFlights && isFirstDay && arrivalFlight)
                                ids.push("arrival");
                              if (route.startHotel) ids.push("start-hotel");
                              route.stops.forEach((s) => ids.push(s.id));
                              if (route.endHotel) ids.push("end-hotel");
                              if (showFlights && isLastDay && departureFlight)
                                ids.push("departure");
                              return ids;
                            })();


                          return items.map((itemId, idx) => {
                            const isFirst = idx === 0;
                            const isLast = idx === items.length - 1;

                            let element = null;
                            let itemDuration = 0;

                            if (itemId === "arrival" && arrivalFlight) {
                              element = (
                                <SortableAnchor
                                  key="arrival"
                                  id="arrival"
                                  type="arrival"
                                  name={
                                    arrivalFlight.location
                                      ? arrivalFlight.location.name
                                      : "Flight Arrival"
                                  }
                                  time={arrivalFlight.time}
                                  buffer={arrivalFlight.buffer}
                                  isFirst={isFirst}
                                  isLast={isLast}
                                />
                              );
                              itemDuration = arrivalFlight.buffer;
                            } else if (
                              itemId === "departure" &&
                              departureFlight
                            ) {
                              element = (
                                <SortableAnchor
                                  key="departure"
                                  id="departure"
                                  type="departure"
                                  name={
                                    departureFlight.location
                                      ? departureFlight.location.name
                                      : "Flight Departure"
                                  }
                                  time={departureFlight.time}
                                  buffer={departureFlight.buffer}
                                  isFirst={isFirst}
                                  isLast={isLast}
                                />
                              );
                              itemDuration = departureFlight.buffer;
                            } else if (
                              itemId === "start-hotel" &&
                              route.startHotel
                            ) {
                              element = (
                                <SortableAnchor
                                  key="start-hotel"
                                  id="start-hotel"
                                  name={route.startHotel.name}
                                  type="start-hotel"
                                  calculatedTime={currentTime}
                                  isFirst={isFirst}
                                  isLast={isLast}
                                />
                              );
                            } else if (
                              itemId === "end-hotel" &&
                              route.endHotel
                            ) {
                              element = (
                                <SortableAnchor
                                  key="end-hotel"
                                  id="end-hotel"
                                  name={route.endHotel.name}
                                  type="end-hotel"
                                  calculatedTime={currentTime}
                                  isFirst={isFirst}
                                  isLast={isLast}
                                />
                              );
                            } else {
                              const stop = route.stops.find(
                                (s) => s.id === itemId,
                              );
                              if (stop) {
                                element = (
                                  <SortableStop
                                    key={stop.id}
                                    stop={stop}
                                    stopIdx={idx}
                                    stopArrivalTime={currentTime}
                                    isFirst={isFirst}
                                    isLast={isLast}
                                    unassignPlace={unassignPlace}
                                    leadingSegIdx={-1}
                                    route={route}
                                    dayIndex={i}
                                    currentTime={currentTime}
                                    dateMode={dateMode}
                                    currentDate={currentDate}
                                    onEdit={() => setEditingPlaceId(stop.id)}
                                  />
                                );
                                itemDuration = stop.estimatedDuration || 0;
                              }
                            }

                            if (!element) return null;

                            currentTime += itemDuration;

                            // After item, render segment if not last
                            const segmentElement =
                              idx < items.length - 1 &&
                                idx < route.segments.length ? (
                                <div
                                  className="mt-[-4px]"
                                  key={`seg-${itemId}`}
                                >
                                  <SegmentPill
                                    segment={route.segments[idx]}
                                    dayIndex={i}
                                    segmentIndex={idx}
                                  />
                                  {(() => {
                                    currentTime += Math.round(
                                      route.segments[idx].time / 60,
                                    );
                                    return null;
                                  })()}
                                </div>
                              ) : null;

                            return (
                              <React.Fragment key={`group-${itemId}`}>
                                {element}
                                {segmentElement}
                              </React.Fragment>
                            );
                          });
                        })()}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
      {editingPlaceId && (
        <React.Suspense fallback={null}>
          <EditPlaceModal
            placeId={editingPlaceId}
            onClose={() => setEditingPlaceId(null)}
          />
        </React.Suspense>
      )}
    </>
  );
};
