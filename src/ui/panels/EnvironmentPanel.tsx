import { useEnvironment } from '../../app/state/environment';
import type { MoodChoice, Weather } from '../../app/state/environment';
import { useSettings } from '../../app/state/settings';
import { focusRing, Segmented, Switch } from '../controls';

const time = (hours: number) => {
  const h = Math.floor(hours) % 24;
  const m = Math.round((hours - Math.floor(hours)) * 60) % 60;
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, h, m),
  );
};

/** Time of day, mood, weather, wind and ambient motion (Prompt §6, §7 Environment panel). */
export function EnvironmentPanel() {
  const env = useEnvironment();
  const ambient = useSettings((s) => s.ambientMotion);
  const setAmbient = useSettings((s) => s.setAmbientMotion);

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="flex justify-between text-sm">
          <span className="text-bone">Time of day</span>
          <span className="text-pewter tabular-nums">{time(env.timeOfDay)}</span>
        </span>
        <input
          type="range"
          name="time-of-day"
          min={0}
          max={24}
          step={0.25}
          value={env.timeOfDay}
          onChange={(e) => env.setTimeOfDay(Number(e.target.value))}
          className={`h-11 w-full cursor-pointer accent-lantern ${focusRing}`}
        />
      </label>
      <Segmented<MoodChoice>
        label="Mood"
        name="mood"
        value={env.mood}
        onChange={env.setMood}
        options={[
          { value: 'auto', label: 'By time' },
          { value: 'warmDay', label: 'Warm day' },
          { value: 'dusk', label: 'Dusk' },
          { value: 'night', label: 'Night' },
          { value: 'dungeon', label: 'Dungeon' },
          { value: 'cold', label: 'Cold' },
        ]}
      />
      <Segmented<Weather>
        label="Weather"
        name="weather"
        value={env.weather}
        onChange={env.setWeather}
        options={[
          { value: 'clear', label: 'Clear' },
          { value: 'rain', label: 'Rain' },
          { value: 'snow', label: 'Snow' },
          { value: 'fog', label: 'Fog' },
        ]}
      />
      <label className="flex flex-col gap-1">
        <span className="flex justify-between text-sm">
          <span className="text-bone">Wind</span>
          <span className="text-pewter tabular-nums">{Math.round(env.wind * 100)} %</span>
        </span>
        <input
          type="range"
          name="wind"
          min={0}
          max={1}
          step={0.05}
          value={env.wind}
          onChange={(e) => env.setWind(Number(e.target.value))}
          className={`h-11 w-full cursor-pointer accent-lantern ${focusRing}`}
        />
      </label>
      <Switch
        label="Ambient motion"
        description="Clouds, wind, water, particles and flickering light. Off saves battery; the table only redraws when something changes."
        checked={ambient}
        onChange={setAmbient}
      />
    </>
  );
}
