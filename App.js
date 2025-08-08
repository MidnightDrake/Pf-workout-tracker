// PF Workout Tracker – React (CDN)
// Dark mode toggle + 30s rest timer + mid-range weights

const { useState, useEffect, useMemo, useRef } = React;

const DEFAULT_PLAN = {
  Day1: {
    label: "Day 1 – Push",
    exercises: [
      { id: "leg-press", name: "Leg Press", sets: 3, reps: 12, weight: 120 },
      { id: "chest-press", name: "Chest Press (Machine)", sets: 3, reps: 10, weight: 50 },
      { id: "shoulder-press", name: "Shoulder Press (Machine)", sets: 3, reps: 10, weight: 40 },
      { id: "triceps-pd", name: "Triceps Pushdown (Cable)", sets: 3, reps: 12, weight: 30 },
      { id: "plank", name: "Plank (optional/home)", sets: 3, reps: 30, weight: 0 },
    ],
  },
  Day2: {
    label: "Day 2 – Pull",
    exercises: [
      { id: "lat-pulldown", name: "Lat Pulldown", sets: 3, reps: 12, weight: 60 },
      { id: "seated-row", name: "Seated Row (Machine)", sets: 3, reps: 10, weight: 50 },
      { id: "assist-pullup", name: "Assisted Pull-Up (optional)", sets: 3, reps: 6, weight: 115 },
      { id: "hammer-curl", name: "Hammer Curl (DB/Cable)", sets: 3, reps: 12, weight: 12 },
      { id: "leg-curl", name: "Leg Curl (Machine)", sets: 3, reps: 12, weight: 50 },
      { id: "ab-crunch", name: "Seated Ab Crunch (Machine)", sets: 3, reps: 15, weight: 45 },
    ],
  },
  Day3: {
    label: "Day 3 – Lower + Core",
    exercises: [
      { id: "leg-press-2", name: "Leg Press", sets: 3, reps: 12, weight: 110 },
      { id: "glute-kickback", name: "Glute Kickback (Machine)", sets: 3, reps: 12, weight: 30 },
      { id: "calf-raise", name: "Calf Raises (Machine/BW)", sets: 3, reps: 15, weight: 50 },
      { id: "woodchopper", name: "Cable Woodchoppers", sets: 3, reps: 12, weight: 15 },
      { id: "ball-crunch", name: "Stability Ball Crunches", sets: 3, reps: 15, weight: 0 },
    ],
  },
};

const STORAGE_KEY = "pf-3day-tracker-pwa-v2";

function useLocalStorageState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : defaultValue; }
    catch { return defaultValue; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState];
}

function clsx(...args) { return args.filter(Boolean).join(" "); }

