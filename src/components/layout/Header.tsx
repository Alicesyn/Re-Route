import React, { useState } from "react";
import { useRouteStore } from "../../store/useRouteStore";
import {
  Map,
  Download,
  Save,
  Upload,
  FolderOpen,
  Check,
  FileText,
  List,
  Settings,
  ChevronDown,
  FileJson,
  Loader2,
  Activity,
  Key,
  HelpCircle,
  RotateCcw,
} from "lucide-react";

const ImportModal = React.lazy(() =>
  import("../trip-builder/ImportModal").then((m) => ({ default: m.ImportModal }))
);
const CategorySettingsModal = React.lazy(() =>
  import("./CategorySettingsModal").then((m) => ({ default: m.CategorySettingsModal }))
);
const LoadTripModal = React.lazy(() =>
  import("./LoadTripModal").then((m) => ({ default: m.LoadTripModal }))
);
const ApiBudgetModal = React.lazy(() =>
  import("./ApiBudgetModal").then((m) => ({ default: m.ApiBudgetModal }))
);
const AboutModal = React.lazy(() =>
  import("./AboutModal").then((m) => ({ default: m.AboutModal }))
);
const ResetTripModal = React.lazy(() =>
  import("./ResetTripModal").then((m) => ({ default: m.ResetTripModal }))
);
import { toast } from "../../services/toastService";
import { apiUsageService, ApiUsageStats, ApiBudgetLimits } from "../../services/apiUsageService";

