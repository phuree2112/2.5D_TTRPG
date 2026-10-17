import { create } from 'zustand';
import type { MoodId } from '../../scene/core/atmosphere';

// The map's environment (Prompt §6): time of day, mood, weather and wind. Belongs to the map;
// kept here until maps are saved (Phase 9).

export type Weather = 'clear' | 'rain' | 'snow' | 'fog';
export type MoodChoice = 'auto' | MoodId;

type EnvironmentState = {
  /** Hours, 0–24. */
  timeOfDay: number;
  /** 'auto' follows the time of day; otherwise a fixed grade (Dungeon for cellars, and so on). */
  mood: MoodChoice;
  weather: Weather;
  /** 0 (still) – 1 (gusty). */
  wind: number;
};

type EnvironmentActions = {
  setTimeOfDay: (hours: number) => void;
  setMood: (mood: MoodChoice) => void;
  setWeather: (weather: Weather) => void;
  setWind: (wind: number) => void;
};

export const useEnvironment = create<EnvironmentState & EnvironmentActions>()((set) => ({
  timeOfDay: 16,
  mood: 'auto',
  weather: 'clear',
  wind: 0.5,
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setMood: (mood) => set({ mood }),
  setWeather: (weather) => set({ weather }),
  setWind: (wind) => set({ wind }),
}));
