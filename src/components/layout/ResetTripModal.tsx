import React, { useEffect } from "react";
import { useRouteStore } from "../../store/useRouteStore";
import {
  RotateCcw,
  X,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Building2,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "../../services/toastService";

interface ResetTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetTripModal: React.FC<ResetTripModalProps> = ({
  isOpen,
  onClose,
}) => {
  const places = useRouteStore((s) => s.places);
  const hotels = useRouteStore((s) => s.hotels);
  const title = useRouteStore((s) => s.title);
  const resetTrip = useRouteStore((s) => s.resetTrip);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleConfirmReset = () => {
    resetTrip();
    toast.success("Trip itinerary has been reset. API cache preserved.", "Trip Reset");
    onClose();
  };

  if (!isOpen) return null;

  const placesCount = places.length;
  const hotelsCount = hotels.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 w-full max-w-md overflow-hidden flex flex-col transition-colors"
        >
          {/* Modal Header */}
          <div className="flex items-start justify-between p-5 pb-4 border-b border-surface-100 dark:border-surface-700/80 bg-surface-50/50 dark:bg-surface-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                  Reset Current Trip?
                </h2>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  {title ? `"${title}"` : "Active Trip"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-full transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 space-y-4 text-sm">
            <p className="text-surface-600 dark:text-surface-300">
              Are you sure you want to clear your current itinerary? This will reset all planning data for this trip:
            </p>

            {/* Breakdown List */}
            <div className="bg-surface-50 dark:bg-surface-900/60 rounded-xl p-3.5 space-y-2 border border-surface-200/60 dark:border-surface-700/60">
              <div className="flex items-center justify-between text-xs font-medium text-surface-700 dark:text-surface-200">
                <span className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary-500" />
                  Places to visit
                </span>
                <span className="font-bold text-surface-900 dark:text-white">
                  {placesCount} {placesCount === 1 ? "place" : "places"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-surface-700 dark:text-surface-200">
                <span className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  Hotel & stays
                </span>
                <span className="font-bold text-surface-900 dark:text-white">
                  {hotelsCount} {hotelsCount === 1 ? "stay" : "stays"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-surface-700 dark:text-surface-200">
                <span className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-purple-500" />
                  Schedule & flights
                </span>
                <span className="font-bold text-surface-900 dark:text-white">
                  Reset to defaults
                </span>
              </div>
            </div>

            {/* Cache Preservation Guarantee Box */}
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl p-3.5 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 dark:text-emerald-200/90 leading-relaxed">
                <span className="font-bold block text-emerald-950 dark:text-emerald-200 mb-0.5">
                  API Caches Preserved
                </span>
                All previously queried places, photos, and route directions remain cached locally. If you search or add the same places again, they will load instantly with zero API calls.
              </div>
            </div>
          </div>

          {/* Modal Footer / Action Buttons */}
          <div className="p-4 bg-surface-50/80 dark:bg-surface-900/40 border-t border-surface-100 dark:border-surface-700/80 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReset}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition-all shadow-xs flex items-center gap-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Confirm Reset</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
