# Kling 3.0 Video Generation Skill

Generate AI videos using Kling 3.0 via the Fal.ai MCP primitives.

## When to Use This Skill

Use this skill when the user asks to generate a video using Kling 3.0, or any video
that needs multi-scene/multi-shot generation via the Fal.ai primitives.

## Available Endpoints

| Alias | Full Model ID | Type |
|-------|---------------|------|
| kling-3.0 | `fal-ai/kling-video/v3/pro/image-to-video` | Image-to-video (requires start frame) |
| — | `fal-ai/kling-video/v3/pro/text-to-video` | Text-to-video with multi-prompt |
| — | `fal-ai/kling-video/v3/standard/text-to-video` | Text-to-video standard (faster, cheaper) |
| — | `fal-ai/kling-video/o3/pro/text-to-video` | O3 Pro: character consistency with image elements |
| — | `fal-ai/kling-video/o3/pro/image-to-video` | O3 Pro image-to-video |

**Important:** The `kling-3.0` alias points to image-to-video only. For text-to-video,
you MUST use the full model ID: `fal-ai/kling-video/v3/pro/text-to-video`

## Text-to-Video

### Single Prompt

```json
{
  "prompt": "A street musician plays saxophone on a rainy Paris bridge at dusk, camera dollies in slowly from across the bridge, warm streetlamp glow reflecting off wet cobblestones, cinematic 35mm film look. AUDIO: smooth jazz saxophone melody, rain pattering on stone, distant car tires on wet road, no speech.",
  "duration": "10",
  "aspect_ratio": "16:9",
  "generate_audio": true,
  "cfg_scale": 0.5
}
```

### Multi-Prompt (Multiple Shots in One Generation)

Each shot gets its own prompt and duration. Use `prompt` OR `multi_prompt`, never both.

```json
{
  "multi_prompt": [
    { "prompt": "Wide shot of a chef entering a bustling restaurant kitchen, camera tracks alongside at waist level, warm overhead lighting. AUDIO: sizzling pans, clattering dishes, the chef calls out 'Order up!' in a commanding voice, no music.", "duration": "4" },
    { "prompt": "Close-up of the chef's hands plating a delicate dish, camera locked off at counter level, shallow depth of field. AUDIO: gentle clinking of ceramic, soft scrape of a spoon, kitchen chatter muffled in background, no music.", "duration": "3" },
    { "prompt": "Medium shot as the chef steps back and admires the finished plate, warm smile, camera slowly pulls back revealing the full kitchen. AUDIO: kitchen ambiance fading slightly, gentle uplifting piano melody fading in, no speech.", "duration": "5" }
  ],
  "shot_type": "customize",
  "aspect_ratio": "16:9",
  "generate_audio": true,
  "cfg_scale": 0.5
}
```

## Image-to-Video

Requires `start_image_url`. Optionally accepts `end_image_url` for last-frame control.

### Single Prompt with Start and End Frame

```json
{
  "start_image_url": "https://example.com/start.png",
  "end_image_url": "https://example.com/end.png",
  "prompt": "Camera slowly pushes forward through a snowy forest clearing, snowflakes drifting down gently. AUDIO: soft wind through pine branches, quiet crunch of snow settling, no speech, no music.",
  "duration": "5",
  "generate_audio": true
}
```

### Multi-Prompt with Start Frame (No End Frame)

Image-to-video supports `multi_prompt` for multi-shot sequences from a start frame.
**Important:** `end_image_url` is incompatible with `multi_prompt`. Minimum shot duration is `"3"` for image-to-video multi_prompt.

```json
{
  "start_image_url": "https://example.com/start.png",
  "multi_prompt": [
    { "prompt": "Shot 1: camera holds steady on a woman standing at the edge of a cliff overlooking the ocean, wind blowing her hair. AUDIO: ocean waves crashing on rocks below, strong wind gusting, no speech, no music.", "duration": "3" },
    { "prompt": "Shot 2: slow zoom into her face as she closes her eyes and takes a deep breath, golden hour light on her skin. AUDIO: wind softening, her slow exhale audible, gentle ambient drone building softly, no speech.", "duration": "4" }
  ],
  "shot_type": "customize",
  "generate_audio": true
}
```

## Elements (Character/Object Consistency)

Elements let you reference specific characters or objects across the video. **Only available on image-to-video endpoints**, not text-to-video.

Reference elements in prompts as `@Element1`, `@Element2`, etc.

### Image Elements (Validated)

Provide a frontal image and optional reference images for additional angles:

```json
{
  "start_image_url": "https://example.com/scene.png",
  "prompt": "The @Element1 walks through the scene",
  "elements": [
    {
      "frontal_image_url": "https://example.com/character-front.png",
      "reference_image_urls": ["https://example.com/character-side.png"]
    }
  ],
  "duration": "5"
}
```

Note: Elements with images take significantly longer to render (~350s vs ~120s without).

