import React, { useState, useEffect } from "react";
import { X, MapPin, Timer, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { useRouteStore } from "../../store/useRouteStore";
import { ALL_CATEGORIES, getCategoryEmoji, getCategoryLabel, getDefaultDuration } from "../../utils/categoryUtils";
import { PlaceCategory } from "../../types";
import { summarizePlace } from "../../services/aiService";

interface Props {
  placeId: string;
  onClose: () => void;
}

export const EditPlaceModal: React.FC<Props> = ({ placeId, onClose }) => {
  const { places, updatePlace, appMode } = useRouteStore();
  const place = places.find((p) => p.id === placeId);
  
  const [desc, setDesc] = useState("");
  const [durationVal, setDurationVal] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("other");
  const [romanizedName, setRomanizedName] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    if (place) {
      setDesc(place.description || "");
      setDurationVal((place.estimatedDuration ?? 60).toString());
      setCategory(place.category);
      setRomanizedName(place.romanizedName || "");
    }
  }, [place]);

  if (!place) return null;

  const handleSave = () => {
    const parsedDuration = parseInt(durationVal);
    const finalDuration = (!isNaN(parsedDuration) && parsedDuration > 0) ? parsedDuration : place.estimatedDuration;
    
    updatePlace(place.id, {
      description: desc,
      descriptionSource: desc !== place.description ? "user" : place.descriptionSource,
      estimatedDuration: finalDuration,
      category,
      romanizedName: romanizedName.trim() || undefined,
    });
    onClose();
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value as PlaceCategory;
    setCategory(newCat);
    setDurationVal(getDefaultDuration(newCat).toString());
  };

  const handleGenerate = async () => {
    setIsGeneratingAI(true);
    try {
      let aiData;
      if (appMode === "real") {
        aiData = await summarizePlace(
          place.name,
          place.address,
          (place as any).types || []
        );
      } else {
        aiData = {
          description: `[MOCK AI] Comma separated mock summary of ${place.name}.`,
          category: place.category,
          estimatedDuration: place.estimatedDuration,
        };
      }
      setDesc(aiData.description);
      setCategory(aiData.category);
      setDurationVal(aiData.estimatedDuration.toString());
      if (aiData.romanizedName) {
        setRomanizedName(aiData.romanizedName);
      }
    } catch (err) {
      console.error(err);
      if (place.editorialSummary) {
        setDesc(place.editorialSummary);
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const currentRomanized = romanizedName || place.romanizedName;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-black text-surface-900 dark:text-white flex items-center gap-2 truncate">
              <MapPin className="w-5 h-5 text-primary-500 shrink-0" />
              <span className="truncate">{place.name}</span>
              {currentRomanized && currentRomanized.toLowerCase() !== place.name.toLowerCase() && (
                <span className="text-xs font-normal text-surface-500 dark:text-surface-400 italic shrink-0">
                  ({currentRomanized})
                </span>
              )}
            </h2>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 truncate">
              {place.address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider flex items-center justify-between">
              <span>Romanized / English Name</span>
              <span className="text-[10px] text-surface-400 font-normal lowercase">(optional, for foreign scripts)</span>
            </label>
            <input
              type="text"
              value={romanizedName}
              onChange={(e) => setRomanizedName(e.target.value)}
              placeholder="e.g. Senso-ji, Wat Phra Kaew"
              className="w-full text-sm font-medium bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={handleCategoryChange}
                className="w-full text-sm font-medium bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryEmoji(cat)} {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" /> Duration (min)
              </label>
              <input
                type="number"
                min="5"
                value={durationVal}
                onChange={(e) => setDurationVal(e.target.value)}
                className="w-full text-sm font-medium bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                Description
              </label>
              <button
                onClick={handleGenerate}
                disabled={isGeneratingAI}
                className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded transition-colors disabled:opacity-50"
              >
                {isGeneratingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isGeneratingAI ? "Generating..." : "AI Describe"}
              </button>
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full text-sm text-surface-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none h-24 custom-scrollbar"
              placeholder="Add a description..."
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/80 flex items-center justify-between gap-3">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + place.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 border border-surface-200 dark:border-surface-600 px-3 py-2 rounded-lg transition-all"
            title="View on Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View on Google
          </a>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
