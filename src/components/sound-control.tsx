"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { audioServerSnapshot, audioSnapshot, playSound, setSoundEnabled, setSoundVolume, subscribeAudio, unlockSounds } from "@/lib/audio";
import type { SoundCue } from "@/lib/sound-signals";

export function SoundControl({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false), [volume, setVolume] = useState(.65), [tested, setTested] = useState(false);
  const status = useSyncExternalStore(subscribeAudio, audioSnapshot, audioServerSnapshot);
  useEffect(() => { try { const value = Number(localStorage.getItem("river:sound-volume")); if (value >= .05 && value <= 1) { setVolume(value); setSoundVolume(value); } } catch { /* Device preference is optional. */ } }, []);
  useEffect(() => { if (!open) return; const close = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [open]);
  function test(cue: SoundCue) { setSoundEnabled(true); const ready = unlockSounds(); if (!enabled) onToggle(); void ready.then(() => setTested(playSound(cue))); }
  return <div className="sound-control">
    <button className="icon-button" aria-label="Sound settings" aria-expanded={open} onClick={() => { unlockSounds(); setOpen(!open); }}>{enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
    {open && <div className="sound-popover" role="dialog" aria-label="Table sound settings">
      <div className="sound-popover-title"><strong>The sound of play.</strong><button aria-label="Close sound settings" onClick={() => setOpen(false)}><X size={16} /></button></div>
      <label className="sound-toggle">Table sounds <button role="switch" aria-checked={enabled} onClick={() => { setSoundEnabled(!enabled); if (!enabled) unlockSounds(); onToggle(); }}>{enabled ? "On" : "Off"}</button></label>
      <label className="sound-volume">Volume <span>{Math.round(volume * 100)}%</span><input type="range" aria-label="Sound volume" min="5" max="100" value={Math.round(volume * 100)} onChange={e => { const v = Number(e.target.value) / 100; setVolume(v); setSoundVolume(v); try { localStorage.setItem("river:sound-volume", String(v)); } catch { /* Optional device preference. */ } }} /></label>
      <div className="sound-tests">{([["your-turn", "Your turn"], ["deal", "Cards"], ["raise", "Chips"], ["all-in", "All in"], ["win", "Victory"]] as [SoundCue, string][]).map(([cue, label]) => <button key={cue} onClick={() => test(cue)}>{label} <Volume2 size={12} /></button>)}</div>
      <p role="status">{!enabled ? "Sounds muted" : status === "ready" ? tested ? "Sound ready · preview played" : "Sound ready" : status === "unavailable" ? "Audio is unavailable in this browser." : status === "error" ? "Audio could not start. Tap a preview to retry." : "Tap a preview to activate audio."}</p>
    </div>}
  </div>;
}
