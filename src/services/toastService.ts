import { onApiError } from "./apiErrorBus";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // in ms, default 5000
}

type ToastHandler = (toast: ToastMessage) => void;
const toastHandlers = new Set<ToastHandler>();

export const showToast = (
  toastData: Omit<ToastMessage, "id"> & { id?: string },
) => {
  const toast: ToastMessage = {
    ...toastData,
    id: toastData.id || `toast_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    duration: toastData.duration ?? 5000,
  };
  toastHandlers.forEach((h) => h(toast));
  return toast.id;
};

export const onToast = (handler: ToastHandler) => {
  toastHandlers.add(handler);
};

export const offToast = (handler: ToastHandler) => {
  toastHandlers.delete(handler);
};

export const toast = {
  success: (message: string, title?: string, duration?: number) =>
    showToast({ type: "success", message, title, duration }),
  error: (message: string, title?: string, duration?: number) =>
    showToast({ type: "error", message, title, duration: duration ?? 7000 }),
  warning: (message: string, title?: string, duration?: number) =>
    showToast({ type: "warning", message, title, duration: duration ?? 6000 }),
  info: (message: string, title?: string, duration?: number) =>
    showToast({ type: "info", message, title, duration }),
};

// Automatically bridge API errors from apiErrorBus into toast system
onApiError((err) => {
  const sourceLabel =
    err.source === "google-maps"
      ? "Google Maps API"
      : err.source === "gemini"
        ? "Gemini AI API"
        : err.source;

  if (err.isQuota) {
    toast.error(
      "Daily API quota exhausted. Some live features will be limited until reset.",
      `Quota Exceeded · ${sourceLabel}`,
      10000,
    );
  } else {
    toast.warning(
      "Too many requests. Backing off and retrying automatically...",
      `Rate Limited · ${sourceLabel}`,
      8000,
    );
  }
});
