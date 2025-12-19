import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Lock,
  Unlock,
  Volume2,
  Clock,
  TimerReset,
  Sparkles,
} from "lucide-react";

/**
 * Interfaz de metrónomo avanzada compacta con estilo “hardware” (solo UI).
 * Cuerpo metálico oscuro + texto claro + botones/luces coloridos.
 * Funciona bien como panel de “dispositivo físico” para Mac/iPad/iPhone.
 */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function parseBeats(ts) {
  const [top, bottom] = ts.split("/").map((x) => parseInt(x, 10));
  return {
    beats: Number.isFinite(top) ? top : 4,
    unit: Number.isFinite(bottom) ? bottom : 4,
  };
}

function formatSwingLabel(v) {
  if (v <= 0) return "Recto";
  if (v < 45) return "Ligero";
  if (v < 60) return "Medio";
  return "Pesado";
}

const TIME_SIGNATURES = [
  "2/2",
  "2/4",
  "3/4",
  "4/4",
  "5/4",
  "6/4",
  "7/4",
  "3/8",
  "5/8",
  "6/8",
  "7/8",
  "9/8",
  "12/8",
  "5/16",
  "7/16",
  "9/16",
  "11/16",
  "13/16",
];
const SUBDIVISIONS = ["1/4", "1/8", "1/8T", "1/16", "1/16T", "1/32", "1/32T", "1/64"];

function getSubdivisionsPerBeat(value) {
  switch (value) {
    case "1/4":
      return 1;
    case "1/8":
      return 2;
    case "1/8T":
      return 3;
    case "1/16":
      return 4;
    case "1/16T":
      return 6;
    case "1/32":
      return 8;
    case "1/32T":
      return 12;
    case "1/64":
      return 16;
    default:
      return 2;
  }
}

const PRESET_SLOTS = 4;
const STORAGE_KEY = "metronome-presets-v1";
const LAST_CONFIG_KEY = "metronome-last-config-v1";
const EXPORT_VERSION = 1;

function normalizeBooleanArray(value, length) {
  const list = Array.isArray(value) ? value : [];
  return Array.from({ length }, (_, i) => Boolean(list[i]));
}

function buildAccentArray(length, base = []) {
  return Array.from({ length }, (_, i) => base?.[i] ?? i === 0);
}

function normalizeConfig(raw) {
  const bpm = clamp(Number(raw?.bpm) || 120, 20, 300);
  const ts =
    typeof raw?.ts === "string" && TIME_SIGNATURES.includes(raw.ts)
      ? raw.ts
      : "4/4";
  const { beats } = parseBeats(ts);
  const subdivision = SUBDIVISIONS.includes(raw?.subdivision)
    ? raw.subdivision
    : "1/8";
  const swing = clamp(Number(raw?.swing) || 0, 0, 75);
  const volume = clamp(Number(raw?.volume) || 70, 0, 100);
  const polyEnabled = Boolean(raw?.polyEnabled ?? false);
  const polyBeats = clamp(Number(raw?.polyBeats) || 3, 2, 12);
  const polySubdivision = SUBDIVISIONS.includes(raw?.polySubdivision)
    ? raw.polySubdivision
    : "1/4";
  const polyVolume = clamp(Number(raw?.polyVolume) || 55, 0, 100);
  const visualPulse = Boolean(raw?.visualPulse ?? true);
  const accents = normalizeBooleanArray(raw?.accents, beats);
  return {
    bpm,
    ts,
    subdivision,
    swing,
    volume,
    polyEnabled,
    polyBeats,
    polySubdivision,
    polyVolume,
    visualPulse,
    accents,
  };
}

function useSyncedRef(value) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

