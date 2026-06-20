import { Outlet } from "react-router";
import { ToastProvider } from "../providers/toast";
import { DialogProvider } from "../providers/dialog";
import { KeyBoardLayerProvider } from "../providers/keyboard-layer";
import { ThemeProvider } from "../providers/theme";
import { ThemedRoot } from "./themed-route";

export function RootLayout() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <KeyBoardLayerProvider>
          <DialogProvider>
            <ThemedRoot>
              <Outlet />
            </ThemedRoot>
          </DialogProvider>
        </KeyBoardLayerProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};