import { createContext, useContext } from "react";
import type { AppState, Preferences } from "../shared/types";
export interface AppContextValue {
  state: AppState;
  setState: (state: AppState) => void;
  navigate: (page: string) => void;
  startLesson: (id: string) => Promise<void>;
  startReview: () => Promise<void>;
  changePreferences: (changes: Partial<Preferences>) => Promise<void>;
  openAuth: (mode?: "register" | "login") => void;
  openOnboarding: () => void;
  busy: boolean;
  reportError: (message: string) => void;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("Contexte manquant");
  return value;
}
