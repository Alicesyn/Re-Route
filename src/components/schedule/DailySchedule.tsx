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
  Lock,
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

const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const formatMinutesTo24h = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = Math.floor(totalMinutes % 60);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

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

const BufferPill: React.FC<{
  minutes: number;
  label?: string;
  showLine?: boolean;
  isReservation?: boolean;
}> = ({ minutes, label, showLine = true, isReservation = false }) => {
  return (
    <div className="pt-0 pb-3 pl-12 relative group">
      {/* Line connector segment */}
      {showLine && (
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-surface-200 dark:bg-surface-700/50" />
      )}
      <div
        className={`travel-pill inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border ${
          isReservation
            ? "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300"
            : "bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400"
        }`}
      >
        {isReservation ? (
          <Lock className="w-3 h-3 text-purple-500 shrink-0" />
        ) : (
          <Clock className="w-3 h-3 text-surface-400 shrink-0" />
        )}
        <span>{label || `${minutes} min buffer`}</span>
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
  updatePlace: (id: string, updates: any) => void;
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
  updatePlace,
  dayIndex,
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

  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [tempTime, setTempTime] = useState(
    stop.customTime || formatMinutesTo24h(stopArrivalTime)
  );

  const isCustomTime = !!stop.customTime;
  const customTimeMinutes = isCustomTime ? parseTimeToMinutes(stop.customTime) : null;
  const isLate = isCustomTime && stopArrivalTime > (customTimeMinutes ?? 0);
  const lateMinutes = isLate ? stopArrivalTime - (customTimeMinutes ?? 0) : 0;

  const openUpward = isLast && !isFirst;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 60 : isTimeModalOpen ? 50 : 1,
    position: "relative" as const,
    opacity: isDragging ? 0.3 : 1,
    scale: isDragging ? 1.02 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "cursor-grabbing" : ""} ${isTimeModalOpen ? "z-50" : ""}`}
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
            className="absolute -left-6 top-5 -translate-y-1/2 p-1.5 text-surface-400 dark:text-surface-500 hover:text-surface-700 dark:hover:text-surface-200 cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-100 hover:opacity-100 transition-opacity touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-0.5 pb-4">
          <div className="flex items-center justify-between gap-2 relative">
            <button
              onClick={onEdit}
              className="text-sm font-bold text-surface-900 dark:text-white truncate hover:text-primary-600 group-hover:text-primary-600 transition-colors text-left outline-none focus:ring-2 focus:ring-primary-500 rounded"
              title="Edit Place Details"
            >
              {stop.name}
              {stop.romanizedName && stop.romanizedName.toLowerCase() !== stop.name.toLowerCase() && (
                <span className="ml-1.5 text-xs font-normal text-surface-500 dark:text-surface-400 italic">
                  ({stop.romanizedName})
                </span>
              )}
            </button>
            <div className="flex items-center gap-1 shrink-0">
              {timeConflict.hasConflict && (
                <div 
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold border border-red-200 dark:border-red-800"
                  title={timeConflict.reason}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span className="hidden sm:inline">Closed</span>
                </div>
              )}
              {/* Pin Toggle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updatePlace(stop.id, { pinnedToDay: !stop.pinnedToDay });
                }}
                className={`p-1 rounded transition-colors ${
                  stop.pinnedToDay
                    ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                    : "text-surface-300 dark:text-surface-600 hover:text-amber-600 dark:hover:text-amber-400 opacity-0 group-hover:opacity-100 hover:bg-surface-100 dark:hover:bg-surface-700"
                }`}
                title={stop.pinnedToDay ? "Pinned to this day (click to unpin)" : "Pin to this day (prevent optimizer from moving)"}
                aria-label={stop.pinnedToDay ? "Unpin stop from this day" : "Pin stop to this day"}
              >
                <Pin className={`w-3.5 h-3.5 ${stop.pinnedToDay ? "fill-current" : ""}`} />
              </button>
              {/* Remove from day Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  unassignPlace(stop.id);
                }}
                className="p-1 text-surface-300 dark:text-surface-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Remove from day"
                aria-label="Remove stop from day"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap relative">
            {/* Arrival Time Badge / Custom Time Lock Button */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTempTime(stop.customTime || formatMinutesTo24h(stopArrivalTime));
                  setIsTimeModalOpen((prev) => !prev);
                }}
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded flex items-center gap-1 transition-all border ${
                  isCustomTime
                    ? "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700/80 shadow-2xs hover:bg-purple-200/80 dark:hover:bg-purple-900/60"
                    : "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-transparent hover:border-primary-300"
                }`}
                title={
                  isCustomTime
                    ? `Locked reservation time at ${formatTimeString(stop.customTime)}. Click to edit or unlock.`
                    : "Calculated arrival time. Click to lock custom reservation time."
                }
              >
                {isCustomTime && <Lock className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400 shrink-0" />}
                <span>{isCustomTime ? formatTimeString(stop.customTime) : formatTime(stopArrivalTime)}</span>
                {isCustomTime && <span className="text-[9px] font-semibold opacity-75 uppercase">Reserved</span>}
              </button>

              {/* Time Lock Popover */}
              {isTimeModalOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTimeModalOpen(false);
                    }}
                  />
                  <div
                    className={`absolute left-0 ${
                      openUpward ? "bottom-full mb-2" : "top-full mt-2"
                    } z-50 w-72 bg-white dark:bg-surface-850 rounded-xl shadow-2xl border border-surface-200 dark:border-surface-700 p-3.5 text-surface-900 dark:text-white ring-1 ring-black/10 dark:ring-white/10`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-surface-100 dark:border-surface-700 mb-2.5">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-surface-900 dark:text-white">
                        <Lock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        Locked Reservation Time
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsTimeModalOpen(false)}
                        className="p-1 rounded text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-surface-600 dark:text-surface-300 mb-3 leading-snug">
                      Fix this place to an exact time. The optimizer will schedule other stops around it and will not move this place.
                    </p>

                    <div className="flex items-center gap-2 mb-3">
                      <label className="text-xs font-bold text-surface-600 dark:text-surface-300 uppercase shrink-0">Time:</label>
                      <input
                        type="time"
                        value={tempTime}
                        onChange={(e) => setTempTime(e.target.value)}
                        className="flex-1 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-100 dark:border-surface-700">
                      {isCustomTime ? (
                        <button
                          type="button"
                          onClick={async () => {
                            updatePlace(stop.id, { customTime: undefined });
                            setIsTimeModalOpen(false);
                            toast.info(`Removed locked time for ${stop.name}.`);
                            try {
                              await useRouteStore.getState().optimizeDay(dayIndex);
                            } catch (e) {
                              console.error("Failed to re-optimize day after unlocking time", e);
                            }
                          }}
                          className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline"
                        >
                          Unlock
                        </button>
                      ) : <span />}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsTimeModalOpen(false)}
                          className="px-2.5 py-1 text-xs font-semibold text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (tempTime) {
                              updatePlace(stop.id, { customTime: tempTime, pinnedToDay: true });
                              setIsTimeModalOpen(false);
                              toast.success(`Locked ${stop.name} to ${formatTimeString(tempTime)}.`);
                              try {
                                await useRouteStore.getState().optimizeDay(dayIndex);
                              } catch (e) {
                                console.error("Failed to re-optimize day after setting custom time", e);
                              }
                            }
                          }}
                          className="px-3 py-1 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-2xs transition-colors"
                        >
                          Lock Time
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Late Arrival Warning */}
            {isLate && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80"
                title={`Reservation is locked at ${formatTimeString(stop.customTime)}, but estimated arrival from previous stops is ${formatTime(stopArrivalTime)}`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Late by {lateMinutes}m</span>
              </span>
            )}

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
            className="absolute -left-6 top-5 -translate-y-1/2 p-1.5 text-surface-400 dark:text-surface-500 hover:text-surface-700 dark:hover:text-surface-200 cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-100 hover:opacity-100 transition-opacity touch-none"
            title="Drag to reorder"
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

  const isHeuristicTransit = segment.travelMode === "transit" && segment.isHeuristic !== false;

  const getModeIcon = () => {
    switch (segment.travelMode) {
      case "walking":
        return <Footprints className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case "transit":
        return <Train className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />;
      case "driving":
      default:
        return <Car className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="pt-0 pb-3 pl-12 relative group">
      {/* Line connector segment - always full height for segments as they are intermediate */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-surface-200 dark:bg-surface-700/50" />
      <div
        className={`travel-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer relative overflow-hidden shadow-2xs ${
          isHeuristicTransit
            ? "bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/70 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60"
            : "bg-surface-50 hover:bg-surface-100 dark:bg-surface-700/90 dark:hover:bg-surface-600 border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-100"
        }`}
        title={
          isHeuristicTransit
            ? `Estimated Transit: Live transit APIs return ZERO_RESULTS for Japan transit or are offline. Time is estimated geometrically (~${distanceUnit === "imperial" ? "11 mph local / ~101 mph express" : "18 km/h local / ~162 km/h express"}) without real-time train timetables or megastation transfer times.`
            : "Click to change travel mode (Driving, Transit, Walking)"
        }
      >
        {getModeIcon()}
        <span className="font-semibold text-surface-900 dark:text-surface-100">{Math.round(segment.time / 60)} min</span>

        <span className="text-surface-300 dark:text-surface-500 mx-0.5">•</span>
        <span className="text-surface-600 dark:text-surface-300">
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

        <ChevronDown className="w-3.5 h-3.5 text-surface-400 dark:text-surface-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ml-0.5 shrink-0" />

        <select
          value={segment.travelMode || "driving"}
          onChange={handleModeChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
          title="Change travel mode for this segment"
        >
          <option value="driving" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-white py-1">
            🚗 Driving
          </option>
          <option value="transit" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-white py-1">
            🚆 Transit
          </option>
          <option value="walking" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-white py-1">
            🚶 Walking
          </option>
        </select>
      </div>
    </div>
  );
});


export const DailySchedule: React.FC = () => {
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [optimizingDayIndex, setOptimizingDayIndex] = useState<number | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const {
    optimizedRoutes,
    optimizeDay,
    unassignPlace,
    updatePlace,
    reorderDayStops,
    startDate,
    dateMode,
    dayStartTime,
    dayEndTime,
    showFlights,
    arrivalFlight,
    departureFlight,
    distanceUnit,
  } = useRouteStore();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const hasHeuristicTransit = optimizedRoutes.some((r) =>
    r.segments.some((s) => s.travelMode === "transit" && s.isHeuristic !== false)
  );

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
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">
            Optimized Schedule
          </h2>

          {hasHeuristicTransit && (
            <button
              onClick={() => setIsBannerDismissed((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                !isBannerDismissed
                  ? "bg-amber-100/90 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/80 shadow-2xs hover:bg-amber-200/80 dark:hover:bg-amber-900/70"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/80 hover:bg-amber-100/80 dark:hover:bg-amber-900/60 shadow-2xs"
              }`}
              title={
                isBannerDismissed
                  ? "Click to view notice: Why are transit times orange & estimated?"
                  : "Click to hide transit notice"
              }
              aria-label="Toggle orange transit notice"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Orange Transit = Estimated</span>
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-200/70 dark:bg-amber-900/70 px-1.5 py-0.5 rounded-full">
                {!isBannerDismissed ? "Hide Notice" : "Why?"}
              </span>
            </button>
          )}
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

      {/* Heuristic Transit Inaccurate Times Warning Banner */}
      {hasHeuristicTransit && !isBannerDismissed && (
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl border border-amber-300 dark:border-amber-700/80 bg-gradient-to-r from-amber-50 to-orange-50/60 dark:from-amber-950/50 dark:to-orange-950/30 text-amber-950 dark:text-amber-200 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-100">
                ⚠ Transit times are estimated — actual durations may differ significantly.
              </p>
            </div>
            <button
              onClick={() => setIsBannerDismissed(true)}
              className="p-1.5 rounded-xl text-amber-700 dark:text-amber-400 hover:bg-amber-200/60 dark:hover:bg-amber-900/60 transition-colors shrink-0"
              title="Dismiss notice"
              aria-label="Dismiss heuristic transit notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <details className="mt-2">
            <summary className="text-[11px] sm:text-xs font-bold text-amber-800 dark:text-amber-300 cursor-pointer hover:text-amber-950 dark:hover:text-amber-100 transition-colors select-none">
              Why this happens
            </summary>
            <p className="mt-1.5 text-[11px] sm:text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed pl-1">
              Google Maps developer APIs return <code className="font-mono text-[10px] bg-amber-200/70 dark:bg-amber-900/70 px-1 py-0.5 rounded font-bold">ZERO_RESULTS</code> for Japan transit due to commercial licensing. Times are approximated geometrically (~{distanceUnit === "imperial" ? "11 mph local / ~101 mph express" : "18 km/h local / ~162 km/h express"}) without real timetables, departure intervals, or megastation transfer walks. Cross-check with local transit apps (NAVITIME, Jorudan) on your travel day.{" "}
              <button
                onClick={() => { window.location.hash = "#about-limitations"; }}
                className="inline font-bold text-amber-950 dark:text-amber-100 underline underline-offset-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                More details →
              </button>
            </p>
          </details>
        </div>
      )}


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
          const dayHasHeuristicTransit = route.segments.some(
            (s) => s.travelMode === "transit" && s.isHeuristic !== false
          );
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
                        {dayHasHeuristicTransit && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700/80 px-1 py-0.2 rounded"
                            title="Day travel duration contains heuristic transit estimates"
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                            <span>~Heuristic</span>
                          </span>
                        )}
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

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pl-8 pr-4 py-4 space-y-0 relative">
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
                            let preBufferPill = null;

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
                                let stopArrivalTime = currentTime;
                                if (stop.customTime) {
                                  const customMin = parseTimeToMinutes(stop.customTime);
                                  if (customMin > currentTime) {
                                    const idleMin = customMin - currentTime;
                                    preBufferPill = (
                                      <BufferPill
                                        key={`buffer-${stop.id}`}
                                        minutes={idleMin}
                                        label={`${idleMin} min free time before reservation`}
                                        isReservation
                                        showLine={!isFirst}
                                      />
                                    );
                                    currentTime = customMin;
                                  }
                                }

                                element = (
                                  <SortableStop
                                    key={stop.id}
                                    stop={stop}
                                    stopIdx={idx}
                                    stopArrivalTime={stopArrivalTime}
                                    isFirst={isFirst}
                                    isLast={isLast}
                                    unassignPlace={unassignPlace}
                                    updatePlace={updatePlace}
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
                                {preBufferPill}
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
