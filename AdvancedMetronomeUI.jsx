import React, { useMemo, useState } from "react";
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
 * Compact “hardware-style” advanced metronome UI (UI-only).
 * Dark metal body + clear text + colorful buttons/lights.
 * Works well as a small “physical device” panel for Mac/iPad/iPhone.
 */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseBeats(ts: string) {
  const [top, bottom] = ts.split("/").map((x) => parseInt(x, 10));
  return {
    beats: Number.isFinite(top) ? top : 4,
    unit: Number.isFinite(bottom) ? bottom : 4,
  };
}

function formatSwingLabel(v: number) {
  if (v <= 0) return "Straight";
  if (v < 45) return "Light";
  if (v < 60) return "Medium";
  return "Heavy";
}

// Minimal self-tests for pure helpers (only in NODE_ENV=test, server-side)
function runSelfTests() {
  console.assert(clamp(10, 0, 5) === 5, "clamp upper bound failed");
  console.assert(clamp(-1, 0, 5) === 0, "clamp lower bound failed");
  console.assert(clamp(3, 0, 5) === 3, "clamp passthrough failed");
  const a = parseBeats("7/8");
  console.assert(a.beats === 7 && a.unit === 8, "parseBeats 7/8 failed");
  const b = parseBeats("bad");
  console.assert(b.beats === 4 && b.unit === 4, "parseBeats fallback failed");
  console.assert(formatSwingLabel(0) === "Straight", "formatSwingLabel 0 failed");
  console.assert(formatSwingLabel(20) === "Light", "formatSwingLabel light failed");
  console.assert(formatSwingLabel(50) === "Medium", "formatSwingLabel medium failed");
  console.assert(formatSwingLabel(70) === "Heavy", "formatSwingLabel heavy failed");
}
// @ts-expect-error guarded
if (
  typeof window === "undefined" &&
  typeof process !== "undefined" &&
  process?.env?.NODE_ENV === "test"
) {
  runSelfTests();
}

