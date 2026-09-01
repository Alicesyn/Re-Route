import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { PlaceItem } from "./PlaceItem";
import { useRouteStore } from "../../store/useRouteStore";
import { ALL_CATEGORIES, getCategoryLabel, getCategoryEmoji } from "../../utils/categoryUtils";
import { PlaceCategory } from "../../types";

interface PlaceListProps {
  isExpanded: boolean;
}

type FilterTab = "all" | "unassigned";

export const PlaceList: React.FC<PlaceListProps> = React.memo(({ isExpanded }) => {
  const places = useRouteStore((s) => s.places);
  const reorderPlaces = useRouteStore((s) => s.reorderPlaces);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<PlaceCategory | "all">("all");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts, allows clicking inner elements
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = places.findIndex((p) => p.id === active.id);
      const newIndex = places.findIndex((p) => p.id === over.id);
      reorderPlaces(arrayMove(places, oldIndex, newIndex));
    }
  };

  const baseFilteredPlaces = useMemo(() => {
    let list = places;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.address?.toLowerCase().includes(query),
      );
    }
    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category === categoryFilter);
    }
    return list;
  }, [places, searchQuery, categoryFilter]);

  const allCount = baseFilteredPlaces.length;
  const unassignedCount = useMemo(
    () => baseFilteredPlaces.filter((p) => p.dayIndex === null).length,
    [baseFilteredPlaces],
  );

  const filteredPlaces = useMemo(() => {
    return activeTab === "unassigned"
      ? baseFilteredPlaces.filter((p) => p.dayIndex === null)
      : baseFilteredPlaces;
  }, [baseFilteredPlaces, activeTab]);

  const sortableItemIds = useMemo(
    () => filteredPlaces.map((p) => p.id),
    [filteredPlaces],
  );


  if (places.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-white dark:bg-surface-800 border border-dashed border-surface-300 dark:border-surface-600 rounded-xl">
        <p className="text-surface-500 dark:text-surface-400">
          No places added yet. Search above to add places to your itinerary!
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-1 mb-3 bg-surface-100 dark:bg-surface-900/50 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 text-xs font-semibold py-1.5 px-3 rounded-md transition-all ${
            activeTab === "all"
              ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm"
              : "text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
          }`}
        >
          All <span className="ml-1 opacity-60">({allCount})</span>
        </button>
        <button
          onClick={() => setActiveTab("unassigned")}
          className={`flex-1 text-xs font-semibold py-1.5 px-3 rounded-md transition-all ${
            activeTab === "unassigned"
              ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm"
              : "text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
          }`}
        >
          Unassigned
          {unassignedCount > 0 && (
            <span
              className={`ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full px-1 ${
                activeTab === "unassigned"
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  : "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300"
              }`}
            >
              {unassignedCount}
            </span>
          )}
        </button>
      </div>

      {/* PTV Search & Filter */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 w-3.5 h-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search added places..."
            className="w-full h-9 text-xs bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg pl-8 pr-3 text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as PlaceCategory | "all")}
          className="h-9 shrink-0 text-xs bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-2 text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="all">All Categories</option>
          {ALL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {getCategoryEmoji(cat)} {getCategoryLabel(cat)}
            </option>
          ))}
        </select>
      </div>

      {filteredPlaces.length === 0 ? (
        <div className="text-center py-8 px-4 bg-white dark:bg-surface-800 border border-dashed border-surface-300 dark:border-surface-600 rounded-xl">
          <p className="text-surface-500 dark:text-surface-400 text-sm">
            {activeTab === "unassigned"
              ? "All places are assigned to a day!"
              : "No places match this filter."}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableItemIds}
            strategy={rectSortingStrategy}
          >
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300 ${isExpanded ? "" : "max-h-[360px] overflow-y-auto pr-2 custom-scrollbar"} print:max-h-none print:overflow-visible print:grid-cols-1`}
            >
              {filteredPlaces.map((place) => (
                <div key={place.id} className="h-full">
                  <PlaceItem place={place} />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
});

