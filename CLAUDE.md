# Fal.ai CLI & MCP Server

TypeScript CLI and MCP server for the Fal.ai API, powered by `@fal-ai/client`.

**Requires:** `FAL_KEY` (or `FAL_AI_API_KEY`) environment variable

## Setup

```bash
npm install && npm run build
```

## Two Interfaces

### CLI (terminal use)

```bash
node dist/cli.js <command> [options]
# or after npm link:
fal <command> [options]
```

### MCP Server

**Local (stdio):**
```bash
claude mcp add fal-ai -- node /Users/sebgrosjean/work/CLIs/fal/dist/mcp.js
```

**Remote (HTTP):**
```bash
PORT=3000 node dist/mcp.js
# Serves at http://localhost:3000/mcp
```

Or with `--http` flag: `node dist/mcp.js --http`

## Architecture

- `src/core.ts` - Shared logic: fal client, dynamic model discovery, input builders, file helpers, error extraction, auto-save
- `src/cli.ts` - CLI entry point (commander) with shortcut commands
- `src/mcp.ts` - MCP server (primitives only, no model-specific shortcuts)

The CLI has two command layers:
1. **Shortcut commands** (`generate`, `edit`, `video`, `upscale`) with friendly flags
2. **Generic commands** (`run`, `submit`, `status`, `result`, `cancel`) for any model with raw JSON

The MCP server exposes only stable API primitives. Model-specific knowledge lives in companion skills (`skills/kling-3.0/`, `skills/nano-banana-2/`, `skills/seedance-2.0/`).

Local files passed as image/video inputs are automatically uploaded to the fal CDN.

Set `FAL_OUTPUT_DIR` to control where auto-downloaded outputs are saved (defaults to `~/Desktop/`).

## Model Discovery

Models are discovered dynamically via the fal.ai Platform API (`GET https://api.fal.ai/v1/models`). This means new models (like Seedance 2.0) are available immediately without code changes.

### CLI: `fal models`

```bash
fal models                          # List all models
fal models seedance                 # Search by name
fal models --category text-to-video # Filter by category
fal models flux --limit 5           # Limit results
fal models --cursor <cursor>        # Paginate
```

### MCP: `fal_search_models`

The `fal_search_models` tool queries the live catalog with optional `query`, `category`, `limit`, and `cursor` parameters. **This should be the primary way to discover models.** Model IDs on fal.ai are vendor-specific paths (e.g. `bytedance/seedance-2.0/image-to-video`) that cannot be guessed — always search first if unsure.

## Shortcut Commands

### generate - Text-to-Image

```bash
fal generate --prompt "A sunset over the ocean" --output sunset.png
fal generate --prompt "..." --model fal-ai/flux-2-flex --size landscape_16_9 --output wide.png
fal generate --prompt "..." --model fal-ai/nano-banana-2 --ratio 16:9 --resolution 2K --output hd.png
fal generate --prompt "..." --seed 42 --num 4 --output batch.png
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--prompt`, `-p` | yes | | Image generation prompt |
| `--output`, `-o` | no | | Save image locally |
| `--model`, `-m` | no | `fal-ai/nano-banana-2` | Full model ID (use `fal models` to search) |
| `--size`, `-s` | no | `square_hd` | Size preset (flux models) |
| `--num`, `-n` | no | `1` | Number of images (1-4) |
| `--format` | no | `png` | `jpeg`, `png`, `webp` |
| `--ratio` | no | | Aspect ratio (nano-banana models): `1:1`, `16:9`, `9:16`, etc. |
| `--resolution` | no | `1K` | Resolution (nano-banana): `0.5K`, `1K`, `2K`, `4K` |
| `--seed` | no | | Seed for reproducibility |
| `--steps` | no | | Inference steps (flux models) |
| `--guidance` | no | | Guidance scale (flux models) |
| `--async` | no | | Submit to queue, return immediately |

**Size presets:** `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9`

### edit - Image Editing with References

