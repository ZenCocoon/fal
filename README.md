# Fal.ai CLI & MCP Server

[![npm version](https://img.shields.io/npm/v/@sebgrosjean/fal.svg)](https://www.npmjs.com/package/@sebgrosjean/fal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)

Run any fal.ai model from the terminal or through an MCP server. Dynamic model discovery across 1300+ models and companion skills for Kling 3.0, Nano Banana 2, and Seedance 2.0.

## Features

- **Dynamic model discovery** — search fal.ai's full catalog in real-time, no code updates needed when new models launch
- **CLI with shortcuts** — `generate`, `edit`, `video`, `upscale` commands with friendly flags
- **Generic commands** — `run`, `submit`, `status`, `result`, `cancel` work with any model using raw JSON
- **MCP server** — 7 tools for Claude Desktop, Claude Code, Claude CoWork, Cursor, and other MCP clients
- **MCPB package** — one-click install for Claude CoWork users
- **Companion skills** — detailed prompting guides for Kling 3.0, Seedance 2.0, and Nano Banana 2
- **Auto-save** — outputs auto-download to your Desktop (or `FAL_OUTPUT_DIR`)
- **Local file upload** — local images/videos/audio are auto-uploaded to fal CDN

## Requirements

- Node.js >= 18
- A fal.ai API key ([get one here](https://fal.ai/dashboard/keys))

## Installation

### npm (CLI + MCP Server)

```bash
# Zero-install (recommended)
npx @sebgrosjean/fal models seedance

# Global install
npm install -g @sebgrosjean/fal
```

### Claude CoWork (MCPB)

Download `fal.mcpb` from the [latest release](https://github.com/ZenCocoon/fal/releases) and install it in Claude CoWork. The MCPB bundles the MCP server, companion skills, and documentation in a single file — no npm or Node.js setup required on the user's machine.

### Claude Code

```bash
claude mcp add fal -- npx -y @sebgrosjean/fal@latest
```

### Claude Desktop / Cursor

Add to your MCP config (`~/.claude/claude_desktop_config.json` or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "fal": {
      "command": "npx",
      "args": ["-y", "@sebgrosjean/fal@latest"],
      "env": {
        "FAL_KEY": "your-fal-api-key"
      }
    }
  }
}
```

### From Source

```bash
git clone https://github.com/ZenCocoon/fal.git
cd fal && npm install && npm run build
```

Set your API key:

```bash
export FAL_KEY="your-fal-api-key"
```

## Quick Start

```bash
# Search for models (always start here to find the exact endpoint ID)
fal models seedance
fal models --category text-to-video
fal models chatgpt

# Generate an image
fal generate -p "A sunset over the ocean" -o sunset.png

# Run any model directly
fal run openai/gpt-image-2 -i '{"prompt": "A cat astronaut", "image_size": "square_hd"}'

# Generate a video
fal video --start photo.png -p "slow zoom in, golden hour light" -m bytedance/seedance-2.0/image-to-video

# Upscale an image
fal upscale --image photo.jpg --scale 4 -o photo-4x.png
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `fal_search_models` | Search fal.ai's full model catalog in real-time |
| `fal_run` | Run any model synchronously (image gen, upscaling) |
| `fal_submit` | Submit async job (video gen, anything >30s) |
| `fal_status` | Check job status (IN_QUEUE, IN_PROGRESS, COMPLETED) |
| `fal_result` | Get completed job output |
| `fal_cancel` | Cancel a queued job |
| `fal_upload` | Upload local file to fal CDN |

## CLI Commands

### Shortcut Commands

#### `generate` — Text-to-Image

```bash
fal generate -p "A sunset over the ocean" -o sunset.png
fal generate -p "..." -m fal-ai/flux-2-flex --size landscape_16_9
fal generate -p "..." -m fal-ai/nano-banana-2 --ratio 16:9 --resolution 2K
```

#### `edit` — Image Editing

```bash
fal edit -p "Add string lights" --images photo.png -o result.png
```

#### `video` — Video Generation

```bash
fal video --start frame.png -p "smooth zoom in" -m bytedance/seedance-2.0/image-to-video
fal video --start img.png -p "..." -m fal-ai/kling-video/v3/pro/image-to-video --duration 10 --no-audio
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
fal submit bytedance/seedance-2.0/text-to-video -i '{"prompt": "..."}'
fal status bytedance/seedance-2.0/text-to-video REQUEST_ID
fal result bytedance/seedance-2.0/text-to-video REQUEST_ID

# Upload a file
fal upload photo.png

# Search models
fal models seedance
fal models --category text-to-video --limit 10
```

### Model Discovery

Model IDs on fal.ai are vendor-specific paths that can't be guessed (e.g. `bytedance/seedance-2.0/image-to-video`, not `seedance-2.0`). Always use `fal models <query>` to find the exact endpoint ID before running a model.

```bash
fal models seedance              # Search by name
fal models --category text-to-video  # Browse by category
fal models chatgpt --limit 5    # Limit results
```

## Companion Skills

Detailed prompting guides and parameter references are included for:

- **Kling 3.0** (`skills/kling-3.0/SKILL.md`) — multi-prompt, elements, voice, audio prompting
- **Seedance 2.0** (`skills/seedance-2.0/SKILL.md`) — 6-layer prompt architecture, multi-shot brackets, multimodal references (inspired by [timkoda/seedance-skill](https://github.com/timkoda/seedance-skill))
- **Nano Banana 2** (`skills/nano-banana-2/SKILL.md`) — text-to-image, image-to-image, editing

These are automatically loaded by Claude when the MCP server is active.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FAL_KEY` | fal.ai API key (also accepts `FAL_AI_API_KEY`) | required |
| `FAL_OUTPUT_DIR` | Directory for auto-saved outputs | `~/Desktop` |

## License

[MIT](LICENSE)
