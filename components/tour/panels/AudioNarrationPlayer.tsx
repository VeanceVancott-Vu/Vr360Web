"use client";

import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Language, SceneDto } from "@/lib/types";

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function AudioNarrationPlayer({
  scene,
  language,
  dictionary,
}: {
  scene: SceneDto;
  language: Language;
  dictionary: Dictionary;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const source =
    language === "vi" ? scene.narrationAudioVi : scene.narrationAudioEn;
  const transcript =
    language === "vi" ? scene.transcriptVi : scene.transcriptEn;
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("dn360-muted") === "true",
  );
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      if (audio) audio.currentTime = 0;
    };
  }, [scene.id, language]);

  if (!source) {
    return transcript ? (
      <section className="audio-player" aria-label={dictionary.narration}>
        <strong>{dictionary.narration}</strong>
        <small style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          {dictionary.noAudio}
        </small>
        <details>
          <summary>{dictionary.transcript}</summary>
          <p>{transcript}</p>
        </details>
      </section>
    ) : null;
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setFailed(true);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("dn360-muted", String(next));
  }

  return (
    <section className="audio-player" aria-label={dictionary.narration}>
      <audio
        ref={audioRef}
        src={source}
        muted={muted}
        preload="metadata"
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <div className="audio-player__top">
        <strong>{dictionary.narration}</strong>
        <span>
          {formatTime(progress)} / {formatTime(duration)}
        </span>
      </div>
      {failed ? (
        <small role="alert">{dictionary.audioError}</small>
      ) : (
        <>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(progress, duration || 0)}
            aria-label={dictionary.narrationProgress}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (audioRef.current) audioRef.current.currentTime = next;
              setProgress(next);
            }}
          />
          <div className="audio-player__controls">
            <button
              className="icon-button"
              type="button"
              aria-label={playing ? dictionary.pause : dictionary.play}
              onClick={() => void togglePlayback()}
            >
              {playing ? (
                <Pause size={16} aria-hidden="true" />
              ) : (
                <Play size={16} aria-hidden="true" />
              )}
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label={dictionary.restart}
              onClick={() => {
                if (audioRef.current) audioRef.current.currentTime = 0;
                setProgress(0);
              }}
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label={muted ? dictionary.unmute : dictionary.mute}
              aria-pressed={muted}
              onClick={toggleMute}
            >
              {muted ? (
                <VolumeX size={16} aria-hidden="true" />
              ) : (
                <Volume2 size={16} aria-hidden="true" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              defaultValue={0.85}
              aria-label={dictionary.volume}
              onChange={(event) => {
                if (audioRef.current) {
                  audioRef.current.volume = Number(event.target.value);
                }
              }}
            />
          </div>
        </>
      )}
      {transcript ? (
        <details>
          <summary>{dictionary.transcript}</summary>
          <p>{transcript}</p>
        </details>
      ) : null}
    </section>
  );
}