// Pruebas mínimas para helpers puros (solo en NODE_ENV=test, lado servidor)
function runSelfTests() {
  console.assert(clamp(10, 0, 5) === 5, "falló el límite superior de clamp");
  console.assert(clamp(-1, 0, 5) === 0, "falló el límite inferior de clamp");
  console.assert(clamp(3, 0, 5) === 3, "falló el paso directo de clamp");
  const a = parseBeats("7/8");
  console.assert(a.beats === 7 && a.unit === 8, "falló parseBeats 7/8");
  const b = parseBeats("bad");
  console.assert(b.beats === 4 && b.unit === 4, "falló el fallback de parseBeats");
  console.assert(formatSwingLabel(0) === "Recto", "falló formatSwingLabel 0");
  console.assert(formatSwingLabel(20) === "Ligero", "falló formatSwingLabel ligero");
  console.assert(formatSwingLabel(50) === "Medio", "falló formatSwingLabel medio");
  console.assert(formatSwingLabel(70) === "Pesado", "falló formatSwingLabel pesado");
  const config = normalizeConfig({
    bpm: 85,
    ts: "7/8",
    subdivision: "1/16",
    swing: 10,
    volume: 55,
    polyEnabled: true,
    polyBeats: 5,
    polySubdivision: "1/8",
    polyVolume: 45,
    visualPulse: false,
    accents: [true, false, true],
  });
  console.assert(config.bpm === 85, "falló normalizeConfig bpm");
  console.assert(config.ts === "7/8", "falló normalizeConfig ts");
  console.assert(config.polyEnabled === true, "falló normalizeConfig polyEnabled");
  console.assert(config.polyBeats === 5, "falló normalizeConfig polyBeats");
  console.assert(config.polySubdivision === "1/8", "falló normalizeConfig polySubdivision");
  console.assert(config.polyVolume === 45, "falló normalizeConfig polyVolume");
  console.assert(config.accents.length === 7, "falló la longitud de acentos en normalizeConfig");
}
if (
  typeof window === "undefined" &&
  typeof process !== "undefined" &&
  process?.env?.NODE_ENV === "test"
) {
  runSelfTests();
}

function SegButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex-1 rounded-2xl px-3 py-2 text-sm font-medium transition border " +
        (active
          ? "border-white/15 bg-[linear-gradient(180deg,rgba(56,189,248,0.40),rgba(56,189,248,0.12))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_16px_rgba(0,0,0,0.45)]"
          : "border-white/10 bg-white/5 text-white/90 hover:bg-white/10")
      }
    >
      {children}
    </button>
  );
}

function TinyDotRow({ beats, accents, activeIndex }) {
  const count = Math.max(1, beats);
  const cells = Array.from({ length: count }, (_, i) => accents?.[i] ?? i === 0);
  const dense = count > 12;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {cells.map((on, i) => {
        const isActive = Number.isFinite(activeIndex) && i === activeIndex;
        return (
        <div
          key={i}
          className={
            "rounded-full border transition-all duration-500 ease-out " +
            (dense ? "h-2 w-2" : "h-2.5 w-2.5") +
            " " +
            (isActive
              ? "bg-sky-200 border-sky-100 shadow-[0_0_16px_rgba(56,189,248,0.9),0_0_30px_rgba(56,189,248,0.55)]"
              : on
              ? "bg-emerald-400/90 border-emerald-300 shadow-[0_0_12px_rgba(34,197,94,0.45)]"
              : "bg-white/10 border-white/15")
          }
        />
        );
      })}
    </div>
  );
}

