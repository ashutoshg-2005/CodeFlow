import { Outlet } from "react-router";
import { ToastProvider } from "../providers/toast";
import { DialogProvider } from "../providers/dialog";
import { KeyBoardLayerProvider } from "../providers/keyboard-layer";
import { ThemeProvider } from "../providers/theme";
import { ThemedRoot } from "./themed-route";
import { PromptConfigProvider } from "../providers/prompt-config";

export function RootLayout() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <KeyBoardLayerProvider>
          <DialogProvider>
            <PromptConfigProvider>
              <ThemedRoot>
                <Outlet />
              </ThemedRoot>
            </PromptConfigProvider>
          </DialogProvider>
        </KeyBoardLayerProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};