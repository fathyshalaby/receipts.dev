import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { log } from "./util";

/** True when `ffmpeg` is on PATH and runs. */
export function ffmpegAvailable(): boolean {
  const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8", timeout: 8_000 });
  return !r.error && r.status === 0;
}

/**
 * Transcode `media/session.webm` → `media/session.mp4` (H.264) when ffmpeg is
 * present. Origin, Safari, and GitHub artifact players all prefer MP4; Playwright
 * only records WebM. Missing ffmpeg is not an error — skip with a log line.
 * Returns true when the mp4 exists afterwards (already there, or just written).
 */
export function transcodeSessionMp4(mediaDir: string): boolean {
  const src = join(mediaDir, "session.webm");
  const dest = join(mediaDir, "session.mp4");
  if (existsSync(dest)) return true;
  if (!existsSync(src)) return false;
  try {
    if (statSync(src).size < 1024) return false;
  } catch {
    return false;
  }
  if (!ffmpegAvailable()) {
    log.info("ffmpeg not found — skipping H.264 transcode (Origin/Safari playback).");
    return false;
  }
  const r = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      src,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      dest,
    ],
    { encoding: "utf8", timeout: 60_000 }
  );
  if (r.error || r.status !== 0) {
    const err = r.error?.message ?? (r.stderr || r.stdout || "").trim().slice(0, 240);
    log.warn(`ffmpeg mp4 transcode failed: ${err}`);
    return false;
  }
  log.ok(`wrote ${dest}`);
  return true;
}
