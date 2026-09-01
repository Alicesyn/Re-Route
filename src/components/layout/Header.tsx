import React, { useState } from "react";
import { useRouteStore } from "../../store/useRouteStore";
import {
  Map,
  Download,
  Save,
  Moon,
  Sun,
  Upload,
  FolderOpen,
  Check,
  FileText,
  Image,
  ImageOff,
  List,
  Settings,
  ChevronDown,
  FileJson,
  Loader2,
} from "lucide-react";

import { ImportModal } from "../trip-builder/ImportModal";
import { CategorySettingsModal } from "./CategorySettingsModal";
import { LoadTripModal } from "./LoadTripModal";
import { toast } from "../../services/toastService";

export const Header: React.FC = React.memo(() => {
  const appMode = useRouteStore((s) => s.appMode);
  const setAppMode = useRouteStore((s) => s.setAppMode);
  const title = useRouteStore((s) => s.title);
  const setTitle = useRouteStore((s) => s.setTitle);
  const saveTrip = useRouteStore((s) => s.saveTrip);
  const exportTripAsJson = useRouteStore((s) => s.exportTripAsJson);
  const theme = useRouteStore((s) => s.theme);
  const setTheme = useRouteStore((s) => s.setTheme);
  const showImages = useRouteStore((s) => s.showImages);
  const setShowImages = useRouteStore((s) => s.setShowImages);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLoadOpen, setIsLoadOpen] = useState(false);
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 200));
      saveTrip();
      setIsSaving(false);
      setIsSaved(true);
      toast.success(`"${title || "Trip"}" saved to your trips!`, "Trip Saved");
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err: any) {
      setIsSaving(false);
      toast.error(err?.message || "Failed to save trip", "Save Error");
    }
  };

  const handleExportTripJson = () => {
    try {
      exportTripAsJson();
      toast.success(`Exported "${title || "Trip"}" to JSON file.`, "Export Complete");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export trip file", "Export Error");
    }
  };

  const handleExportTxt = () => {
    try {
      const placesList = useRouteStore.getState().places;
      const textContent = placesList
        .map((p, i) => `${i + 1}. ${p.name}\n   ${p.address}`)
        .join("\n\n");
      const blob = new Blob([`Places to Visit - ${title}\n\n${textContent}`], {
        type: "text/plain",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Wanderlog_Places_${title.replace(/\s+/g, "_")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Places list exported to text file.", "Export Complete");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export text file", "Export Error");
    }
  };

  const handleExportNamesTxt = () => {
    try {
      const placesList = useRouteStore.getState().places;
      const textContent = placesList.map((p) => p.name).join("\n");
      const blob = new Blob([textContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RE-ROUTE_Import_${title.replace(/\s+/g, "_")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Place names exported to text file.", "Export Complete");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export names file", "Export Error");
    }
  };



  return (
    <header className="bg-white dark:bg-surface-800 border-b border-gray-200 dark:border-surface-700 px-6 py-4 flex items-center justify-between sticky top-0 z-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="bg-primary-500 p-2 rounded-lg">
          <Map className="text-white w-6 h-6" />
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight bg-transparent border-none outline-none focus:ring-0 focus:border-b focus:border-primary-500 transition-all p-0 w-64"
          placeholder="Trip Title..."
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <select
            value={appMode}
            onChange={(e) =>
              setAppMode(e.target.value as "real" | "mock" | "dropdown-mock")
            }
            className={`appearance-none flex items-center gap-2 pl-4 pr-9 py-2 rounded-full text-sm font-medium transition-colors border cursor-pointer outline-none focus:ring-2 focus:ring-primary-500 ${
              appMode === "real"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/50"
            }`}
          >
            <option value="real">🌐 Real Mode (Live APIs)</option>
            <option value="mock">⚡ Mock Mode</option>
            <option value="dropdown-mock">📋 Dropdown Mock Mode</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown className="w-4 h-4 text-surface-400 dark:text-surface-500" />
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700"
        >
          {theme === "dark" ? (
            <>
              <Moon className="w-4 h-4 text-surface-400 dark:text-surface-500" />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              <span>Light Mode</span>
            </>
          )}
        </button>

        <button
          onClick={() => setIsCategorySettingsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700"
        >
          <Settings className="w-4 h-4 text-surface-400 dark:text-surface-500" />
          <span>Settings</span>
        </button>

        {/* Images Toggle */}
        <button
          onClick={() => setShowImages(!showImages)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700"
        >
          {showImages ? (
            <>
              <Image className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
              <span>Images On</span>
            </>
          ) : (
            <>
              <ImageOff className="w-4 h-4 text-surface-400 dark:text-surface-500" />
              <span>Images Off</span>
            </>
          )}
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 font-medium text-sm transition-all ${
            isSaved
              ? "text-emerald-600 dark:text-emerald-400 font-bold"
              : isSaving
                ? "text-primary-600 dark:text-primary-400 opacity-80 cursor-wait"
                : "text-surface-600 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400"
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
          ) : isSaved ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? "Saving..." : isSaved ? "Saved!" : "Save"}
        </button>

        <button
          onClick={() => setIsLoadOpen(true)}
          className="flex items-center gap-2 text-surface-600 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium text-sm transition-colors"
        >
          <FolderOpen className="w-4 h-4" /> Load
        </button>

        <button
          onClick={() => setIsImportOpen(true)}
          className="flex items-center gap-2 text-surface-600 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium text-sm transition-colors"
        >
          <Upload className="w-4 h-4" /> Import
        </button>

        <div className="relative group">
          <button
            onClick={handleExportTripJson}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export
            <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
          </button>

          {/* Dropdown for export formats on hover */}
          <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden flex flex-col">
            <button
              onClick={handleExportTripJson}
              className="w-full text-left px-4 py-3 text-sm text-surface-800 dark:text-surface-100 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 dark:hover:text-primary-400 flex items-start gap-3 transition-colors border-b border-surface-100 dark:border-surface-700"
            >
              <FileJson className="w-4 h-4 shrink-0 mt-0.5 text-primary-500" />
              <div>
                <div className="font-semibold flex items-center gap-1.5">
                  Export Entire Trip (.json)
                  <span className="text-[9px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded">
                    Full
                  </span>
                </div>
                <div className="text-[11px] text-surface-500 dark:text-surface-400">
                  PTVs, Stay, Schedule, Flights & Settings
                </div>
              </div>
            </button>

            <button
              onClick={() => window.print()}
              className="w-full text-left px-4 py-2.5 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-3 transition-colors border-b border-surface-100 dark:border-surface-700 font-medium"
            >
              <Download className="w-4 h-4 shrink-0 text-surface-400" />
              Export PDF / Print
            </button>

            <button
              onClick={handleExportTxt}
              className="w-full text-left px-4 py-2.5 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-3 transition-colors border-b border-surface-100 dark:border-surface-700 font-medium"
            >
              <FileText className="w-4 h-4 shrink-0 text-surface-400" />
              Export Text (Full Details)
            </button>

            <button
              onClick={handleExportNamesTxt}
              className="w-full text-left px-4 py-2.5 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-3 transition-colors font-medium"
            >
              <List className="w-4 h-4 shrink-0 text-surface-400" />
              Export Place Names List
            </button>
          </div>
        </div>
      </div>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
      <LoadTripModal
        isOpen={isLoadOpen}
        onClose={() => setIsLoadOpen(false)}
      />
      
      <CategorySettingsModal
        isOpen={isCategorySettingsOpen}
        onClose={() => setIsCategorySettingsOpen(false)}
      />
    </header>
  );
});


