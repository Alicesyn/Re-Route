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
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoadTripModal: React.FC<LoadTripModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { savedTrips, loadTrip, deleteTrip, exportTripAsJson, importTripFromJson } =
    useRouteStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importTripFromJson(content);
      if (res.success) {
        setNotification({
          type: "success",
          message: `Loaded "${res.tripTitle || "Trip"}" successfully!`,
        });
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({
          type: "error",
          message: res.error || "Failed to import trip file.",
        });
        setTimeout(() => setNotification(null), 4000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

          {/* Notification banner */}
          {notification && (
            <div
              className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 transition-all ${
                notification.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800"
                  : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-b border-red-200 dark:border-red-800"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{notification.message}</span>
            </div>
          )}

          {/* Quick Import Action Header */}
          <div className="px-4 py-2.5 bg-surface-100/50 dark:bg-surface-900/40 border-b border-surface-200/60 dark:border-surface-700/60 flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
              {savedTrips.length} {savedTrips.length === 1 ? "trip" : "trips"} available
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 px-2.5 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Trip File (.json)</span>
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
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition-colors shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import Trip File (.json)
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
                          onClick={(e) => {
                            e.stopPropagation();
                            exportTripAsJson(trip.id);
                          }}
                          className="p-1.5 text-surface-500 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
                          title="Export trip as JSON file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTrip(trip.id);
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
