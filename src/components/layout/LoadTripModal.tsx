import React, { useRef, useState } from "react";
import { useRouteStore } from "../../store/useRouteStore";
import {
  X,
  Calendar,
  MapPin,
  Clock,
  Trash2,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "../../services/toastService";

interface LoadTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoadTripModal: React.FC<LoadTripModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    savedTrips,
    loadTrip,
    deleteTrip,
    exportTripAsJson,
    exportTripAsExcel,
    importTripFromJson,
  } = useRouteStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [exportingTripId, setExportingTripId] = useState<string | null>(null);
  const [exportingExcelTripId, setExportingExcelTripId] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await new Promise((r) => setTimeout(r, 250));
        const res = importTripFromJson(content);
        if (res.success) {
          toast.success(`Loaded "${res.tripTitle || "Trip"}" successfully!`, "Trip Imported");
          onClose();
        } else {
          toast.error(res.error || "Failed to import trip file.", "Import Error");
        }
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      setIsImporting(false);
      toast.error("Failed to read trip file.", "Import Error");
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportTrip = async (e: React.MouseEvent, trip: any) => {
    e.stopPropagation();
    if (exportingTripId) return;
    setExportingTripId(trip.id);
    try {
      await new Promise((r) => setTimeout(r, 250));
      exportTripAsJson(trip.id);
      toast.success(`Exported "${trip.title}" to JSON.`, "Export Complete");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export trip", "Export Error");
    } finally {
      setExportingTripId(null);
    }
  };

  const handleExportTripExcel = async (e: React.MouseEvent, trip: any) => {
    e.stopPropagation();
    if (exportingExcelTripId) return;
    setExportingExcelTripId(trip.id);
    try {
      await new Promise((r) => setTimeout(r, 150));
      await exportTripAsExcel(trip.id);
      toast.success(`Exported "${trip.title}" to Excel spreadsheet.`, "Export Complete");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export Excel file", "Export Error");
    } finally {
      setExportingExcelTripId(null);
    }
  };


  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] transition-colors"
        >
          <div className="flex items-center justify-between p-5 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
            <div>
              <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
                <FileJson className="w-5 h-5 text-primary-500" />
                My Saved Trips
              </h2>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                Load, export, or import complete trip itineraries
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Import Action Header */}
          <div className="px-4 py-2.5 bg-surface-100/50 dark:bg-surface-900/40 border-b border-surface-200/60 dark:border-surface-700/60 flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
              {savedTrips.length} {savedTrips.length === 1 ? "trip" : "trips"} available
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 px-2.5 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Trip File (.json)</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-surface-50 dark:bg-surface-900/50 transition-colors">
            {savedTrips.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white dark:bg-surface-800 rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
                <p className="text-surface-500 dark:text-surface-400 font-medium">
                  You haven't saved any trips yet.
                </p>
                <p className="text-sm text-surface-400 dark:text-surface-500 mt-1">
                  Click "Save" in the header to save your current itinerary, or import a .json file.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import Trip File (.json)</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedTrips
                  .slice()
                  .reverse()
                  .map((trip) => (
                    <div key={trip.id} className="relative group">
                      <button
                        onClick={() => {
                          loadTrip(trip.id);
                          toast.success(`Loaded "${trip.title}" itinerary.`, "Trip Loaded");
                          onClose();
                        }}
                        className="w-full text-left bg-white dark:bg-surface-800 p-4 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-500 transition-all flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-surface-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-lg pr-16">
                            {trip.title}
                          </h3>
                          <span className="text-xs font-medium text-surface-400 dark:text-surface-500 bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded-md">
                            {new Date(trip.savedAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-medium text-surface-500 dark:text-surface-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {trip.days} Days
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {trip.places.length} Places
                          </div>
                          {trip.optimizedRoutes.length > 0 && (
                            <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded">
                              <Clock className="w-3 h-3" />
                              Optimized
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Action buttons on card */}
                      <div className="absolute right-3 bottom-3 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleExportTripExcel(e, trip)}
                          disabled={exportingExcelTripId === trip.id}
                          className="p-1.5 text-surface-500 hover:text-emerald-600 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors disabled:opacity-75"
                          title="Export trip as Excel spreadsheet (.xlsx)"
                        >
                          {exportingExcelTripId === trip.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </button>
                        <button
                          onClick={(e) => handleExportTrip(e, trip)}
                          disabled={exportingTripId === trip.id}
                          className="p-1.5 text-surface-500 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors disabled:opacity-75"
                          title="Export trip as JSON file"
                        >
                          {exportingTripId === trip.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTrip(trip.id);
                            toast.info(`Deleted "${trip.title}" from saved trips.`, "Trip Deleted");
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete saved trip"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