export const Header: React.FC = React.memo(() => {
  const appMode = useRouteStore((s) => s.appMode);
  const setAppMode = useRouteStore((s) => s.setAppMode);
  const title = useRouteStore((s) => s.title);
  const setTitle = useRouteStore((s) => s.setTitle);
  const saveTrip = useRouteStore((s) => s.saveTrip);
  const exportTripAsJson = useRouteStore((s) => s.exportTripAsJson);


  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLoadOpen, setIsLoadOpen] = useState(false);
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false);
  const [isApiBudgetOpen, setIsApiBudgetOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Sync #about and #about-limitations URL hash
  React.useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#about" || window.location.hash.startsWith("#about")) {
        setIsAboutOpen(true);
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  const handleCloseAbout = () => {
    setIsAboutOpen(false);
    if (window.location.hash.startsWith("#about")) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  const [apiStats, setApiStats] = useState<ApiUsageStats>(apiUsageService.getStats());
  const [apiLimits, setApiLimits] = useState<ApiBudgetLimits>(apiUsageService.getLimits());

  React.useEffect(() => {
    return apiUsageService.subscribe((stats) => {
      setApiStats(stats);
      setApiLimits(apiUsageService.getLimits());
    });
  }, []);

  const totalMaps = apiStats.mapsSearchCalls + apiStats.mapsPhotoCalls + apiStats.mapsRouteCalls;
  const mapsPercent = Math.min(100, Math.round((totalMaps / apiLimits.dailyMapsLimit) * 100));
  const geminiPercent = Math.min(100, Math.round((apiStats.geminiCalls / apiLimits.dailyGeminiLimit) * 100));
  const maxPercent = Math.max(mapsPercent, geminiPercent);
  const hasCustomKey = apiUsageService.isUsingCustomMapsKey() || apiUsageService.isUsingCustomGeminiKey();


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
    <header className="bg-white dark:bg-surface-800 border-b border-gray-200 dark:border-surface-700 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between sticky top-0 z-50 transition-colors safe-pt flex-wrap gap-2 sm:gap-4">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="bg-primary-500 p-1.5 sm:p-2 rounded-lg shrink-0">
          <Map className="text-white w-5 h-5 sm:w-6 h-6" />
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg sm:text-2xl font-bold text-surface-900 dark:text-white tracking-tight bg-transparent border-none outline-none focus:ring-0 focus:border-b focus:border-primary-500 transition-all p-0 w-36 sm:w-64 truncate"
          placeholder="Trip Title..."
        />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
        <div className="relative">
          <select
            value={appMode}
            onChange={(e) =>
              setAppMode(e.target.value as "real" | "mock" | "dropdown-mock")
            }
            className={`appearance-none flex items-center gap-1.5 pl-3 pr-8 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors border cursor-pointer outline-none focus:ring-2 focus:ring-primary-500 ${
              appMode === "real"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/50"
            }`}
          >
            <option value="real">🌐 Real Mode</option>
            <option value="mock">⚡ Mock Mode</option>
            <option value="dropdown-mock">📋 Dropdown Mock</option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown className="w-3.5 h-3.5 text-surface-400 dark:text-surface-500" />
          </div>
        </div>

        {/* API Budget & Usage Button */}
        <button
          onClick={() => setIsApiBudgetOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all border outline-none focus:ring-2 focus:ring-primary-500 shadow-2xs ${
            hasCustomKey
              ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800/60 hover:bg-purple-100"
              : maxPercent >= 90
                ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800/60 hover:bg-red-100 animate-pulse"
                : maxPercent >= 70
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60 hover:bg-amber-100"
                  : "bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700"
          }`}
          title="Open API Usage & Budget Monitor / BYOK"
        >
          {hasCustomKey ? (
            <>
              <Key className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>BYOK Key</span>
            </>
          ) : (
            <>
              <span
                className={`w-2 h-2 rounded-full ${
                  maxPercent >= 90
                    ? "bg-red-500"
                    : maxPercent >= 70
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
              />
              <Activity className="w-3.5 h-3.5 text-surface-400 dark:text-surface-500" />
              <span className="hidden sm:inline">API Budget</span>
              <span>({maxPercent}%)</span>
            </>
          )}
        </button>

        <button
          onClick={() => setIsCategorySettingsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors border outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700"
          title="Trip Settings"
        >
          <Settings className="w-4 h-4 text-surface-400 dark:text-surface-500" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <button
          onClick={() => {
            setIsAboutOpen(true);
            window.location.hash = "about";
          }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors border outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700"
          title="About RE-ROUTE, Algorithms, Documentation & Open Source"
        >
          <HelpCircle className="w-4 h-4 text-surface-400 dark:text-surface-500" />
          <span className="hidden sm:inline">About</span>
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-1.5 font-medium text-xs sm:text-sm transition-all px-2 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 ${
            isSaved
              ? "text-emerald-600 dark:text-emerald-400 font-bold"
              : isSaving
                ? "text-primary-600 dark:text-primary-400 opacity-80 cursor-wait"
                : "text-surface-600 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400"
          }`}
          title="Save trip to device storage"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
          ) : isSaved ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{isSaving ? "Saving..." : isSaved ? "Saved!" : "Save"}</span>
        </button>

        <button
          onClick={() => setIsLoadOpen(true)}
          className="flex items-center gap-1.5 text-surface-600 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium text-xs sm:text-sm transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"
          title="Load saved trips"
        >
          <FolderOpen className="w-4 h-4" /> <span className="hidden sm:inline">Load</span>
        </button>

        <button
          onClick={() => setIsResetOpen(true)}
          className="flex items-center gap-1.5 text-surface-600 dark:text-surface-300 hover:text-red-600 dark:hover:text-red-400 font-medium text-xs sm:text-sm transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
          title="Reset current trip itinerary"
        >
          <RotateCcw className="w-4 h-4 text-surface-400 dark:text-surface-500 hover:text-red-500" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          onClick={() => setIsImportOpen(true)}
          className="flex items-center gap-1.5 text-surface-600 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium text-xs sm:text-sm transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"
          title="Import trip from Wanderlog, Google Maps, or CSV"
        >
          <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Import</span>
        </button>

        <div className="relative group">
          <button
            onClick={handleExportTripJson}
            className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs sm:text-sm"
          >
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
          </button>

          {/* Dropdown for export formats on hover */}
          <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden flex flex-col">
            <button
              onClick={handleExportTripJson}
              className="w-full text-left px-4 py-3 text-sm text-surface-800 dark:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-primary-600 dark:hover:text-primary-400 flex items-start gap-3 transition-colors border-b border-surface-100 dark:border-surface-700"
            >
              <FileJson className="w-4 h-4 shrink-0 mt-0.5 text-primary-500" />
              <div>
                <div className="font-semibold flex items-center gap-1.5">
                  Export Entire Trip (.json)
                  <span className="text-[9px] font-bold bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded border border-primary-200 dark:border-primary-700/60">
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
              className="w-full text-left px-4 py-2.5 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white flex items-center gap-3 transition-colors border-b border-surface-100 dark:border-surface-700 font-medium"
            >
              <Download className="w-4 h-4 shrink-0 text-surface-400" />
              Export PDF / Print
            </button>

            <button
              onClick={handleExportTxt}
              className="w-full text-left px-4 py-2.5 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white flex items-center gap-3 transition-colors border-b border-surface-100 dark:border-surface-700 font-medium"
            >
              <FileText className="w-4 h-4 shrink-0 text-surface-400" />
              Export Text (Full Details)
            </button>

            <button
              onClick={handleExportNamesTxt}
              className="w-full text-left px-4 py-2.5 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white flex items-center gap-3 transition-colors font-medium"
            >
              <List className="w-4 h-4 shrink-0 text-surface-400" />
              Export Place Names List
            </button>
          </div>
        </div>
      </div>

      {isImportOpen && (
        <React.Suspense fallback={null}>
          <ImportModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
          />
        </React.Suspense>
      )}
      {isLoadOpen && (
        <React.Suspense fallback={null}>
          <LoadTripModal
            isOpen={isLoadOpen}
            onClose={() => setIsLoadOpen(false)}
          />
        </React.Suspense>
      )}
      {isCategorySettingsOpen && (
        <React.Suspense fallback={null}>
          <CategorySettingsModal
            isOpen={isCategorySettingsOpen}
            onClose={() => setIsCategorySettingsOpen(false)}
          />
        </React.Suspense>
      )}
      {isApiBudgetOpen && (
        <React.Suspense fallback={null}>
          <ApiBudgetModal
            isOpen={isApiBudgetOpen}
            onClose={() => setIsApiBudgetOpen(false)}
          />
        </React.Suspense>
      )}
      {isAboutOpen && (
        <React.Suspense fallback={null}>
          <AboutModal
            isOpen={isAboutOpen}
            onClose={handleCloseAbout}
          />
        </React.Suspense>
      )}
      {isResetOpen && (
        <React.Suspense fallback={null}>
          <ResetTripModal
            isOpen={isResetOpen}
            onClose={() => setIsResetOpen(false)}
          />
        </React.Suspense>
      )}
    </header>
  );
});


