import { createFalClient } from "@fal-ai/client";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

// ── Model aliases (convenience shortcuts) ──

export const MODEL_ALIASES: Record<string, string> = {
  "nano-banana-2": "fal-ai/nano-banana-2",
  "nano-banana-pro": "fal-ai/nano-banana-pro",
  "flux-2-flex": "fal-ai/flux-2-flex",
  "flux-2-flash": "fal-ai/flux-2-flash",
  "flux-lora": "fal-ai/flux-lora",
  "kling-2.6": "fal-ai/kling-video/v2.6/pro/image-to-video",
  "kling-3.0": "fal-ai/kling-video/v3/pro/image-to-video",
  "kling-t2v": "fal-ai/kling-video/v2.6/pro/text-to-video",
  "ltx-video": "fal-ai/ltx-video/v2.3/image-to-video",
  "veo3": "fal-ai/veo3",
  "esrgan": "fal-ai/esrgan",
  "recraft-v4": "fal-ai/recraft-v4/text-to-image",
  "seedance-2.0": "bytedance/seedance-2.0/image-to-video",
  "seedance-i2v": "bytedance/seedance-2.0/image-to-video",
  "seedance-t2v": "bytedance/seedance-2.0/text-to-video",
  "seedance-ref": "bytedance/seedance-2.0/reference-to-video",
  "seedance-fast": "bytedance/seedance-2.0/fast/image-to-video",
  "seedance-fast-t2v": "bytedance/seedance-2.0/fast/text-to-video",
  "seedance-fast-ref": "bytedance/seedance-2.0/fast/reference-to-video",
};

export const IMAGE_SIZES = [
  "square_hd",
  "square",
  "portrait_4_3",
  "portrait_16_9",
  "landscape_4_3",
  "landscape_16_9",
];

export function resolveModel(model: string): string {
  return MODEL_ALIASES[model] || model;
}

// ── Dynamic model discovery (fal.ai Platform API) ──

const FAL_MODELS_API = "https://api.fal.ai/v1/models";

export interface FalModelInfo {
  endpoint_id: string;
  display_name: string;
  category: string;
  description: string;
  status: string;
}

export interface SearchModelsResult {
  models: FalModelInfo[];
  has_more: boolean;
  next_cursor?: string;
}

