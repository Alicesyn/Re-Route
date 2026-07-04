import React, { useEffect, useState } from "react";
import { Settings, Timer, X, Maximize2, Minimize2, ChevronDown, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { useRouteStore } from "../../store/useRouteStore";
import { ALL_CATEGORIES } from "../../utils/categoryConstants";
import { getCategoryEmoji, getCategoryLabel } from "../../utils/categoryUtils";
import { PlaceCategory, CategoryConfig, CategoryDayOverride } from "../../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CategorySettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { categoryDurations, setCategoryDuration, categoryConfigs, setCategoryConfig, applyCategoryDurationsToPlaces } = useRouteStore();

  // Local state for inputs to allow empty strings while typing
  const [localDurations, setLocalDurations] = useState<Record<string, string>>({});
  const [localMin, setLocalMin] = useState<Record<string, string>>({});
  const [localMax, setLocalMax] = useState<Record<string, string>>({});
  const [localFirstMin, setLocalFirstMin] = useState<Record<string, string>>({});
  const [localFirstMax, setLocalFirstMax] = useState<Record<string, string>>({});
  const [localLastMin, setLocalLastMin] = useState<Record<string, string>>({});
  const [localLastMax, setLocalLastMax] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Sync with store on open
  useEffect(() => {
    if (isOpen) {
      setLocalDurations({});
      setLocalMin({});
      setLocalMax({});
      setLocalFirstMin({});
      setLocalFirstMax({});
      setLocalLastMin({});
      setLocalLastMax({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleExpanded = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleDurationChange = (category: PlaceCategory, value: string) => {
    setLocalDurations((prev) => ({ ...prev, [category]: value }));
    const duration = parseInt(value, 10);
    if (!isNaN(duration) && duration >= 5) {
      setCategoryDuration(category, duration);
    }
  };

  const handleMinChange = (category: PlaceCategory, value: string) => {
    setLocalMin((prev) => ({ ...prev, [category]: value }));
    if (value === "") {
      setCategoryConfig(category, { minPerDay: null });
    } else {
      const min = parseInt(value, 10);
      if (!isNaN(min) && min >= 0) setCategoryConfig(category, { minPerDay: min });
    }
  };

  const handleMaxChange = (category: PlaceCategory, value: string) => {
    setLocalMax((prev) => ({ ...prev, [category]: value }));
    if (value === "") {
      setCategoryConfig(category, { maxPerDay: null });
    } else {
      const max = parseInt(value, 10);
      if (!isNaN(max) && max >= 0) setCategoryConfig(category, { maxPerDay: max });
    }
  };

  const handleOverrideChange = (
    category: PlaceCategory,
    dayType: "firstDayOverride" | "lastDayOverride",
    field: keyof CategoryDayOverride,
    value: string,
    setLocal: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  ) => {
    setLocal((prev) => ({ ...prev, [category]: value }));
    const existing = categoryConfigs?.[category]?.[dayType] || {};
    if (value === "") {
      setCategoryConfig(category, { [dayType]: { ...existing, [field]: null } });
    } else {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 0) {
        setCategoryConfig(category, { [dayType]: { ...existing, [field]: num } });
      }
    }
  };

  const handleBlurDuration = (category: PlaceCategory) => {
    const val = localDurations[category];
    if (val !== undefined) {
      const duration = parseInt(val, 10);
      if (isNaN(duration) || duration < 5) {
        setLocalDurations((prev) => {
          const newVals = { ...prev };
          delete newVals[category];
          return newVals;
        });
      }
    }
  };

  const overrideInputClass = "w-14 px-2 py-1 text-xs font-bold text-center bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50">
          <div>
            <h2 className="text-xl font-black text-surface-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-500" />
              Category Settings
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
              Configure default visit durations and daily limits. Expand a category to set first/last day exceptions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-grow no-scrollbar">

          <div className="grid grid-cols-12 gap-4 pb-3 border-b border-surface-200 dark:border-surface-700 text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-surface-800 z-10 pt-6 px-6">
            <div className="col-span-4">Category</div>
            <div className="col-span-3 text-center flex items-center justify-center gap-1"><Timer className="w-3 h-3"/> Default Duration</div>
            <div className="col-span-2 text-center flex items-center justify-center gap-1"><Minimize2 className="w-3 h-3"/> Min/Day</div>
            <div className="col-span-3 text-center flex items-center justify-center gap-1"><Maximize2 className="w-3 h-3"/> Max/Day</div>
          </div>

          <div className="mt-2 space-y-1 px-6 pb-6">
            {ALL_CATEGORIES.map((category) => {
              const config = categoryConfigs[category] || {} as CategoryConfig;
              const isExpanded = expandedCategories.has(category);
              const firstOverride = config.firstDayOverride || {};
              const lastOverride = config.lastDayOverride || {};
              const hasOverrides =
                firstOverride.minPerDay != null || firstOverride.maxPerDay != null ||
                lastOverride.minPerDay != null || lastOverride.maxPerDay != null;

              return (
                <div key={category} className="rounded-xl overflow-hidden">
                  {/* Main category row */}
                  <div className="grid grid-cols-12 gap-4 items-center p-3 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors group">
                    <div className="col-span-4 flex items-center gap-2">
                      <button
                        onClick={() => toggleExpanded(category)}
                        className="flex items-center gap-2 min-w-0"
                        title="Toggle day exceptions"
                      >
                        <div className="w-8 h-8 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform shrink-0">
                          {getCategoryEmoji(category)}
                        </div>
                        <span className="text-sm font-semibold text-surface-700 dark:text-surface-200 truncate">
                          {getCategoryLabel(category)}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 shrink-0 transition-transform text-surface-400 ${isExpanded ? "rotate-180" : ""} ${hasOverrides ? "text-primary-500" : ""}`}
                        />
                      </button>
                      {hasOverrides && !isExpanded && (
                        <span className="text-[9px] font-black uppercase tracking-wide text-primary-500 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded-full shrink-0">
                          Exceptions
                        </span>
                      )}
                    </div>

                    {/* Duration Input */}
                    <div className="col-span-3 flex justify-center">
                      <div className="relative">
                        <input
                          type="number"
                          min="5"
                          step="5"
                          value={localDurations[category] ?? categoryDurations?.[category] ?? 60}
                          onChange={(e) => handleDurationChange(category, e.target.value)}
                          onBlur={() => handleBlurDuration(category)}
                          className="w-20 px-3 py-1.5 text-sm font-bold text-center bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-900 dark:text-white"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-surface-400 pointer-events-none">m</span>
                      </div>
                    </div>

                    {/* Min Per Day Input */}
                    <div className="col-span-2 flex justify-center">
                      <input
                        type="number"
                        min="0"
                        placeholder="—"
                        value={localMin[category] ?? (config.minPerDay != null ? config.minPerDay : "")}
                        onChange={(e) => handleMinChange(category, e.target.value)}
                        className="w-16 px-2 py-1.5 text-sm font-bold text-center bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600"
                      />
                    </div>

                    {/* Max Per Day Input */}
                    <div className="col-span-3 flex justify-center items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="—"
                        value={localMax[category] ?? (config.maxPerDay != null ? config.maxPerDay : "")}
                        onChange={(e) => handleMaxChange(category, e.target.value)}
                        className="w-16 px-2 py-1.5 text-sm font-bold text-center bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600"
                      />
                    </div>
                  </div>

                  {/* Expanded day exception rows */}
                  {isExpanded && (
                    <div className="bg-surface-50/70 dark:bg-surface-900/40 border border-surface-100 dark:border-surface-700/50 rounded-xl mx-2 mb-2 overflow-hidden divide-y divide-surface-100 dark:divide-surface-700/50">
                      {/* Column header */}
                      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-surface-400">
                        <div className="col-span-4">Day Type</div>
                        <div className="col-span-4 text-center">Min/Day Override</div>
                        <div className="col-span-4 text-center">Max/Day Override</div>
                      </div>

                      {/* First Day row */}
                      <div className="grid grid-cols-12 gap-4 items-center px-4 py-2.5">
                        <div className="col-span-4 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                            <PlaneTakeoff className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-xs font-bold text-surface-700 dark:text-surface-300">First Day</span>
                        </div>
                        <div className="col-span-4 flex justify-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="inherit"
                            value={localFirstMin[category] ?? (firstOverride.minPerDay != null ? firstOverride.minPerDay : "")}
                            onChange={(e) =>
                              handleOverrideChange(category, "firstDayOverride", "minPerDay", e.target.value, setLocalFirstMin)
                            }
                            className={`${overrideInputClass} focus:ring-emerald-500`}
                          />
                        </div>
                        <div className="col-span-4 flex justify-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="inherit"
                            value={localFirstMax[category] ?? (firstOverride.maxPerDay != null ? firstOverride.maxPerDay : "")}
                            onChange={(e) =>
                              handleOverrideChange(category, "firstDayOverride", "maxPerDay", e.target.value, setLocalFirstMax)
                            }
                            className={`${overrideInputClass} focus:ring-emerald-500`}
                          />
                        </div>
                      </div>

                      {/* Last Day row */}
                      <div className="grid grid-cols-12 gap-4 items-center px-4 py-2.5">
                        <div className="col-span-4 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                            <PlaneLanding className="w-3 h-3 text-red-600 dark:text-red-400" />
                          </div>
                          <span className="text-xs font-bold text-surface-700 dark:text-surface-300">Last Day</span>
                        </div>
                        <div className="col-span-4 flex justify-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="inherit"
                            value={localLastMin[category] ?? (lastOverride.minPerDay != null ? lastOverride.minPerDay : "")}
                            onChange={(e) =>
                              handleOverrideChange(category, "lastDayOverride", "minPerDay", e.target.value, setLocalLastMin)
                            }
                            className={`${overrideInputClass} focus:ring-red-500`}
                          />
                        </div>
                        <div className="col-span-4 flex justify-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="inherit"
                            value={localLastMax[category] ?? (lastOverride.maxPerDay != null ? lastOverride.maxPerDay : "")}
                            onChange={(e) =>
                              handleOverrideChange(category, "lastDayOverride", "maxPerDay", e.target.value, setLocalLastMax)
                            }
                            className={`${overrideInputClass} focus:ring-red-500`}
                          />
                        </div>
                      </div>

                      <p className="px-4 py-2 text-[10px] text-surface-400 dark:text-surface-500 italic">
                        Leave blank to inherit the global limit. Set to 0 to block this category entirely on that day.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/80 flex justify-between items-center">
          <button
            onClick={() => {
              applyCategoryDurationsToPlaces();
              onClose();
            }}
            className="px-4 py-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
          >
            Apply to Current PTVs
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-full shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
