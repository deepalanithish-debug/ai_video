/**
 * Local FFmpeg rendering — the fallback when GCS_BUCKET is not configured.
 */
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";
import type { RenderParams } from "./transcoder";

function findFfmpeg(): string {
  const candidates = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg", "ffmpeg"];
  for (const p of candidates) { if (existsSync(p)) return p; }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const installer = require("@ffmpeg-installer/ffmpeg");
    if (installer?.path && existsSync(installer.path)) return installer.path;
  } catch {}
  return "ffmpeg";
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = findFfmpeg();
    const proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited ${code}: ${stderr.slice(-800)}`));
    });
    proc.on("error", (e) => reject(new Error(`FFmpeg spawn: ${e.message}`)));
  });
}

async function saveBase64(dataUrl: string, ext: string, dir: string): Promise<string> {
  const sep = dataUrl.indexOf(",");
  if (sep === -1) throw new Error("Expected base64 data-url");
  const buf = Buffer.from(dataUrl.slice(sep + 1), "base64");
  const file = path.join(dir, `${uuidv4()}.${ext}`);
  await writeFile(file, buf);
  return file;
}

export function ratioDimensions(r: string): [number, number] {
  switch (r) {
    case "16:9": return [1920, 1080];
    case "1:1":  return [1080, 1080];
    case "4:5":  return [1080, 1350];
    case "3:4":  return [1080, 1440];
    default:     return [1080, 1920];
  }
}

export function effectToVfFilter(effect: string): string {
  const e = effect.toLowerCase().replace(/[\s_-]+/g, "-");
  if (e.includes("black-and-white") || e.includes("grayscale") || e.includes("bw")) return "hue=s=0";
  if (e.includes("sepia") || e.includes("vintage")) return "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131";
  if (e.includes("warm") || e.includes("golden")) return "colorbalance=rs=0.15:gs=0.05:bs=-0.15";
  if (e.includes("cool") || e.includes("cold")) return "colorbalance=rs=-0.1:gs=0:bs=0.2";
  if (e.includes("vignette")) return "vignette=angle=PI/4:mode=forward";
  if (e.includes("blur") || e.includes("dreamy")) return "boxblur=3:1";
  if (e.includes("sharpen") || e.includes("crisp")) return "unsharp=5:5:1.5:5:5:0.0";
  if (e.includes("cinematic") || e.includes("film")) return "curves=preset=strong_contrast,colorbalance=rs=0.05:bs=-0.05";
  if (e.includes("matte") || e.includes("fade")) return "curves=preset=lighter,eq=contrast=0.85:saturation=0.8";
  if (e.includes("vibrant") || e.includes("pop")) return "eq=saturation=1.4:contrast=1.1";
  if (e.includes("moody") || e.includes("dark")) return "eq=brightness=-0.05:contrast=1.15:saturation=0.85";
  if (e.includes("bright") || e.includes("light")) return "eq=brightness=0.08:contrast=0.95";
  return "";
}

// atempo only accepts 0.5–2.0 per node; chain for values outside that range
export function buildAtempoChain(speed: number): string {
  const filters: string[] = [];
  let r = speed;
  while (r > 2.0 + 1e-6) { filters.push("atempo=2.0"); r /= 2.0; }
  while (r < 0.5 - 1e-6) { filters.push("atempo=0.5"); r /= 0.5; }
  filters.push(`atempo=${r.toFixed(6)}`);
  return filters.join(",");
}

// Map timeline transition type → ffmpeg xfade transition name (empty = cut)
export function toXfadeType(type: string): string {
  switch (type) {
    case "fade":           return "fade";
    case "cinematic-fade": return "fade";
    case "dissolve":       return "dissolve";
    case "wipe-left":      return "wipeleft";
    case "wipe-right":     return "wiperight";
    case "slide-left":     return "slideleft";
    case "slide-right":    return "slideright";
    case "zoom-in":        return "zoomin";
    case "zoom-out":       return "fadefast";  // closest ffmpeg equivalent
    default:               return "";           // cut
  }
}

export async function renderWithFfmpeg(params: RenderParams): Promise<{ downloadUrl: string; filename: string }> {
  const { scenes, audio, aspectRatio = "9:16", outputFilename } = params;
  const tmpDir  = path.join(process.cwd(), "tmp", "renders", uuidv4());
  const outDir  = path.join(process.cwd(), "public", "exports");
  const outFile = outputFilename ?? `render-${uuidv4()}.mp4`;
  const outPath = path.join(outDir, outFile);

  await mkdir(tmpDir, { recursive: true });
  await mkdir(outDir,  { recursive: true });

  const [W, H] = ratioDimensions(aspectRatio);
  const tempFiles: string[] = [];

  try {
    // ── Determine upfront if any xfade transition is requested ────────────────
    // (needed so we know whether to add overlap buffers during clip prep)
    const useXfade = scenes.some(
      (s, i) => i < scenes.length - 1 && s.transition && toXfadeType(s.transition.type) !== ""
    );

    // ── Step 1: prepare each scene clip ───────────────────────────────────────
    // scaledFiles[i] = { file, displayDuration, xfadeType, xfadeDur }
    const scaledFiles: {
      file: string;
      displayDuration: number;
      xfadeType: string;   // "" = cut
      xfadeDur: number;
    }[] = [];

    for (let si = 0; si < scenes.length; si++) {
      const scene = scenes[si];
      const isLast = si === scenes.length - 1;
      const speed = scene.playbackSpeed ?? 1;
      const transOut = scene.transition;
      const xfaceType = isLast ? "" : (transOut ? toXfadeType(transOut.type) : "");
      const xfadeDur  = isLast ? 0 : (xfaceType ? (transOut?.duration ?? 0.5) : 0);

      // When using xfade, extend clip slightly past display duration so the
      // fade has tail content to blend. Cuts need no extension.
      const overlapSec = (useXfade && !isLast && xfaceType) ? xfadeDur : 0;
      const displayDur = scene.duration;
      const fileDur    = displayDur + overlapSec;

      if (!scene.clipData) {
        const ph = path.join(tmpDir, `ph-${scene.id}.mp4`);
        tempFiles.push(ph);
        await runFfmpeg([
          "-f", "lavfi", "-i", `color=c=black:s=${W}x${H}:d=${fileDur}`,
          "-c:v", "libx264", "-t", String(fileDur), "-pix_fmt", "yuv420p", "-y", ph,
        ]);
        scaledFiles.push({ file: ph, displayDuration: displayDur, xfadeType: xfaceType, xfadeDur });
        continue;
      }

      const ext = scene.clipType === "image" ? "jpg" : "mp4";
      const raw = await saveBase64(scene.clipData, ext, tmpDir);
      tempFiles.push(raw);

      const scaled = path.join(tmpDir, `sc-${si}-${scene.id}.mp4`);
      tempFiles.push(scaled);

      const scaleFilter = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
      const speedFilter = speed !== 1 ? `setpts=${(1 / speed).toFixed(6)}*PTS` : "";
      const effectFilter = scene.visualEffect ? effectToVfFilter(scene.visualEffect) : "";
      const vf = [scaleFilter, speedFilter, effectFilter].filter(Boolean).join(",");

      if (scene.clipType === "image") {
        await runFfmpeg([
          "-loop", "1", "-i", raw,
          "-vf", vf,
          "-c:v", "libx264", "-t", String(fileDur), "-pix_fmt", "yuv420p", "-y", scaled,
        ]);
      } else {
        const inputArgs: string[] = [];
        if (scene.clipTrimStart != null && scene.clipTrimStart > 0) {
          inputArgs.push("-ss", scene.clipTrimStart.toFixed(6));
        }
        inputArgs.push("-i", raw);

        // How much source to read (account for speed)
        const sourceDur = fileDur * speed;
        inputArgs.push("-t", sourceDur.toFixed(6));

        const audioArgs = speed !== 1 ? ["-af", buildAtempoChain(speed)] : ["-an"];

        await runFfmpeg([
          ...inputArgs,
          "-vf", vf,
          ...audioArgs,
          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-y", scaled,
        ]);
      }

      scaledFiles.push({ file: scaled, displayDuration: displayDur, xfadeType: xfaceType, xfadeDur });
    }

    // ── Step 2: concatenate scenes ─────────────────────────────────────────────
    const concatenated = path.join(tmpDir, "concat.mp4");
    tempFiles.push(concatenated);

    if (scaledFiles.length === 1) {
      await runFfmpeg(["-i", scaledFiles[0].file, "-c", "copy", "-y", concatenated]);

    } else if (!useXfade) {
      // Fast path: no transitions — concat demuxer
      const listFile = path.join(tmpDir, "list.txt");
      tempFiles.push(listFile);
      await writeFile(listFile, scaledFiles.map(s => `file '${s.file}'`).join("\n"));
      await runFfmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", "-y", concatenated]);

    } else {
      // Xfade path: build filter_complex chain
      // Input labels: [0:v], [1:v], ... [N-1:v]
      // Chain: [0:v][1:v]xfade=...[vx0] → [vx0][2:v]xfade=...[vx1] → ... → [vout]
      const inputArgs = scaledFiles.flatMap(sf => ["-i", sf.file]);
      const filterParts: string[] = [];

      let prevLabel = "[0:v]";
      let timeAcc = 0; // accumulated output time before this xfade

      for (let i = 0; i < scaledFiles.length - 1; i++) {
        const sf = scaledFiles[i];
        const isLastTransition = i === scaledFiles.length - 2;
        const outLabel = isLastTransition ? "[vout]" : `[vx${i}]`;
        const nextLabel = `[${i + 1}:v]`;

        if (sf.xfadeType) {
          // Real transition: xfade starts at (timeAcc + displayDuration - xfadeDur)
          const offset = Math.max(0, timeAcc + sf.displayDuration - sf.xfadeDur);
          filterParts.push(
            `${prevLabel}${nextLabel}xfade=transition=${sf.xfadeType}:duration=${sf.xfadeDur.toFixed(4)}:offset=${offset.toFixed(4)}${outLabel}`
          );
          timeAcc += sf.displayDuration - sf.xfadeDur; // overlap reduces output time
        } else {
          // Cut: use concat filter (no overlap)
          filterParts.push(`${prevLabel}${nextLabel}concat=n=2:v=1:a=0${outLabel}`);
          timeAcc += sf.displayDuration;
        }

        prevLabel = outLabel;
      }

      await runFfmpeg([
        ...inputArgs,
        "-filter_complex", filterParts.join(";"),
        "-map", "[vout]",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-y", concatenated,
      ]);
    }

    // ── Step 3: mix BGM audio ──────────────────────────────────────────────────
    if (audio?.src) {
      const audioExt = audio.src.includes("audio/mpeg") ? "mp3"
        : audio.src.includes("audio/wav") ? "wav" : "m4a";
      const audioFile = await saveBase64(audio.src, audioExt, tmpDir);
      tempFiles.push(audioFile);
      const totalDur = params.totalDuration ?? scaledFiles.reduce((s, f) => s + f.displayDuration, 0);
      const vol = audio.volume ?? 0.7;
      const fi  = audio.fadeIn ?? 0.5;
      const fo  = audio.fadeOut ?? 1;
      await runFfmpeg([
        "-i", concatenated, "-i", audioFile,
        "-filter_complex", `[1:a]volume=${vol},afade=t=in:st=0:d=${fi},afade=t=out:st=${Math.max(0, totalDur - fo)}:d=${fo},apad[a]`,
        "-map", "0:v", "-map", "[a]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-y", outPath,
      ]);
    } else {
      await runFfmpeg(["-i", concatenated, "-c", "copy", "-y", outPath]);
    }

    return { downloadUrl: `/exports/${outFile}`, filename: outFile };
  } finally {
    for (const f of tempFiles) unlink(f).catch(() => {});
  }
}