function SegButton({ active, children, onClick }: any) {
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

function TinyDotRow({ beats, accents }: { beats: number; accents: boolean[] }) {
  const cells = Array.from({ length: Math.min(beats, 12) }, (_, i) => accents?.[i] ?? i === 0);
  return (
    <div className="flex items-center justify-center gap-2">
      {cells.map((on, i) => (
        <div
          key={i}
          className={
            "h-2.5 w-2.5 rounded-full border transition " +
            (on
              ? "bg-emerald-400/90 border-emerald-300 shadow-[0_0_12px_rgba(34,197,94,0.45)]"
              : "bg-white/10 border-white/15")
          }
        />
      ))}
    </div>
  );
}

export default function AdvancedMetronomeUI() {
  const [isRunning, setIsRunning] = useState(false);
  const [tempoLock, setTempoLock] = useState(false);

  const [bpm, setBpm] = useState(120);
  const [ts, setTs] = useState("4/4");
  const { beats, unit } = useMemo(() => parseBeats(ts), [ts]);

  const [subdivision, setSubdivision] = useState<"1/4" | "1/8" | "1/8T" | "1/16">("1/8");
  const [swing, setSwing] = useState(0);
  const swingLabel = useMemo(() => formatSwingLabel(swing), [swing]);

  const [volume, setVolume] = useState(70);
  const [visualPulse, setVisualPulse] = useState(true);
  const [phase, setPhase] = useState(35);

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Accents as a compact "pattern" – tap to toggle in drawer.
  const [accents, setAccents] = useState<boolean[]>([true, false, false, false]);

  // UI-only: quick tap tempo
  const [tapHistory, setTapHistory] = useState<number[]>([]);
  const tap = () => {
    const now = Date.now();
    setTapHistory((h) => {
      const next = [...h, now].slice(-6);
      if (next.length >= 4 && !tempoLock) {
        const diffs = next.slice(1).map((t, i) => t - next[i]);
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const bpmEst = Math.round(60000 / avg);
        setBpm(clamp(bpmEst, 20, 300));
      }
      return next;
    });
  };

  const bumpBpm = (delta: number) => {
    if (tempoLock) return;
    setBpm((v) => clamp(v + delta, 20, 300));
  };

  const tempoMs = useMemo(() => (60000 / bpm) * (4 / unit), [bpm, unit]);

  const reset = () => {
    setIsRunning(false);
    setTempoLock(false);
    setBpm(120);
    setTs("4/4");
    setSubdivision("1/8");
    setSwing(0);
    setVolume(70);
    setVisualPulse(true);
    setAccents([true, false, false, false]);
    setPhase(35);
  };

  const toggleAccent = (i: number) => {
    const next = Array.from({ length: beats }, (_, idx) => accents?.[idx] ?? idx === 0);
    next[i] = !next[i];
    setAccents(next);
  };

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
                    Metronome
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
                  {isRunning ? "Run" : "Stop"}
                </Badge>

                <Button
                  size="icon"
                  variant={tempoLock ? "secondary" : "outline"}
                  className="h-10 w-10 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(99,102,241,0.40),rgba(99,102,241,0.12))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_18px_rgba(0,0,0,0.45)] hover:brightness-110"
                  onClick={() => setTempoLock((v) => !v)}
                  aria-label="Tempo lock"
                >
                  {tempoLock ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Display like a hardware LED */}
            <div className="relative rounded-[1.75rem] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02),rgba(0,0,0,0.55))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_18px_35px_rgba(0,0,0,0.45)]">
              {/* smoked glass overlay */}
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
                  <div className="text-xs text-white/80">{tempoMs.toFixed(0)} ms/beat</div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-2xl text-white border border-white/15 bg-[linear-gradient(180deg,rgba(56,189,248,0.35),rgba(56,189,248,0.10))] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_18px_rgba(0,0,0,0.45)] hover:brightness-110"
                      disabled={tempoLock}
                      onClick={() => bumpBpm(-1)}
                      aria-label="Decrease BPM"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-2xl text-white border border-white/15 bg-[linear-gradient(180deg,rgba(56,189,248,0.35),rgba(56,189,248,0.10))] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_18px_rgba(0,0,0,0.45)] hover:brightness-110"
                      disabled={tempoLock}
                      onClick={() => bumpBpm(1)}
                      aria-label="Increase BPM"
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
                    Tap tempo
                  </button>
                  <div className="flex items-center gap-2 text-xs text-white/85">
                    <Sparkles className="h-3.5 w-3.5" />
                    {swing}%
                  </div>
                </div>

                {/* Beat dots like a physical device */}
                <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/85">Beats</div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-medium text-white/90 hover:text-white hover:underline"
                      onClick={() => setPhase((p) => (p + 28) % 100)}
                    >
                      <TimerReset className="h-3.5 w-3.5" />
                      Nudge
                    </button>
                  </div>
                  <div className="mt-3">
                    <TinyDotRow beats={beats} accents={accents} />
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

            {/* Transport row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="pointer-events-none col-span-3 h-px bg-white/10" />

              <Button
                className="h-12 rounded-2xl bg-[linear-gradient(180deg,#22c55e,#15803d)] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_16px_26px_rgba(0,0,0,0.55)] hover:brightness-110"
                onClick={() => {
                  setIsRunning((v) => !v);
                  setPhase((p) => (p + 18) % 100);
                }}
              >
                {isRunning ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" /> Start
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="h-12 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(168,85,247,0.35),rgba(168,85,247,0.12))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_16px_26px_rgba(0,0,0,0.45)] hover:brightness-110"
                onClick={() => setDrawerOpen((v) => !v)}
              >
                {drawerOpen ? "Less" : "More"}
              </Button>

              <Button
                variant="outline"
                className="h-12 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(251,146,60,0.40),rgba(251,146,60,0.12))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_16px_26px_rgba(0,0,0,0.45)] hover:brightness-110"
                onClick={reset}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
            </div>

            {/* Drawer (advanced) */}
            {drawerOpen && (
              <div className="rounded-[1.75rem] border border-white/12 bg-black/45 p-4 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-white/85">Time signature</Label>
                    <div className="flex gap-2">
                      {["3/4", "4/4", "6/8", "7/8"].map((x) => (
                        <SegButton key={x} active={ts === x} onClick={() => setTs(x)}>
                          {x}
                        </SegButton>
                      ))}
                    </div>
                    <div className="text-[11px] text-white/75">
                      For full list later: add a picker.
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-white/85">Subdivision</Label>
                    <div className="flex gap-2">
                      {(["1/4", "1/8", "1/8T", "1/16"] as const).map((x) => (
                        <SegButton
                          key={x}
                          active={subdivision === x}
                          onClick={() => setSubdivision(x)}
                        >
                          {x}
                        </SegButton>
                      ))}
                    </div>
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
                        <div className="text-sm font-semibold text-white">Volume</div>
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
                    <div className="text-sm font-semibold text-white">Visual pulse</div>
                    <div className="text-xs text-white/75">Beat bar + dots</div>
                  </div>
                  <Switch checked={visualPulse} onCheckedChange={setVisualPulse} />
                </div>

                {/* Accents compact editor */}
                <div className="rounded-2xl border border-white/12 bg-black/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">Accents</div>
                      <div className="text-xs text-white/80">Tap dots to toggle</div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-9 rounded-2xl text-white border border-white/15 bg-[linear-gradient(180deg,rgba(56,189,248,0.28),rgba(56,189,248,0.10))] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_16px_rgba(0,0,0,0.35)] hover:brightness-110"
                      onClick={() =>
                        setAccents(Array.from({ length: beats }, (_, i) => i === 0))
                      }
                    >
                      Downbeat
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
                    Note: shows first 12 beats; for big odd meters, add paging.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="w-full text-center text-xs text-white/70">
          Compact hardware-style panel. Good for Mac widgets and iPad/iPhone layouts.
        </div>
      </div>
    </div>
  );
}
