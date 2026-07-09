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
} from "lucide-react";

import { ImportModal } from "../trip-builder/ImportModal";
import { CategorySettingsModal } from "./CategorySettingsModal";
import { LoadTripModal } from "./LoadTripModal";

export const Header: React.FC = () => {
  const { appMode, setAppMode, title, setTitle, saveTrip, places, theme, setTheme, showImages, setShowImages } =
    useRouteStore();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLoadOpen, setIsLoadOpen] = useState(false);
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    saveTrip();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExportTxt = () => {
    const textContent = places
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
  };

  const handleExportNamesTxt = () => {
    const textContent = places.map((p) => p.name).join("\n");
    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RE-ROUTE_Import_${title.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
            className={`appearance-none flex items-center gap-2 pl-4 pr-10 py-2 rounded-full text-sm font-medium transition-colors border cursor-pointer outline-none focus:ring-2 focus:ring-primary-500 ${
              appMode === "real"
                ? "bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 border-surface-200 dark:border-surface-600"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/50"
            }`}
          >
            <option value="real">Real Mode</option>
            <option value="mock">Mock Mode</option>
            <option value="dropdown-mock">Dropdown Mock Mode</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {appMode === "real" ? (
              <Moon className="w-4 h-4 text-surface-400 dark:text-surface-500" />
            ) : (
              <Sun className="w-4 h-4 text-amber-600 dark:text-amber-500" />
            )}
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
          className={`flex items-center gap-2 font-medium text-sm transition-colors ${
            isSaved
              ? "text-green-600 dark:text-green-500"
              : "text-surface-600 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400"
          }`}
        >
          {isSaved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaved ? "Saved!" : "Save"}
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
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>

          {/* Dropdown for TXT export on hover */}
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-surface-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden flex flex-col">
            <button
              onClick={handleExportTxt}
              className="w-full text-left px-4 py-3 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-600 flex items-center gap-2 transition-colors font-medium border-b border-surface-100"
            >
              <FileText className="w-4 h-4 shrink-0" />
              Export Full Details
            </button>
            <button
              onClick={handleExportNamesTxt}
              className="w-full text-left px-4 py-3 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-600 flex items-center gap-2 transition-colors font-medium"
            >
              <List className="w-4 h-4 shrink-0" />
              Export Names Only (For Import)
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
};
