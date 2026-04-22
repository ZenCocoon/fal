# Nano Banana 2 Image Generation Skill

Generate and edit images using Nano Banana 2 via the Fal.ai MCP primitives.

## When to Use This Skill

Use this skill when the user asks to generate images, edit images, or transform images
using Nano Banana 2 (or when image generation is needed and no specific model is requested).

## Available Endpoints

| Full Model ID | Type |
|---------------|------|
| `fal-ai/nano-banana-2` | Text-to-image AND image-to-image (same endpoint) |
| `fal-ai/nano-banana-2/edit` | Image editing with reference images |

## Text-to-Image

```json
{
  "prompt": "Your image description",
  "aspect_ratio": "16:9",
  "resolution": "2K",
  "num_images": 1
}
```

## Image-to-Image (Style Transfer / Transformation)

Same endpoint as text-to-image, just add `image_urls`:

```json
{
  "prompt": "Transform this into a summer scene with green meadows",
  "image_urls": ["https://example.com/source-image.png"],
  "aspect_ratio": "16:9",
  "resolution": "2K"
}
```

## Image Editing (Add/Remove/Modify Elements)

Uses the separate `/edit` endpoint:

```json
{
  "prompt": "Add a wooden sign that reads Welcome, add string lights along the roof",
  "image_urls": ["https://example.com/source-image.png"],
  "resolution": "2K"
}
```

## Parameter Reference

| Parameter | Values | Default | Notes |
|-----------|--------|---------|-------|
| `prompt` | string (3-50,000 chars) | required | |
| `num_images` | 1-4 | 1 | |
| `aspect_ratio` | `"auto"`, `"21:9"`, `"16:9"`, `"3:2"`, `"4:3"`, `"5:4"`, `"1:1"`, `"4:5"`, `"3:4"`, `"2:3"`, `"9:16"`, `"4:1"`, `"1:4"`, `"8:1"`, `"1:8"` | `"auto"` | |
| `resolution` | `"0.5K"`, `"1K"`, `"2K"`, `"4K"` | `"1K"` | Higher = slower + more expensive |
| `output_format` | `"jpeg"`, `"png"`, `"webp"` | `"png"` | |
| `seed` | integer | — | For reproducible results |
| `image_urls` | list of strings | — | Required for image-to-image and edit |
| `enable_web_search` | `true` / `false` | `false` | Uses web for grounding |
| `thinking_level` | `"minimal"`, `"high"` | — | Controls reasoning depth |
| `safety_tolerance` | `"1"` through `"6"` | `"4"` | 1 = strictest |

## Workflow

Image generation takes 50-65 seconds at 2K. **Always use async**, synchronous calls will timeout.

1. `fal_submit` with `model_id: "fal-ai/nano-banana-2"` (or `fal-ai/nano-banana-2/edit`) and `wait: false`
2. `fal_status` to poll until `COMPLETED`
3. `fal_result` to retrieve the image URL(s)

The response contains:
```json
{
  "images": [{ "url": "...", "content_type": "image/png", "file_name": "...", "width": ..., "height": ... }],
  "description": ""
}
```

## Common Mistakes

1. **Using `fal_run` (sync)**: generation takes 50-65s at 2K, which exceeds tool timeouts. Always use `fal_submit`.
2. **Using `/edit` endpoint for image-to-image**: basic image-to-image (style transfer, transformation) uses the base endpoint with `image_urls`. The `/edit` endpoint is for adding/removing/modifying specific elements.
3. **Confusing the two endpoints**: base endpoint = generation + transformation. `/edit` endpoint = targeted editing.
4. **Forgetting to upload local files first**: use `fal_upload` for local images before passing URLs to the model.