export default function AdvancedMetronomeUI() {
  const [isRunning, setIsRunning] = useState(false);
  const [tempoLock, setTempoLock] = useState(false);

  const [bpm, setBpm] = useState(120);
  const [ts, setTs] = useState("4/4");
  const { beats, unit } = useMemo(() => parseBeats(ts), [ts]);

  const [subdivision, setSubdivision] = useState("1/8");
  const [swing, setSwing] = useState(0);
  const swingLabel = useMemo(() => formatSwingLabel(swing), [swing]);

  const [volume, setVolume] = useState(70);
  const [polyEnabled, setPolyEnabled] = useState(false);
  const [polyBeats, setPolyBeats] = useState(3);
  const [polySubdivision, setPolySubdivision] = useState("1/4");
  const [polyVolume, setPolyVolume] = useState(55);
  const [visualPulse, setVisualPulse] = useState(true);
  const [phase, setPhase] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [presetTick, setPresetTick] = useState(0);

  // Acentos como un "patrón" compacto: toca para alternar en el cajón.
  const [accents, setAccents] = useState([true, false, false, false]);

  const [trainingMode, setTrainingMode] = useState(false);
  const [trainingStep, setTrainingStep] = useState(2);
  const [trainingEvery, setTrainingEvery] = useState(4);

  // Solo UI: tempo rápido con toques
  const [tapHistory, setTapHistory] = useState([]);
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const isRunningRef = useRef(false);
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const measureStartRef = useRef(0);
  const rafIdRef = useRef(null);
  const bpmRef = useSyncedRef(bpm);
  const beatsRef = useSyncedRef(beats);
  const unitRef = useSyncedRef(unit);
  const subdivisionRef = useSyncedRef(subdivision);
  const swingRef = useSyncedRef(swing);
  const accentsRef = useSyncedRef(accents);
  const volumeRef = useSyncedRef(volume);
  const polyEnabledRef = useSyncedRef(polyEnabled);
  const polyBeatsRef = useSyncedRef(polyBeats);
  const polySubdivisionRef = useSyncedRef(polySubdivision);
  const polyVolumeRef = useSyncedRef(polyVolume);
  const visualPulseRef = useSyncedRef(visualPulse);
  const tempoLockRef = useSyncedRef(tempoLock);
  const presetsRef = useRef([]);
  const trainingModeRef = useSyncedRef(trainingMode);
  const trainingStepRef = useSyncedRef(trainingStep);
  const trainingEveryRef = useSyncedRef(trainingEvery);
  const measureCountRef = useRef(0);
  const polyNextNoteTimeRef = useRef(0);
  const polyStepRef = useRef(0);
  const phaseRef = useRef(phase);
  const currentBeatRef = useRef(currentBeat);

  useEffect(() => {
    setAccents((prev) => buildAccentArray(beats, prev));
    setCurrentBeat(0);
    currentBeatRef.current = 0;
  }, [beats]);

  useEffect(() => {
    volumeRef.current = volume;
    if (masterGainRef.current) {
      const gain = Math.min(0.4, Math.max(0, volume / 100) * 0.4);
      masterGainRef.current.gain.setTargetAtTime(gain, masterGainRef.current.context.currentTime, 0.01);
    }
  }, [volume]);

  useEffect(() => {
    if (!polyEnabled) return;
    const context = audioContextRef.current;
    if (context && isRunningRef.current) {
      polyStepRef.current = 0;
      polyNextNoteTimeRef.current = Math.max(context.currentTime, nextNoteTimeRef.current);
    }
  }, [polyEnabled]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    currentBeatRef.current = currentBeat;
  }, [currentBeat]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          presetsRef.current = parsed.map((entry) => normalizeConfig(entry));
        }
      } catch {
        presetsRef.current = [];
      }
    }
  }, []);

  const ensureAudioGraph = () => {
    if (!audioContextRef.current) {
      const context = new AudioContext();
      const master = context.createGain();
      master.gain.value = Math.min(0.4, Math.max(0, volumeRef.current / 100) * 0.4);
      master.connect(context.destination);
      audioContextRef.current = context;
      masterGainRef.current = master;
    }
    return audioContextRef.current;
  };

  const getConfigSnapshot = () => ({
    bpm: bpmRef.current,
    ts,
    subdivision: subdivisionRef.current,
    swing: swingRef.current,
    volume: volumeRef.current,
    polyEnabled: polyEnabledRef.current,
    polyBeats: polyBeatsRef.current,
    polySubdivision: polySubdivisionRef.current,
    polyVolume: polyVolumeRef.current,
    visualPulse: visualPulseRef.current,
    accents: accentsRef.current,
  });

  const applyConfig = (raw) => {
    const config = normalizeConfig(raw);
    const next = parseBeats(config.ts);
    if (!tempoLockRef.current) {
      setBpm(config.bpm);
    }
    setTs(config.ts);
    setSubdivision(config.subdivision);
    setSwing(config.swing);
    setVolume(config.volume);
    setPolyEnabled(config.polyEnabled);
    setPolyBeats(config.polyBeats);
    setPolySubdivision(config.polySubdivision);
    setPolyVolume(config.polyVolume);
    setVisualPulse(config.visualPulse);
    setAccents(normalizeBooleanArray(config.accents, next.beats));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(LAST_CONFIG_KEY);
    if (!stored) return;
    try {
      applyConfig(JSON.parse(stored));
    } catch {
      window.localStorage.removeItem(LAST_CONFIG_KEY);
    }
  }, []);

  const persistPresets = (presets) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  };

  const savePreset = (slot) => {
    const current = getConfigSnapshot();
    const presets = Array.from({ length: PRESET_SLOTS }, (_, i) =>
      presetsRef.current[i] ? normalizeConfig(presetsRef.current[i]) : null
    );
    presets[slot] = normalizeConfig(current);
    presetsRef.current = presets;
    persistPresets(presets);
    setPresetTick((value) => value + 1);
  };

  const loadPreset = (slot) => {
    const preset = presetsRef.current[slot];
    if (preset) {
      applyConfig(preset);
      setPresetTick((value) => value + 1);
    }
  };

  const exportConfig = async () => {
    const payload = JSON.stringify({
      version: EXPORT_VERSION,
      config: normalizeConfig(getConfigSnapshot()),
    });
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
      return;
    }
    if (typeof window !== "undefined") {
      window.prompt("Copia el JSON de configuración del metrónomo:", payload);
    }
  };

  const importConfig = () => {
    if (typeof window === "undefined") return;
    const raw = window.prompt("Pega el JSON de configuración del metrónomo:");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const payload = parsed?.config ?? parsed;
      applyConfig(payload);
    } catch {
      window.alert("JSON de configuración del metrónomo no válido.");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(
        LAST_CONFIG_KEY,
        JSON.stringify(normalizeConfig(getConfigSnapshot()))
      );
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [
    bpm,
    ts,
    subdivision,
    swing,
    volume,
    polyEnabled,
    polyBeats,
    polySubdivision,
    polyVolume,
    visualPulse,
    accents,
  ]);

  const scheduleClick = (
    time,
    accented,
    intensity = 1,
    frequency
  ) => {
    const context = audioContextRef.current;
    const master = masterGainRef.current;
    if (!context || !master) return;

    const osc = context.createOscillator();
    const gain = context.createGain();
    const type = accented ? "square" : "triangle";
    const freq = frequency ?? (accented ? 1100 : 750);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    const attack = 0.003;
    const decay = 0.06;
    gain.gain.setValueAtTime(0, time);
    const level = Math.max(0, Math.min(1, intensity));
    gain.gain.linearRampToValueAtTime((accented ? 0.9 : 0.7) * level, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    osc.connect(gain);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + decay + 0.02);
  };

  const getTimingSnapshot = () => {
    const beatDuration = (60 / bpmRef.current) * (4 / unitRef.current);
    const subdivisionsPerBeat = getSubdivisionsPerBeat(subdivisionRef.current);
    const baseSubdivision = beatDuration / subdivisionsPerBeat;
    const swingAmount = Math.min(0.75, Math.max(0, swingRef.current / 100));
    const swingEnabled = swingAmount > 0 && subdivisionsPerBeat % 2 === 0;
    const swingFactors = swingEnabled
      ? [1 + swingAmount * 0.5, 1 - swingAmount * 0.5]
      : [1, 1];
    return {
      beatDuration,
      subdivisionsPerBeat,
      baseSubdivision,
      swingEnabled,
      swingFactors,
    };
  };

  const schedulerLoop = () => {
    const context = audioContextRef.current;
    if (!context || !isRunningRef.current) return;

    const scheduleAhead = 0.12;
    const timing = getTimingSnapshot();
    while (nextNoteTimeRef.current < context.currentTime + scheduleAhead) {
      const totalSteps = Math.max(1, beatsRef.current * timing.subdivisionsPerBeat);
      const stepIndex = currentStepRef.current % totalSteps;
      const beatIndex = Math.floor(stepIndex / timing.subdivisionsPerBeat);
      const subIndex = stepIndex % timing.subdivisionsPerBeat;
      const accentsForBeat = accentsRef.current?.[beatIndex] ?? beatIndex === 0;
      const isBeatStart = subIndex === 0;
      const accented = isBeatStart && accentsForBeat;
      scheduleClick(nextNoteTimeRef.current, accented, 1);

      if (isBeatStart && beatIndex !== currentBeatRef.current) {
        currentBeatRef.current = beatIndex;
        setCurrentBeat(beatIndex);
      }

      if (stepIndex === 0) {
        measureStartRef.current = nextNoteTimeRef.current;
        measureCountRef.current += 1;
        if (polyEnabledRef.current) {
          polyNextNoteTimeRef.current = measureStartRef.current;
          polyStepRef.current = 0;
        }
        if (
          trainingModeRef.current &&
          trainingEveryRef.current > 0 &&
          measureCountRef.current % trainingEveryRef.current === 0 &&
          !tempoLockRef.current
        ) {
          const nextTempo = clamp(
            bpmRef.current + trainingStepRef.current,
            20,
            300
          );
          setBpm(nextTempo);
        }
      }

      const stepDuration = timing.baseSubdivision *
        (timing.swingEnabled ? timing.swingFactors[stepIndex % 2] : 1);
      nextNoteTimeRef.current += stepDuration;
      currentStepRef.current = stepIndex + 1;
    }

    if (polyEnabledRef.current) {
      const polySubdivisions = getSubdivisionsPerBeat(polySubdivisionRef.current);
      const polyTotalSteps = Math.max(1, polyBeatsRef.current * polySubdivisions);
      const measureDuration = timing.beatDuration * beatsRef.current;
      const polyStepDuration = measureDuration / polyTotalSteps;
      if (polyNextNoteTimeRef.current < context.currentTime - scheduleAhead) {
        polyNextNoteTimeRef.current = context.currentTime + 0.01;
        polyStepRef.current = 0;
      }
      while (polyNextNoteTimeRef.current < context.currentTime + scheduleAhead) {
        const stepIndex = polyStepRef.current % polyTotalSteps;
        const subIndex = stepIndex % polySubdivisions;
        const isBeatStart = subIndex === 0;
        const polyIntensity = polyVolumeRef.current / 100;
        const polyAccented = isBeatStart;
        const polyFrequency = polyAccented ? 900 : 620;
        if (polyStepDuration > 0) {
          scheduleClick(polyNextNoteTimeRef.current, polyAccented, polyIntensity, polyFrequency);
        }
        polyNextNoteTimeRef.current += polyStepDuration;
        polyStepRef.current = stepIndex + 1;
      }
    }

    if (visualPulseRef.current) {
      const measureDuration = timing.beatDuration * beatsRef.current;
      const elapsed = Math.max(0, context.currentTime - measureStartRef.current);
      const progress = measureDuration > 0 ? (elapsed / measureDuration) * 100 : 0;
      const nextPhase = clamp(progress, 0, 100);
      if (Math.abs(nextPhase - phaseRef.current) > 0.1) {
        phaseRef.current = nextPhase;
        setPhase(nextPhase);
      }
    } else if (phaseRef.current !== 0) {
      phaseRef.current = 0;
      setPhase(0);
    }

    rafIdRef.current = requestAnimationFrame(schedulerLoop);
  };

  const startTransport = async () => {
    if (isRunningRef.current) return;
    const context = ensureAudioGraph();
    if (context.state === "suspended") {
      await context.resume();
    }

    isRunningRef.current = true;
    setIsRunning(true);
    currentStepRef.current = 0;
    nextNoteTimeRef.current = context.currentTime + 0.05;
    measureStartRef.current = nextNoteTimeRef.current;
    measureCountRef.current = 0;
    polyStepRef.current = 0;
    polyNextNoteTimeRef.current = nextNoteTimeRef.current;
    currentBeatRef.current = 0;
    setCurrentBeat(0);
    phaseRef.current = 0;
    setPhase(0);
    rafIdRef.current = requestAnimationFrame(schedulerLoop);
  };

  const stopTransport = () => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setPhase(0);
    currentBeatRef.current = 0;
    setCurrentBeat(0);
  };
  const tap = () => {
    if (isRunningRef.current) return;
    const now = Date.now();
    setTapHistory((h) => {
      const next = [...h, now].slice(-6);
      if (next.length >= 4 && !tempoLock) {
        const diffs = next.slice(1).map((t, i) => t - next[i]);
        const sorted = diffs.slice().sort((a, b) => a - b);
        const trimmed =
          sorted.length > 4 ? sorted.slice(1, sorted.length - 1) : sorted;
        const mid = Math.floor(trimmed.length / 2);
        const median =
          trimmed.length % 2 === 0
            ? (trimmed[mid - 1] + trimmed[mid]) / 2
            : trimmed[mid];
        const bpmEst = Math.round(60000 / median);
        setBpm(clamp(bpmEst, 20, 300));
      }
      return next;
    });
  };

  const bumpBpm = (delta) => {
    if (tempoLock) return;
    setBpm((v) => clamp(v + delta, 20, 300));
  };

  const tempoMs = useMemo(() => (60000 / bpm) * (4 / unit), [bpm, unit]);

  const reset = () => {
    stopTransport();
    setIsRunning(false);
    setTempoLock(false);
    setBpm(120);
    setTs("4/4");
    setSubdivision("1/8");
    setSwing(0);
    setVolume(70);
    setPolyEnabled(false);
    setPolyBeats(3);
    setPolySubdivision("1/4");
    setPolyVolume(55);
    setVisualPulse(true);
    setAccents(buildAccentArray(4));
    setTrainingMode(false);
    setTrainingStep(2);
    setTrainingEvery(4);
    setTapHistory([]);
    setPhase(0);
    setCurrentBeat(0);
  };

  const toggleAccent = (i) => {
    const next = buildAccentArray(beats, accents);
    next[i] = !next[i];
    setAccents(next);
  };

  const presetSlots = useMemo(
    () => Array.from({ length: PRESET_SLOTS }, (_, i) => Boolean(presetsRef.current[i])),
    [presetTick]
  );

  useEffect(() => {
    return () => {
      stopTransport();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKeydown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const digit = Number(event.key);
      if (Number.isFinite(digit) && digit >= 1 && digit <= PRESET_SLOTS) {
        event.preventDefault();
        if (event.shiftKey) {
          savePreset(digit - 1);
        } else {
          loadPreset(digit - 1);
        }
        return;
      }
      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        exportConfig();
      }
      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        importConfig();
      }
      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        setTrainingMode((value) => !value);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_circle_at_20%_0%,rgba(56,189,248,0.10),transparent_55%),radial-gradient(700px_circle_at_85%_15%,rgba(168,85,247,0.12),transparent_55%),radial-gradient(900px_circle_at_60%_120%,rgba(34,197,94,0.10),transparent_60%),linear-gradient(180deg,#05070b,#0b0f16)] p-4">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <Card className="relative w-full rounded-[2.25rem] text-white border border-white/15 bg-[linear-gradient(180deg,#1b222c,#0b0f14_55%,#070a0f)] shadow-[0_22px_60px_rgba(0,0,0,0.75)]">
          {/* Dark metal bezel + specular highlights */}
          <div className="pointer-events-none absolute inset-0 rounded-[2.25rem] ring-1 ring-white/10" />
          <div className="pointer-events-none absolute inset-0 rounded-[2.25rem] bg-[radial-gradient(900px_circle_at_30%_-10%,rgba(255,255,255,0.20),transparent_55%),radial-gradient(700px_circle_at_90%_0%,rgba(255,255,255,0.10),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-[10px] rounded-[1.75rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-22px_40px_rgba(0,0,0,0.65)]" />
          <div className="pointer-events-none absolute inset-0 rounded-[2.25rem] opacity-[0.08] mix-blend-overlay bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.20)_0px,rgba(255,255,255,0.20)_1px,transparent_1px,transparent_7px)]" />

          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(56,189,248,0.35),rgba(56,189,248,0.08))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_20px_rgba(0,0,0,0.55)]">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base leading-tight text-white">
                    Metrónomo Jaramillo
                  </CardTitle>
                  <div className="text-xs text-white/85">
                    {ts} • {subdivision} • {swingLabel}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={isRunning ? "default" : "secondary"}
                  className="rounded-full bg-[linear-gradient(180deg,rgba(34,197,94,0.35),rgba(34,197,94,0.12))] text-white border border-white/15"
                >
                  {isRunning ? "En marcha" : "Detenido"}
                </Badge>

                <Button
                  size="icon"
                  variant={tempoLock ? "secondary" : "outline"}
                  className="h-10 w-10 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(99,102,241,0.40),rgba(99,102,241,0.12))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_18px_rgba(0,0,0,0.45)] hover:brightness-110"
                  onClick={() => setTempoLock((v) => !v)}
                  aria-label="Bloqueo de tempo"
                >
                  {tempoLock ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Pantalla como LED de hardware */}
            <div className="relative rounded-[1.75rem] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02),rgba(0,0,0,0.55))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_18px_35px_rgba(0,0,0,0.45)]">
              {/* superposición de vidrio ahumado */}
              <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(700px_circle_at_20%_0%,rgba(56,189,248,0.10),transparent_60%),radial-gradient(700px_circle_at_85%_10%,rgba(168,85,247,0.10),transparent_60%)]" />
              <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] opacity-[0.06] mix-blend-overlay bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.22)_0px,rgba(255,255,255,0.22)_1px,transparent_1px,transparent_7px)]" />

              <div className="relative flex items-end justify-between">
                <div>
                  <div className="text-xs text-white/85">Tempo</div>
                  <div className="mt-1 flex items-end gap-2">
                    <div className="text-5xl font-extrabold tracking-tight tabular-nums text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]">
                      {bpm}
                    </div>
                  <div className="pb-2 text-sm text-white/80">BPM</div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs text-white/80">{tempoMs.toFixed(0)} ms/pulso</div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-2xl text-white border border-white/15 bg-[linear-gradient(180deg,rgba(56,189,248,0.35),rgba(56,189,248,0.10))] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_18px_rgba(0,0,0,0.45)] hover:brightness-110"
                      disabled={tempoLock}
                      onClick={() => bumpBpm(-1)}
                      aria-label="Disminuir BPM"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-2xl text-white border border-white/15 bg-[linear-gradient(180deg,rgba(56,189,248,0.35),rgba(56,189,248,0.10))] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_18px_rgba(0,0,0,0.45)] hover:brightness-110"
                      disabled={tempoLock}
                      onClick={() => bumpBpm(1)}
                      aria-label="Aumentar BPM"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="relative mt-4 space-y-3">
                <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Slider
                    value={[bpm]}
                    min={20}
                    max={300}
                    step={1}
                    onValueChange={(v) => !tempoLock && setBpm(v[0])}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-xs font-medium text-white/90 hover:text-white hover:underline"
                    onClick={tap}
                    disabled={tempoLock}
                  >
                    Marcar tempo
                  </button>
                  <div className="flex items-center gap-2 text-xs text-white/85">
                    <Sparkles className="h-3.5 w-3.5" />
                    {swing}%
                  </div>
                </div>

                {/* Puntos de pulso como un dispositivo físico */}
                <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/85">Pulsos</div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-medium text-white/90 hover:text-white hover:underline"
                      onClick={() => setPhase((p) => (p + 28) % 100)}
                    >
                      <TimerReset className="h-3.5 w-3.5" />
                      Ajustar
                    </button>
                  </div>
                  <div className="mt-3">
                    <TinyDotRow
                      beats={beats}
                      accents={accents}
                      activeIndex={isRunning ? currentBeat : null}
                    />
                  </div>
                  <div className="mt-3">
                    <div className="relative">
                      <Progress value={visualPulse ? phase : 0} className="h-2" />
                      <div className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(90deg,rgba(56,189,248,0.35),rgba(168,85,247,0.35),rgba(34,197,94,0.35))] opacity-70" />
                      <div className="pointer-events-none absolute -inset-0.5 rounded-full blur-sm bg-[linear-gradient(90deg,rgba(56,189,248,0.25),rgba(168,85,247,0.25),rgba(34,197,94,0.25))]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila de transporte */}
            <div className="grid grid-cols-3 gap-2">
              <div className="pointer-events-none col-span-3 h-px bg-white/10" />

              <Button
                className="h-12 rounded-2xl bg-[linear-gradient(180deg,#22c55e,#15803d)] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_16px_26px_rgba(0,0,0,0.55)] hover:brightness-110"
                onClick={() => {
                  if (isRunningRef.current) {
                    stopTransport();
                  } else {
                    startTransport();
                  }
                }}
              >
                {isRunning ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" /> Pausar
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" /> Iniciar
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="h-12 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(168,85,247,0.35),rgba(168,85,247,0.12))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_16px_26px_rgba(0,0,0,0.45)] hover:brightness-110"
                onClick={() => setDrawerOpen((v) => !v)}
              >
                {drawerOpen ? "Menos" : "Más"}
              </Button>

              <Button
                variant="outline"
                className="h-12 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(251,146,60,0.40),rgba(251,146,60,0.12))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_16px_26px_rgba(0,0,0,0.45)] hover:brightness-110"
                onClick={reset}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
              </Button>
            </div>

            {/* Cajón (avanzado) */}
            {drawerOpen && (
              <div className="rounded-[1.75rem] border border-white/12 bg-black/45 p-4 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-white/85">Compás</Label>
                    <select
                      value={ts}
                      onChange={(event) => setTs(event.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-black/60 px-3 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                    >
                      {TIME_SIGNATURES.map((value) => (
                        <option key={value} value={value} className="bg-slate-900">
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-white/85">Subdivisión</Label>
                    <select
                      value={subdivision}
                      onChange={(event) => setSubdivision(event.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-black/60 px-3 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                    >
                      {SUBDIVISIONS.map((value) => (
                        <option key={value} value={value} className="bg-slate-900">
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white">Swing</div>
                      <Badge
                        variant="secondary"
                        className="rounded-full bg-white/10 text-white border border-white/15"
                      >
                        {swingLabel}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <Slider
                        value={[swing]}
                        min={0}
                        max={75}
                        step={1}
                        onValueChange={(v) => setSwing(v[0])}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-white/80" />
                      <div className="text-sm font-semibold text-white">Volumen</div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="rounded-full bg-white/10 text-white border border-white/15"
                      >
                        {volume}%
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <Slider
                        value={[volume]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) => setVolume(v[0])}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div>
                    <div className="text-sm font-semibold text-white">Pulso visual</div>
                    <div className="text-xs text-white/75">Barra de pulso + puntos</div>
                  </div>
                  <Switch checked={visualPulse} onCheckedChange={setVisualPulse} />
                </div>

                <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">Modo de entrenamiento</div>
                      <div className="text-xs text-white/75">
                        Aumenta automáticamente el tempo al reproducir
                      </div>
                    </div>
                    <Switch checked={trainingMode} onCheckedChange={setTrainingMode} />
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex items-center justify-between text-xs text-white/80">
                      <span>Aumentar en</span>
                      <span className="text-white">{trainingStep} BPM</span>
                    </div>
                    <Slider
                      value={[trainingStep]}
                      min={1}
                      max={12}
                      step={1}
                      onValueChange={(v) => setTrainingStep(v[0])}
                    />
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex items-center justify-between text-xs text-white/80">
                      <span>Cada</span>
                      <span className="text-white">{trainingEvery} compases</span>
                    </div>
                    <Slider
                      value={[trainingEvery]}
                      min={1}
                      max={12}
                      step={1}
                      onValueChange={(v) => setTrainingEvery(v[0])}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">Polirritmo</div>
                      <div className="text-xs text-white/75">
                        Pulso secundario contra el compás principal
                      </div>
                    </div>
                    <Switch checked={polyEnabled} onCheckedChange={setPolyEnabled} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-white/85">Pulsos</Label>
                      <div className="flex gap-2">
                        {[3, 4, 5, 7].map((value) => (
                          <SegButton
                            key={value}
                            active={polyBeats === value}
                            onClick={() => setPolyBeats(value)}
                          >
                            {value}
                          </SegButton>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-white/85">Subdivisión</Label>
                      <select
                        value={polySubdivision}
                        onChange={(event) => setPolySubdivision(event.target.value)}
                        className="w-full rounded-2xl border border-white/15 bg-black/60 px-3 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                      >
                        {SUBDIVISIONS.map((value) => (
                          <option key={value} value={value} className="bg-slate-900">
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex items-center justify-between text-xs text-white/80">
                      <span>Volumen del polirritmo</span>
                      <span className="text-white">{polyVolume}%</span>
                    </div>
                    <Slider
                      value={[polyVolume]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(v) => setPolyVolume(v[0])}
                    />
                  </div>
                </div>

                {/* Editor compacto de acentos */}
                <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">Acentos</div>
                      <div className="text-xs text-white/80">Toca los puntos para alternar</div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-9 rounded-2xl text-white border border-white/15 bg-[linear-gradient(180deg,rgba(56,189,248,0.28),rgba(56,189,248,0.10))] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_16px_rgba(0,0,0,0.35)] hover:brightness-110"
                      onClick={() =>
                        setAccents(Array.from({ length: beats }, (_, i) => i === 0))
                      }
                    >
                      Tiempo fuerte
                    </Button>
                  </div>

                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {Array.from({ length: beats })
                      .slice(0, 12)
                      .map((_, i) => {
                        const on = accents?.[i] ?? i === 0;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleAccent(i)}
                            className={
                              "h-9 w-9 rounded-2xl border text-sm font-semibold transition shadow-sm " +
                              (on
                                ? "border-emerald-300/60 bg-emerald-400/30 text-white shadow-[0_0_14px_rgba(34,197,94,0.35)]"
                                : "border-white/15 bg-white/5 text-white/90 hover:bg-white/10")
                            }
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                  </div>

                  <div className="mt-2 text-[11px] text-white/75 text-center">
                    Nota: muestra los primeros 12 pulsos; para compases grandes e irregulares, añade paginación.
                  </div>
                </div>

                <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">Preajustes</div>
                      <div className="text-xs text-white/75">
                        Toca para recuperar, guarda en ranuras
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-white/10 text-white border border-white/15"
                    >
                      {presetSlots.filter(Boolean).length}/{PRESET_SLOTS}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: PRESET_SLOTS }).map((_, i) => {
                      const hasPreset = presetSlots[i];
                      return (
                        <div
                          key={`preset-${i}`}
                          className="rounded-2xl border border-white/12 bg-black/45 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        >
                          <div className="flex items-center justify-between text-xs text-white/80">
                            <span>Ranura {i + 1}</span>
                            <span className={hasPreset ? "text-emerald-300" : "text-white/60"}>
                              {hasPreset ? "Guardado" : "Vacío"}
                            </span>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Button
                              variant="outline"
                              className="h-6 flex-1 rounded-2xl text-[0.7rem] text-white border border-white/15 bg-[linear-gradient(180deg,rgba(56,189,248,0.28),rgba(56,189,248,0.10))] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_16px_rgba(0,0,0,0.35)] hover:brightness-110"
                              onClick={() => loadPreset(i)}
                              disabled={!hasPreset}
                            >
                              Cargar
                            </Button>
                            <Button
                              variant="outline"
                              className="h-6 flex-1 rounded-2xl text-[0.7rem] text-white border border-white/15 bg-[linear-gradient(180deg,rgba(168,85,247,0.30),rgba(168,85,247,0.12))] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_16px_rgba(0,0,0,0.35)] hover:brightness-110"
                              onClick={() => savePreset(i)}
                            >
                              Guardar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        Transferencia de configuración
                      </div>
                      <div className="text-xs text-white/75">Copia o pega la instantánea JSON</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-9 flex-1 rounded-2xl text-white border border-white/15 bg-[linear-gradient(180deg,rgba(56,189,248,0.28),rgba(56,189,248,0.10))] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_16px_rgba(0,0,0,0.35)] hover:brightness-110"
                      onClick={exportConfig}
                    >
                      Exportar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 flex-1 rounded-2xl text-white border border-white/15 bg-[linear-gradient(180deg,rgba(251,146,60,0.40),rgba(251,146,60,0.12))] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_16px_rgba(0,0,0,0.35)] hover:brightness-110"
                      onClick={importConfig}
                    >
                      Importar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="w-full text-center text-xs text-white/70">
          Panel compacto de estilo hardware. Ideal para widgets de Mac y diseños de iPad/iPhone.
        </div>
      </div>
    </div>
  );
}