export async function searchModels(opts: {
  query?: string;
  category?: string;
  limit?: number;
  cursor?: string;
}): Promise<SearchModelsResult> {
  const params = new URLSearchParams();
  if (opts.query) params.set("q", opts.query);
  if (opts.category) params.set("category", opts.category);
  params.set("limit", String(opts.limit || 20));
  if (opts.cursor) params.set("cursor", opts.cursor);
  params.set("status", "active");

  const url = `${FAL_MODELS_API}?${params}`;
  const headers: Record<string, string> = {};
  const key = process.env.FAL_KEY || process.env.FAL_AI_API_KEY;
  if (key) headers["Authorization"] = `Key ${key}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Model search failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();

  const models: FalModelInfo[] = (data.models || []).map((m: any) => ({
    endpoint_id: m.endpoint_id,
    display_name: m.metadata?.display_name || m.endpoint_id,
    category: m.metadata?.category || "unknown",
    description: m.metadata?.description || "",
    status: m.metadata?.status || "active",
  }));

  return {
    models,
    has_more: data.has_more || false,
    next_cursor: data.next_cursor,
  };
}

// ── Client (lazy-initialized to avoid blocking MCP handshake) ──

let _fal: ReturnType<typeof createFalClient> | null = null;

export function getFal() {
  if (!_fal) {
    _fal = createFalClient({
      credentials: process.env.FAL_KEY || process.env.FAL_AI_API_KEY,
    });
  }
  return _fal;
}

// Backward compat: proxy that lazy-initializes on first access
export const fal = new Proxy({} as ReturnType<typeof createFalClient>, {
  get(_target, prop) {
    return (getFal() as any)[prop];
  },
});

// ── File helpers ──

export async function uploadFile(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
  };
  const type = mimeTypes[ext] || "application/octet-stream";
  const blob = new Blob([buffer], { type });
  return await fal.storage.upload(blob);
}

export async function resolveUrl(pathOrUrl: string): Promise<string> {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  return await uploadFile(pathOrUrl);
}

export async function resolveUrls(input: string): Promise<string[]> {
  const items = input.split(",").map((s) => s.trim());
  return Promise.all(items.map(resolveUrl));
}

export async function downloadFile(
  url: string,
  outputPath: string
): Promise<number> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const dir = path.dirname(path.resolve(outputPath));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputPath, buffer);
  return buffer.length;
}

export function extractOutputUrl(
  result: any,
  type: "image" | "video" = "image"
): string | null {
  if (type === "video") {
    return result?.video?.url || null;
  }
  return result?.images?.[0]?.url || result?.image?.url || null;
}

export async function saveOutput(
  result: any,
  outputPath?: string,
  type: "image" | "video" = "image"
): Promise<string | null> {
  if (!outputPath) return null;
  const url = extractOutputUrl(result, type);
  if (!url) return null;
  const bytes = await downloadFile(url, outputPath);
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ── Error helper ──

export async function extractApiError(err: any): Promise<string> {
  const status = err?.status || err?.response?.status || "";
  const statusText = err?.statusText || err?.response?.statusText || "";
  let body = err?.body || err?.response?.body;

  if (!body && err?.response?.json) {
    try {
      body = await err.response.json();
    } catch {}
  }
  if (!body && err?.response?.text) {
    try {
      body = await err.response.text();
    } catch {}
  }
  if (!body && err?.detail) {
    body = { detail: err.detail };
  }

  if (body) {
    const bodyStr =
      typeof body === "string" ? body : JSON.stringify(body, null, 2);
    if (status) {
      return `Error (${status} ${statusText}): ${bodyStr}`;
    }
    return `Error: ${bodyStr}`;
  }

  return `Error: ${err?.message || String(err)}`;
}

// ── Auto-save helper ──

export function inferExtFromUrl(url: string, fallback = "bin"): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).replace(".", "");
    return ext || fallback;
  } catch {
    return fallback;
  }
}

export async function autoSaveOutput(
  result: any,
  modelId: string
): Promise<{ path: string; size: string } | null> {
  // Detect output type
  const videoUrl = result?.video?.url;
  const imageUrl = result?.images?.[0]?.url || result?.image?.url;
  const url = videoUrl || imageUrl;
  if (!url) return null;

  const ext = inferExtFromUrl(url, videoUrl ? "mp4" : "png");
  const shortModel = modelId.replace(/^fal-ai\//, "").replace(/\//g, "-");
  const ts = new Date()
    .toISOString()
    .replace(/[T:]/g, "-")
    .replace(/\..+/, "");
  const filename = `${shortModel}-${ts}.${ext}`;

  const dir = process.env.FAL_OUTPUT_DIR || path.join(os.homedir(), "Desktop");
  const outputPath = path.join(dir, filename);

  const bytes = await downloadFile(url, outputPath);
  const size = `${(bytes / 1024).toFixed(1)} KB`;
  console.error(`[fal-ai] Auto-saved: ${outputPath} (${size})`);
  return { path: outputPath, size };
}

// ── Input builders ──

export function buildGenerateInput(opts: {
  prompt: string;
  model: string;
  size?: string;
  ratio?: string;
  resolution?: string;
  format?: string;
  num_images?: number;
  seed?: number;
  steps?: number;
  guidance?: number;
}): { model: string; input: Record<string, any> } {
  const resolved = resolveModel(opts.model);
  const input: Record<string, any> = {
    prompt: opts.prompt,
    output_format: opts.format || "png",
  };

  if (resolved.includes("nano-banana")) {
    if (opts.ratio) input.aspect_ratio = opts.ratio;
    if (opts.resolution) input.resolution = opts.resolution;
    if (opts.num_images && opts.num_images > 1)
      input.num_images = opts.num_images;
  } else {
    input.image_size = opts.size || "square_hd";
    if (opts.steps) input.num_inference_steps = opts.steps;
    if (opts.guidance) input.guidance_scale = opts.guidance;
  }

  if (opts.seed !== undefined) input.seed = opts.seed;
  return { model: resolved, input };
}

export async function buildEditInput(opts: {
  prompt: string;
  images: string;
  model: string;
  size?: string;
  format?: string;
  seed?: number;
}): Promise<{ model: string; input: Record<string, any> }> {
  const resolved = resolveModel(opts.model);
  const imageUrls = await resolveUrls(opts.images);

  const input: Record<string, any> = {
    prompt: opts.prompt,
    image_urls: imageUrls,
    output_format: opts.format || "png",
  };

  let model = resolved;
  if (resolved.includes("nano-banana")) {
    model = resolved + "/edit";
  } else {
    input.image_size = opts.size || "square_hd";
  }

  if (opts.seed !== undefined) input.seed = opts.seed;
  return { model, input };
}

export async function buildVideoInput(opts: {
  prompt?: string;
  start?: string;
  end?: string;
  model: string;
  duration?: string;
  ratio?: string;
  negative?: string;
  no_audio?: boolean;
}): Promise<{ model: string; input: Record<string, any> }> {
  const resolved = resolveModel(opts.model);
  const input: Record<string, any> = {
    duration: opts.duration || "5",
  };

  if (opts.prompt) input.prompt = opts.prompt;
  if (opts.negative) input.negative_prompt = opts.negative;
  if (opts.no_audio) input.generate_audio = false;
  if (opts.ratio) input.aspect_ratio = opts.ratio;
  if (opts.start) input.start_image_url = await resolveUrl(opts.start);
  if (opts.end) input.end_image_url = await resolveUrl(opts.end);

  return { model: resolved, input };
}

export async function buildUpscaleInput(opts: {
  image: string;
  model: string;
  scale?: number;
  face?: boolean;
  format?: string;
}): Promise<{ model: string; input: Record<string, any> }> {
  const resolved = resolveModel(opts.model);
  const input: Record<string, any> = {
    image_url: await resolveUrl(opts.image),
    scale: opts.scale || 2,
    output_format: opts.format || "png",
  };

  if (opts.face) input.face = true;
  return { model: resolved, input };
}