```bash
fal edit --prompt "Add a sunset background" --images "photo.jpg,logo.png" --output result.png
fal edit --prompt "..." --images "https://example.com/img.jpg,local.png" --output edited.png
fal edit --prompt "..." --images "ref1.png" --model flux-2-flex --size landscape_16_9 --output out.png
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--prompt`, `-p` | yes | | Edit instructions |
| `--images` | yes | | Comma-separated URLs or local file paths |
| `--output`, `-o` | no | | Save image locally |
| `--model`, `-m` | no | `fal-ai/nano-banana-2` | Full model ID (use `fal models` to search) |
| `--size`, `-s` | no | `square_hd` | Size preset (non-nano-banana models) |
| `--format` | no | `png` | `jpeg`, `png`, `webp` |
| `--seed` | no | | Seed for reproducibility |
| `--async` | no | | Submit to queue, return immediately |

Local files are auto-uploaded to fal CDN before being sent to the model.

### video - Video Generation

```bash
fal video --start frame.png --prompt "smooth zoom in" --output video.mp4
fal video --start start.png --end end.png --duration 5 --output transition.mp4
fal video --start img.png --prompt "..." --model kling-3.0 --duration 10 --ratio 16:9 --no-audio --output out.mp4
fal video --start img.png --prompt "..." --async
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--prompt`, `-p` | yes* | | Video description |
| `--start` | yes* | | Start frame image (URL or local path) |
| `--end` | no | | End frame image (URL or local path) |
| `--output`, `-o` | no | auto-named | Output file path |
| `--model`, `-m` | no | `fal-ai/kling-video/v2.6/pro/image-to-video` | Full model ID (use `fal models` to search) |
| `--duration`, `-d` | no | `5` | Duration: `5` or `10` seconds |
| `--ratio` | no | `9:16` | Aspect ratio |
| `--negative` | no | | Negative prompt |
| `--no-audio` | no | | Disable audio generation (reduces cost) |
| `--async` | no | | Submit to queue, return immediately |

*At least `--prompt` or `--start` is required.

### upscale - Image Upscaling

```bash
fal upscale --image photo.jpg --output photo-4x.png --scale 4
fal upscale --image https://example.com/img.jpg --scale 2 --face --output portrait-2x.png
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--image` | yes | | Image URL or local file path |
| `--output`, `-o` | no | | Save result locally |
| `--scale` | no | `2` | Upscale factor (1-8) |
| `--face` | no | | Optimize for face upscaling |
| `--format` | no | `png` | `png` or `jpeg` |
| `--async` | no | | Submit to queue, return immediately |

## Generic Commands

### run - Synchronous Execution

```bash
fal run fal-ai/flux-lora -i '{"prompt":"a cat","loras":[{"path":"..."}]}'
fal run fal-ai/whisper -i '{"audio_url":"https://..."}'
```

### submit - Queue Submission

```bash
fal submit fal-ai/kling-video/v2.6/pro/image-to-video -i '{"prompt":"...","start_image_url":"..."}'
fal submit fal-ai/kling-video/v2.6/pro/image-to-video -i '{"prompt":"..."}' --wait --output video.mp4
```

### status / result / cancel

```bash
fal status fal-ai/kling-video/v2.6/pro/image-to-video REQUEST_ID
fal status fal-ai/kling-video/v2.6/pro/image-to-video REQUEST_ID --logs
fal result fal-ai/kling-video/v2.6/pro/image-to-video REQUEST_ID --output video.mp4
fal cancel fal-ai/kling-video/v2.6/pro/image-to-video REQUEST_ID
```

### upload

```bash
fal upload photo.png
# Prints: https://fal.media/files/...
```

### models - Search Models (Live)

```bash
fal models                          # Browse all models
fal models seedance                 # Search by name
fal models --category text-to-video # Filter by category
```

## MCP Tools (Primitives Only)

The MCP server exposes 7 model-agnostic tools. Model-specific knowledge is in companion skills.

| Tool | Description |
|------|-------------|
| `fal_search_models` | **Search fal.ai's full model catalog in real-time** (query, category, pagination) |
| `fal_run` | Run any model synchronously (best for fast ops like image gen) |
| `fal_submit` | Submit async job to queue (recommended for video, anything >30s) |
| `fal_status` | Check queue job status (IN_QUEUE, IN_PROGRESS, COMPLETED) |
| `fal_result` | Get completed job output (auto-downloads to `FAL_OUTPUT_DIR` or `~/Desktop/`) |
| `fal_cancel` | Cancel a queued job |
| `fal_upload` | Upload local file to fal CDN |
