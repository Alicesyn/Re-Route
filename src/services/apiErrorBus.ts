/**
 * Lightweight event bus for surfacing API errors to the UI.
 * Services call `emitApiError(...)` when they hit rate limits or quota errors.
 * The UI listens with `onApiError(...)` and dismisses with `offApiError(...)`.
 */

export type ApiErrorSource = "google-maps" | "gemini";

export interface ApiError {
  source: ApiErrorSource;
  message: string;
  isQuota: boolean; // true = quota exhausted, false = temporary rate limit
  timestamp: number;
}

type ApiErrorHandler = (error: ApiError) => void;
const handlers = new Set<ApiErrorHandler>();

export const emitApiError = (error: Omit<ApiError, "timestamp">) => {
  const fullError: ApiError = { ...error, timestamp: Date.now() };
  console.warn(`[API Error][${error.source}]`, error.message);
  handlers.forEach((h) => h(fullError));
};

export const onApiError = (handler: ApiErrorHandler) => {
  handlers.add(handler);
};

export const offApiError = (handler: ApiErrorHandler) => {
  handlers.delete(handler);
};