function seedPlan(base) {
  const copy = JSON.parse(JSON.stringify(base));
  for (const k of Object.keys(copy)) {
    copy[k].exercises = copy[k].exercises.map(ex => ({ ...ex, doneSets: ex.doneSets ?? 0, completed: ex.completed ?? false }));
  }
  return copy;
}

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    localStorage.setItem('pf-theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

function useRestTimer(defaultSeconds = 30) {
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          try { navigator.vibrate && navigator.vibrate(120); } catch {}
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  return {
    seconds, running,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: (v = defaultSeconds) => { setRunning(false); setSeconds(v); },
    setPreset: (v) => { setRunning(false); setSeconds(v); setRunning(true); }
  };
}

function App() {
  const [plan, setPlan] = useLocalStorageState(STORAGE_KEY, seedPlan(DEFAULT_PLAN));
  const [currentDay, setCurrentDay] = useState("Day1");
  const [theme, setTheme] = useTheme();
  const timer = useRestTimer(30);
  const day = plan[currentDay];

  const [newName, setNewName] = useState("");
  const [newSets, setNewSets] = useState(3);
  const [newReps, setNewReps] = useState(10);
  const [newWeight, setNewWeight] = useState(0);

  function updateExercise(exId, updater) {
    setPlan(prev => {
      const p = JSON.parse(JSON.stringify(prev));
      const i = p[currentDay].exercises.findIndex(e => e.id === exId);
      if (i >= 0) p[currentDay].exercises[i] = updater(p[currentDay].exercises[i]);
      return p;
    });
  }

  function addExercise() {
    if (!newName.trim()) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    setPlan(prev => {
      const p = JSON.parse(JSON.stringify(prev));
      p[currentDay].exercises.push({ id, name: newName.trim(), sets: +newSets || 3, reps: +newReps || 10, weight: +newWeight || 0, doneSets: 0, completed: false });
      return p;
    });
    setNewName(""); setNewSets(3); setNewReps(10); setNewWeight(0);
  }

  function resetDay() {
    if (!confirm("Reset progress for this day?")) return;
    setPlan(prev => {
      const p = JSON.parse(JSON.stringify(prev));
      p[currentDay].exercises = p[currentDay].exercises.map(ex => ({ ...ex, doneSets: 0, completed: false }));
      return p;
    });
  }

  const progress = useMemo(() => {
    const totalSets = day.exercises.reduce((a, e) => a + e.sets, 0);
    const done = day.exercises.reduce((a, e) => a + e.doneSets, 0);
    return { totalSets, done, pct: totalSets ? Math.round((done / totalSets) * 100) : 0 };
  }, [day]);

  return (
    React.createElement("div", {className: "min-h-screen bg-gray-100 dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 p-4 sm:p-6"},
      React.createElement("div", {className: "max-w-3xl mx-auto"},
        React.createElement("header", {className: "mb-4 flex items-center gap-3"},
          React.createElement("h1", {className: "text-2xl sm:text-3xl font-bold flex-1"}, "Planet Fitness Workout Tracker"),
          React.createElement("button", {onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'), className: "px-3 py-2 rounded-xl text-sm font-semibold border bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-700"}, theme === 'dark' ? "Light Mode" : "Dark Mode")
        ),
        React.createElement("p", {className: "text-sm text-gray-600 dark:text-neutral-400 mb-2"}, "3-day plan • Check off sets, track weights, rest timer 30s. Saves to your device."),

        React.createElement("div", {className: "flex gap-2 mb-4"},
          Object.keys(plan).map(k =>
            React.createElement("button", {
              key: k, onClick: () => setCurrentDay(k),
              className: clsx("px-3 py-2 rounded-xl text-sm font-semibold border",
                currentDay === k ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-neutral-800 text-gray-800 dark:text-neutral-100 border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700")
            }, plan[k].label)
          ),
          React.createElement("button", {onClick: resetDay, className: "ml-auto px-3 py-2 rounded-xl text-sm font-semibold border bg-white dark:bg-neutral-800 text-gray-800 dark:text-neutral-100 border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700"}, "Reset Day")
        ),

        React.createElement(ProgressBar, {value: progress.pct}),

        React.createElement("section", {className: "mt-4 bg-white dark:bg-neutral-800 rounded-2xl shadow p-4 flex items-center gap-3"},
          React.createElement("div", {className: "text-lg font-semibold mr-2"}, "Rest Timer:"),
          React.createElement("div", {className: "text-2xl font-mono tabular-nums w-16 text-center"}, String(timer.seconds).padStart(2, '0')),
          React.createElement("button", {onClick: timer.start, className: "px-3 py-2 rounded-xl font-semibold border bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-700"}, "Start"),
          React.createElement("button", {onClick: timer.pause, className: "px-3 py-2 rounded-xl font-semibold border bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-700"}, "Pause"),
          React.createElement("button", {onClick: () => timer.reset(30), className: "px-3 py-2 rounded-xl font-semibold border bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-700"}, "Reset 30s"),
          React.createElement("div", {className: "ml-auto flex gap-2"},
            [30,45,60,90].map(p => React.createElement("button", {key: p, onClick: () => timer.setPreset(p), className: "px-3 py-2 rounded-xl text-sm font-semibold border bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-700"}, `${p}s`))
          )
        ),

        React.createElement("div", {className: "space-y-3 mt-4"},
          day.exercises.map(ex => React.createElement(ExerciseCard, {key: ex.id, ex, onChange: updateExercise}))
        ),

        React.createElement("section", {className: "mt-8 bg-white dark:bg-neutral-800 rounded-2xl shadow p-4"},
          React.createElement("h2", {className: "text-lg font-semibold mb-3"}, "Add Custom Exercise"),
          React.createElement("div", {className: "grid grid-cols-2 sm:grid-cols-4 gap-3 items-end"},
            React.createElement(TextField, {label: "Name", value: newName, onChange: setNewName, placeholder: "e.g., Leg Extension"}),
            React.createElement(NumberField, {label: "Sets", value: newSets, onChange: setNewSets, min: 1}),
            React.createElement(NumberField, {label: "Reps", value: newReps, onChange: setNewReps, min: 1}),
            React.createElement(NumberField, {label: "Weight", value: newWeight, onChange: setNewWeight, step: 5, min: 0})
          ),
          React.createElement("div", {className: "mt-3"},
            React.createElement("button", {onClick: addExercise, className: "px-4 py-2 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700"}, "Add Exercise")
          )
        ),

        React.createElement("footer", {className: "text-xs text-gray-500 dark:text-neutral-400 mt-6"}, "Tip: tap a set to mark it done. Long-press to undo.")
      )
    )
  );
}

function ExerciseCard({ ex, onChange }) {
  const setWeight = (val) => onChange(ex.id, prev => ({ ...prev, weight: Math.max(0, Math.round(Number(val))) }));
  const incWeight = (d) => onChange(ex.id, prev => ({ ...prev, weight: Math.max(0, prev.weight + d) }));
  const setCompleted = (checked) => onChange(ex.id, prev => ({ ...prev, completed: checked, doneSets: checked ? prev.sets : 0 }));
  const toggleSetDone = () => onChange(ex.id, prev => { const next = Math.min(prev.sets, prev.doneSets + 1); return { ...prev, doneSets: next, completed: next === prev.sets }; });
  const undoSet = () => onChange(ex.id, prev => { const next = Math.max(0, prev.doneSets - 1); return { ...prev, doneSets: next, completed: next === prev.sets }; });

  return (
    React.createElement("div", {className: "bg-white dark:bg-neutral-800 rounded-2xl shadow p-4"},
      React.createElement("div", {className: "flex items-center gap-3"},
        React.createElement("input", {type: "checkbox", checked: ex.completed, onChange: e => setCompleted(e.target.checked), className: "h-5 w-5 rounded border-gray-300 dark:border-neutral-700", title: "Mark exercise complete"}),
        React.createElement("div", {className: "flex-1"},
          React.createElement("div", {className: "font-semibold text-base"}, ex.name),
          React.createElement("div", {className: "text-xs text-gray-500 dark:text-neutral-400"}, `${ex.sets} sets × ${ex.reps} reps`)
        ),
        React.createElement("div", {className: "flex items-center gap-2"},
          React.createElement("button", {onClick: () => incWeight(-5), className: "px-2 py-1 rounded-lg border bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-700"}, "−"),
          React.createElement("input", {type: "number", value: ex.weight, onChange: e => setWeight(e.target.value), className: "w-20 px-2 py-1 border rounded-lg text-right bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-neutral-100", step: 5, min: 0}),
          React.createElement("span", {className: "text-xs text-gray-500 dark:text-neutral-400 w-8"}, "lbs"),
          React.createElement("button", {onClick: () => incWeight(5), className: "px-2 py-1 rounded-lg border bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-700"}, "＋")
        )
      ),
      React.createElement("div", {className: "mt-3 flex flex-wrap gap-2"},
        Array.from({length: ex.sets}).map((_, i) =>
          React.createElement("button", {
            key: i,
            onClick: toggleSetDone,
            onContextMenu: (e) => { e.preventDefault(); undoSet(); },
            className: clsx("px-3 py-2 rounded-xl text-sm font-semibold border select-none",
              i < ex.doneSets ? "bg-green-600 border-green-700 text-white" : "bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-700"),
            title: "Tap to mark set done. Long-press to undo."
          }, `Set ${i+1}`)
        )
      )
    )
  );
}

function ProgressBar({ value }) {
  return (
    React.createElement("div", {className: "w-full bg-gray-200 dark:bg-neutral-700 rounded-xl h-3 overflow-hidden"},
      React.createElement("div", {className: "h-3 bg-indigo-600", style: { width: `${Math.min(100, Math.max(0, value))}%` }})
    )
  );
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    React.createElement("label", {className: "block"},
      React.createElement("span", {className: "text-xs text-gray-600 dark:text-neutral-400"}, label),
      React.createElement("input", {type: "text", className: "mt-1 w-full px-3 py-2 border rounded-xl bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-neutral-100", value, onChange: e => onChange(e.target.value), placeholder})
    )
  );
}

function NumberField({ label, value, onChange, min = 0, step = 1 }) {
  return (
    React.createElement("label", {className: "block"},
      React.createElement("span", {className: "text-xs text-gray-600 dark:text-neutral-400"}, label),
      React.createElement("input", {type: "number", className: "mt-1 w-full px-3 py-2 border rounded-xl bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-neutral-100", value, min, step, onChange: e => onChange(Number(e.target.value))})
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
