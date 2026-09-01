import React, { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import {
  onToast,
  offToast,
  ToastMessage,
  ToastType,
} from "../../services/toastService";
import { motion, AnimatePresence } from "framer-motion";

const TOAST_STYLES: Record<
  ToastType,
  {
    bg: string;
    border: string;
    text: string;
    titleColor: string;
    icon: React.ReactNode;
  }
> = {
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/90",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-800 dark:text-emerald-200",
    titleColor: "text-emerald-900 dark:text-emerald-100",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
  },
  error: {
    bg: "bg-rose-50 dark:bg-rose-950/90",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-800 dark:text-rose-200",
    titleColor: "text-rose-900 dark:text-rose-100",
    icon: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/90",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
    titleColor: "text-amber-900 dark:text-amber-100",
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
  },
  info: {
    bg: "bg-sky-50 dark:bg-sky-950/90",
    border: "border-sky-200 dark:border-sky-800",
    text: "text-sky-800 dark:text-sky-200",
    titleColor: "text-sky-900 dark:text-sky-100",
    icon: <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />,
  },
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const handleToast = useCallback((newToast: ToastMessage) => {
    setToasts((prev) => [...prev, newToast]);

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, newToast.duration);
    }
  }, []);

  useEffect(() => {
    onToast(handleToast);
    return () => offToast(handleToast);
  }, [handleToast]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div
      aria-live="assertive"
      className="fixed bottom-5 right-5 z-[250] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type] || TOAST_STYLES.info;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all ${style.bg} ${style.border}`}
              role="status"
            >
              <div className="mt-0.5">{style.icon}</div>
              <div className="flex-1 min-w-0">
                {t.title && (
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${style.titleColor}`}>
                    {t.title}
                  </h4>
                )}
                <p className={`text-xs font-medium leading-relaxed ${style.text}`}>
                  {t.message}
                </p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
