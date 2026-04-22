# Fal.ai CLI & MCP Server

[![npm version](https://img.shields.io/npm/v/@zencocoon/fal.svg)](https://www.npmjs.com/package/@zencocoon/fal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)

Run any fal.ai model from the terminal or through an MCP server. Dynamic model discovery across 1300+ models, shortcut aliases for popular models, and companion skills for Kling 3.0, Nano Banana 2, and Seedance 2.0.

## Features

- **Dynamic model discovery** — search fal.ai's full catalog in real-time, no code updates needed when new models launch
- **CLI with shortcuts** — `generate`, `edit`, `video`, `upscale` commands with friendly flags
- **Generic commands** — `run`, `submit`, `status`, `result`, `cancel` work with any model using raw JSON
- **MCP server** — 8 tools for Claude Desktop, Claude Code, Cursor, and other MCP clients
- **Companion skills** — detailed prompting guides for Kling 3.0, Seedance 2.0, and Nano Banana 2
- **Auto-save** — outputs auto-download to your Desktop (or `FAL_OUTPUT_DIR`)
- **Local file upload** — local images/videos/audio are auto-uploaded to fal CDN

## Requirements

- Node.js >= 18
- A fal.ai API key ([get one here](https://fal.ai/dashboard/keys))

## Installation

```bash
# Zero-install (recommended)
npx @zencocoon/fal models seedance

# Global install
npm install -g @zencocoon/fal

# From source
git clone https://github.com/zencocoon/fal.git
cd fal && npm install && npm run build
```

Set your API key:

```bash
export FAL_KEY="your-fal-api-key"
```

## Quick Start

```bash
# Search for models
fal models seedance
fal models --category text-to-video
fal models chatgpt

# Generate an image
fal generate -p "A sunset over the ocean" -o sunset.png

# Run any model directly
fal run openai/gpt-image-2 -i '{"prompt": "A cat astronaut", "image_size": "square_hd"}'

# Generate a video
fal video --start photo.png -p "slow zoom in, golden hour light" -m seedance-2.0

# Upscale an image
fal upscale --image photo.jpg --scale 4 -o photo-4x.png
```

## MCP Integration

### Claude Code

```bash
claude mcp add fal-ai -- npx -y @zencocoon/fal@latest
```

### Claude Desktop / Cursor

Add to your MCP config (`~/.claude/claude_desktop_config.json` or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "fal-ai": {
      "command": "npx",
      "args": ["-y", "@zencocoon/fal@latest"],
      "env": {
        "FAL_KEY": "your-fal-api-key"
      }
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `fal_search_models` | Search fal.ai's full model catalog in real-time |
| `fal_run` | Run any model synchronously (image gen, upscaling) |
| `fal_submit` | Submit async job (video gen, anything >30s) |
| `fal_status` | Check job status (IN_QUEUE, IN_PROGRESS, COMPLETED) |
| `fal_result` | Get completed job output |
| `fal_cancel` | Cancel a queued job |
| `fal_upload` | Upload local file to fal CDN |
| `fal_list_aliases` | List shortcut aliases |

## CLI Commands

### Shortcut Commands

#### `generate` — Text-to-Image

```bash
fal generate -p "A sunset over the ocean" -o sunset.png
fal generate -p "..." -m flux-2-flex --size landscape_16_9
fal generate -p "..." -m nano-banana-2 --ratio 16:9 --resolution 2K
```

#### `edit` — Image Editing

```bash
fal edit -p "Add string lights" --images photo.png -o result.png
```

#### `video` — Video Generation

```bash
fal video --start frame.png -p "smooth zoom in" -m seedance-2.0
fal video --start img.png -p "..." -m kling-3.0 --duration 10 --no-audio
```

#### `upscale` — Image Upscaling

```bash
fal upscale --image photo.jpg --scale 4 -o photo-4x.png
```

### Generic Commands

```bash
# Run any model synchronously
fal run fal-ai/flux-lora -i '{"prompt": "a cat", "loras": [...]}'

# Submit async and poll
fal submit seedance-t2v -i '{"prompt": "..."}'
fal status bytedance/seedance-2.0/text-to-video REQUEST_ID
fal result bytedance/seedance-2.0/text-to-video REQUEST_ID

# Upload a file
fal upload photo.png

# Search models
fal models seedance
fal models --category text-to-video --limit 10

# List shortcut aliases
fal aliases
```

## Model Aliases

Shortcut aliases for popular models. Use `fal models <query>` to discover any model dynamically.

| Alias | Model |
|-------|-------|
| `nano-banana-2` | `fal-ai/nano-banana-2` |
| `nano-banana-pro` | `fal-ai/nano-banana-pro` |
| `flux-2-flex` | `fal-ai/flux-2-flex` |
| `flux-2-flash` | `fal-ai/flux-2-flash` |
| `flux-lora` | `fal-ai/flux-lora` |
| `kling-2.6` | `fal-ai/kling-video/v2.6/pro/image-to-video` |
| `kling-3.0` | `fal-ai/kling-video/v3/pro/image-to-video` |
| `kling-t2v` | `fal-ai/kling-video/v2.6/pro/text-to-video` |
| `ltx-video` | `fal-ai/ltx-video/v2.3/image-to-video` |
| `veo3` | `fal-ai/veo3` |
| `esrgan` | `fal-ai/esrgan` |
| `recraft-v4` | `fal-ai/recraft-v4/text-to-image` |
| `seedance-2.0` | `bytedance/seedance-2.0/image-to-video` |
| `seedance-t2v` | `bytedance/seedance-2.0/text-to-video` |
| `seedance-ref` | `bytedance/seedance-2.0/reference-to-video` |
| `seedance-fast` | `bytedance/seedance-2.0/fast/image-to-video` |

Any full model ID also works directly — use `fal models <query>` to find the exact endpoint.

## Companion Skills

Detailed prompting guides and parameter references are included for:

- **Kling 3.0** (`skills/kling-3.0/SKILL.md`) — multi-prompt, elements, voice, audio prompting
- **Seedance 2.0** (`skills/seedance-2.0/SKILL.md`) — 6-layer prompt architecture, multi-shot brackets, multimodal references
- **Nano Banana 2** (`skills/nano-banana-2/SKILL.md`) — text-to-image, image-to-image, editing

These are automatically loaded by Claude when the MCP server is active.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FAL_KEY` | fal.ai API key (also accepts `FAL_AI_API_KEY`) | required |
| `FAL_OUTPUT_DIR` | Directory for auto-saved outputs | `~/Desktop` |

## License

[MIT](LICENSE)
