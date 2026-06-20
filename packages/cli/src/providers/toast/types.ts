export type ToastVariant = "success" | "error" | "info";

export type ToastOptions = {
  message: string;
  variant?: ToastVariant;
  duration?: number; // Duration in milliseconds
}

export const DEFAULT_DURATION = 3000; // Default duration for toasts in milliseconds