### Video Elements (Validated)

Video elements allow referencing a character or object from a video clip. The video must be at least 720px wide and no longer than 10.05 seconds.

```json
{
  "start_image_url": "https://example.com/scene.png",
  "prompt": "The @Element1 enters the room",
  "elements": [
    {
      "video_url": "https://example.com/character-clip.mp4"
    }
  ],
  "duration": "5"
}
```

## Parameter Reference

| Parameter | Values | Default | Notes |
|-----------|--------|---------|-------|
| `duration` | `"3"` through `"15"` | `"5"` | Per-shot in multi_prompt, or total in single prompt. Must be a **string**, not integer. Min `"3"` for image-to-video multi_prompt. |
| `aspect_ratio` | `"16:9"`, `"9:16"`, `"1:1"` | `"16:9"` | |
| `generate_audio` | `true` / `false` | `true` | **Cost impact: enabling audio increases cost.** Set to `false` if audio is not needed. Native audio includes music, SFX, and lip-synced voice. |
| `shot_type` | `"customize"`, `"intelligent"` | `"customize"` | **Required** when using multi_prompt |
| `negative_prompt` | string | `"blur, distort, and low quality"` | What to avoid in generation |
| `cfg_scale` | 0.0-1.0 | `0.5` | Higher = stricter prompt adherence |
| `voice_ids` | list of strings | — | Max 2 voices. Reference as `<<<voice_1>>>` and `<<<voice_2>>>` in prompt |
| `start_image_url` | string | — | Required for image-to-video endpoints |
| `end_image_url` | string | — | Optional last-frame control (image-to-video only). Incompatible with `multi_prompt`. |
| `elements` | list of objects | — | Image-to-video only. See Elements section above. |

## Audio & Voice

Kling 3.0 generates audio natively, no separate TTS tool needed. **Audio generation increases cost** — always confirm with the user whether audio is needed before enabling it.

- `generate_audio: true` — generates synchronized audio (music, SFX, lip-synced speech). **Costs more.**
- `generate_audio: false` — silent video. **Cheaper.**
- Always explicitly set `generate_audio` in the input — do not rely on the default.

### Audio Prompting (REQUIRED when `generate_audio: true`)

**When `generate_audio` is `true`, you MUST describe the audio explicitly in the prompt.** Add an `AUDIO:` section at the end of each shot or prompt that specifies exactly what should be heard. If you don't describe the audio, the model will generate random/generic sounds that may not match the scene.

Always cover these three categories — include or explicitly exclude each one:

1. **Speech/Voice:** Who speaks, what they say, and their tone/emotion. If nobody speaks, say "no speech" or "no dialogue."
   - "the man shouts 'Watch out!' in a panicked voice"
   - Use `<<<voice_1>>>` and `<<<voice_2>>>` syntax to reference custom `voice_ids`
   - Supports Chinese and English natively; other languages auto-translate to English
   - Use lowercase for normal speech, UPPERCASE for acronyms and proper nouns

2. **Sound effects / Ambient:** Environmental and action sounds grounding the scene.
   - "sizzling oil in a hot pan, clattering dishes in background"
   - "footsteps on gravel, birds chirping overhead"

3. **Music / Soundtrack:** Background score or explicit absence of it.
   - "tense orchestral score building"
   - "soft acoustic guitar melody"
   - "no music"

**Format:** End the visual prompt with `AUDIO:` followed by all audio elements in one sentence.

Example: `"...warm golden light. AUDIO: crowd cheering loudly, the announcer shouts 'Goal!' with excitement, triumphant brass fanfare swelling."`

## Workflow

Video generation takes 2-6 minutes (longer with elements). Always use async:

1. `fal_submit` with the appropriate model_id and `wait: false`
2. `fal_status` to poll until `COMPLETED`
3. `fal_result` to retrieve the .mp4

Never use `fal_run` (sync) for video, it will timeout.

**Detecting silent failures:** If `fal_status` returns `COMPLETED` but `inference_time` is < 5 seconds,
the job almost certainly failed. Call `fal_result` to see the error details.

## Common Mistakes

1. **Using the `kling-3.0` alias for text-to-video**: it points to image-to-video only. Use the full model ID.
2. **Using `fal_run` for video**: always use `fal_submit` (async).
3. **Combining `prompt` and `multi_prompt`**: use one or the other.
4. **Forgetting `shot_type`** when using multi_prompt: it's required.
5. **Passing duration as integer**: must be a string: `"10"` not `10`.
6. **Not checking `inference_time`**: a "completed" job with < 5s inference is a silent failure.
7. **Using `end_image_url` with `multi_prompt`**: these are incompatible. Use one or the other.
8. **Shot duration too short for image-to-video multi_prompt**: minimum is `"3"`.
9. **Video element too small or too long**: minimum 720px width, maximum 10.05s duration.
10. **Forgetting to upload local files first**: use `fal_upload` for local images/videos before passing URLs.
