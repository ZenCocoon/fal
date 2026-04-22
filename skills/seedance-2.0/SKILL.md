# Seedance 2.0 Video Generation Skill

Generate AI videos using ByteDance's Seedance 2.0 via the Fal.ai MCP primitives.

## When to Use This Skill

Use this skill when the user asks to generate a video using Seedance 2.0, or when they need
multimodal reference-based video generation (images, videos, and audio as inputs), character
consistency across shots, or native audio/voice generation.

## Available Endpoints

| Full Model ID | Type | Speed |
|---------------|------|-------|
| `bytedance/seedance-2.0/text-to-video` | Text-to-video | Standard |
| `bytedance/seedance-2.0/image-to-video` | Image-to-video (animate a start frame) | Standard |
| `bytedance/seedance-2.0/reference-to-video` | Reference-based (images + videos + audio) | Standard |
| `bytedance/seedance-2.0/fast/text-to-video` | Text-to-video | Fast |
| `bytedance/seedance-2.0/fast/image-to-video` | Image-to-video | Fast |
| `bytedance/seedance-2.0/fast/reference-to-video` | Reference-based | Fast |

**Fast vs Standard:** Fast variants generate quicker at the same resolution. Use fast for iteration/previews, standard for final output.

## Text-to-Video

Only requires a prompt. Good for scenes without a specific start frame.

```json
{
  "prompt": "A woman in a red jacket stands on a windy rooftop at golden hour, hair whipping left, camera dollies in slowly from waist-level revealing the city skyline behind her, cinematic 35mm film look with warm amber grading, sharp focus throughout. AUDIO: strong wind gusting past the microphone, distant city traffic hum below, no music, no speech.",
  "duration": "8",
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "generate_audio": true
}
```

## Image-to-Video

Animates a start frame. Requires `image_url`. Optionally accepts `end_image_url` for last-frame control.

```json
{
  "prompt": "The woman turns to face the camera and smiles, wind catches her scarf, camera holds steady at eye level, soft golden backlight with lens flare, sharp focus throughout. AUDIO: soft wind rustling fabric, the woman says 'Hey, come look at this' in a warm friendly tone, no background music.",
  "image_url": "https://example.com/start-frame.png",
  "duration": "6",
  "aspect_ratio": "auto",
  "resolution": "720p",
  "generate_audio": true
}
```

### With Start and End Frames

```json
{
  "prompt": "Smooth transition from day to night, city lights gradually appear, camera locked off on tripod, time-lapse feel with stable framing",
  "image_url": "https://example.com/day.png",
  "end_image_url": "https://example.com/night.png",
  "duration": "10",
  "aspect_ratio": "16:9",
  "resolution": "720p"
}
```

## Reference-to-Video (Multimodal)

The most powerful endpoint. Accepts up to 9 images, 3 videos, and 3 audio files as references.
Reference them in the prompt as `@Image1`, `@Video1`, `@Audio1`, etc.

### Character Consistency with Image Reference

```json
{
  "prompt": "The same woman from @Image1 walks through a neon-lit Tokyo alley at night, rain-slicked pavement reflecting pink and blue signs, camera tracks alongside at hip level, anamorphic lens flare from neon signs, identity stays locked on reference face, sharp focus throughout. AUDIO: footsteps splashing on wet pavement, muffled Japanese pop music leaking from a nearby bar, electric hum of neon signs, no speech.",
  "image_urls": ["https://example.com/character-portrait.png"],
  "duration": "8",
  "aspect_ratio": "9:16",
  "resolution": "720p",
  "generate_audio": true
}
```

### With Video and Audio References

```json
{
  "prompt": "The athlete from @Image1 performs the same movement as @Video1, crowd cheering builds to a roar matching @Audio1, camera follows the action in a tracking shot at chest level, sports broadcast look with vivid color, sharp focus throughout",
  "image_urls": ["https://example.com/athlete.png"],
  "video_urls": ["https://example.com/reference-movement.mp4"],
  "audio_urls": ["https://example.com/crowd-cheer.mp3"],
  "duration": "10",
  "aspect_ratio": "16:9",
  "resolution": "720p"
}
```

## Multi-Shot Generation (Bracket Syntax)

Seedance 2.0 supports multi-shot sequences within a single prompt using bracket syntax.
Each bracket defines one shot with its own camera and action. Keep a global style and
constraints line outside the brackets.

```json
{
  "prompt": "[Shot 1, 4 seconds: Close-up of a barista's hands tamping espresso grounds into a portafilter, steam wisps rising, camera locked off at counter level, warm tungsten overhead light. AUDIO: rhythmic tapping of the tamper on metal, hiss of the espresso machine warming up]\n[Shot 2, 3 seconds: Medium shot as the barista locks the portafilter and espresso streams into a white cup, camera dollies in slowly, golden liquid catching the light. AUDIO: rich gurgling of espresso pouring, gentle clinking of ceramic]\n[Shot 3, 4 seconds: The barista slides the cup across the counter toward camera with a smile, shallow depth of field rack-focuses from hands to face, soft morning window light. AUDIO: the barista says 'Here you go' in a calm friendly voice, soft lo-fi jazz playing in the background]\nCinematic 35mm film look with warm golden grading throughout. Sharp focus on subject, identity stays locked across all shots.",
  "duration": "auto",
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "generate_audio": true
}
```

**Multi-shot rules:**
- Each bracket = one shot with ONE camera instruction
- Reference the same character description across shots for consistency
- Total duration 6-15 seconds, max 5 shots (3 is the sweet spot)
- Single shots: 60-100 words. Multi-shot: 150-200 words total (hard max: 200)
- Global style and constraints go outside brackets

## Parameter Reference

| Parameter | Values | Default | Notes |
|-----------|--------|---------|-------|
| `prompt` | string | **required** | Video description. See Prompting Guide below. |
| `image_url` | string | — | **Required** for image-to-video. Start frame (JPEG/PNG/WebP, max 30 MB). |
| `end_image_url` | string | — | Optional last-frame control (image-to-video only). |
| `image_urls` | list of strings | — | Reference images for reference-to-video. Up to 9. Reference as `@Image1`, `@Image2`, etc. |
| `video_urls` | list of strings | — | Reference videos for reference-to-video. Up to 3, combined 2-15s, max 50 MB total. Reference as `@Video1`, etc. |
| `audio_urls` | list of strings | — | Reference audio for reference-to-video. Up to 3, combined max 15s, 15 MB per file. Reference as `@Audio1`, etc. |
| `duration` | `"auto"`, `"4"` through `"15"` | `"auto"` | Must be a **string**, not integer. |
| `aspect_ratio` | `"auto"`, `"21:9"`, `"16:9"`, `"4:3"`, `"1:1"`, `"3:4"`, `"9:16"` | `"auto"` | `auto` infers from input image when available. |
| `resolution` | `"480p"`, `"720p"` | `"720p"` | 480p is faster, 720p is higher quality. |
| `generate_audio` | `true` / `false` | `true` | **Cost impact: enabling audio increases cost.** Set to `false` if audio is not needed. Native audio includes sound effects, ambient sounds, and lip-synced speech. |
| `seed` | integer | — | For reproducibility (results may still vary slightly). |

## Prompting Guide

Seedance 2.0 responds best to structured, physics-aware prompts. Follow this 6-layer order:

### 1. Subject
Be specific about who/what. Not "a person" but "a woman in her 30s wearing a red leather jacket."

### 2. Action
Describe physics, not just verbs. Not "car turns" but "the tires smoke as the car drifts 90 degrees, weight transferring to the outside wheels."

### 3. Environment
Ground the scene. "Rain-slicked Tokyo alley at night, neon signs reflecting pink and blue on wet asphalt."

### 4. Camera (ONE instruction per shot)
Always specify height/level. Good camera moves:

| Move | Example |
|------|---------|
| Dolly in | "camera dollies in slowly from waist-level" |
| Dolly out | "camera pulls back revealing the full scene" |
| Pan | "camera pans left following the subject at eye level" |
| Tracking shot | "camera tracks alongside at hip level" |
| Orbit | "camera arcs 180 degrees around the subject at shoulder height" |
| Aerial/drone | "aerial drone shot descending from 30 feet" |
| Handheld | "handheld camera at chest level, slight natural sway" |
| Static/locked | "camera locked off on tripod, no movement" |

### 5. Style
Use specific film vocabulary. Not "cinematic" alone, but "cinematic 35mm film look with warm golden grading" or "anamorphic widescreen with blue-tinted shadows."

### 6. Constraints (Positive Only)
Always phrase as what TO do, never what to avoid:

| Instead of | Use |
|------------|-----|
| "no blur" | "sharp focus throughout" |
| "no morphing" | "identity stays locked across the entire shot" |
| "no jitter" | "fluid continuous motion" |
| "don't change the face" | "consistent facial features in every frame" |
| "no distortion" | "anatomically correct proportions maintained" |
| "don't crop" | "full body visible in frame at all times" |

### Lighting (Quality Lever #1)

Lighting descriptions dramatically improve output quality:
- "golden hour rim lighting, long shadows raking across the ground"
- "overhead noon sun, hard shadows, squinting eyes"
- "soft overcast diffused light, no harsh shadows"
- "single-source side lighting from a neon sign, deep contrast"
- "warm tungsten practicals mixed with cool moonlight from the window"

### Audio Prompting (REQUIRED when `generate_audio: true`)

**When `generate_audio` is `true`, you MUST describe the audio explicitly in the prompt.** Add an `AUDIO:` section at the end of each shot or prompt that specifies exactly what should be heard. If you don't describe the audio, the model will generate random/generic sounds that may not match the scene.

Always cover these three categories — include or explicitly exclude each one:

1. **Speech/Voice:** Who speaks, what they say, and their tone/emotion. If nobody speaks, say "no speech" or "no dialogue."
   - "the man says 'Watch out!' in a panicked shout"
   - "the narrator speaks in a calm, deep voiceover"
   - "no speech"

2. **Sound effects / Ambient:** Environmental and action sounds grounding the scene.
   - "wind whistling loudly past the camera"
   - "footsteps echoing on marble floor, keys jingling in pocket"
   - "rain pattering on a tin roof, distant thunder rumble"

3. **Music / Soundtrack:** Background score or explicit absence of it.
   - "tense orchestral score building slowly"
   - "lo-fi hip hop beat playing softly"
   - "no music"

**Format:** End the visual prompt with `AUDIO:` followed by all audio elements in one sentence.

Example: `"...sharp focus throughout. AUDIO: wind gusting past the microphone, the woman shouts 'Let's go!' with excitement, no background music."`

### Words to Avoid

| Bad | Fix |
|-----|-----|
| "fast" alone | "accelerates from 0 to 60 in 3 seconds" |
| "cinematic" alone | "cinematic 35mm film look with warm golden grading" |
| "epic" / "amazing" / "beautiful" | Describe the specific visual quality |
| "lots of movement" | Describe the specific movements |
| "dynamic" alone | "whip pan from left to right" |
| "stylized" alone | "art deco geometric patterns with gold leaf accents" |

## Audio

Seedance 2.0 generates audio natively when `generate_audio` is `true`. **Audio generation increases cost** — always confirm with the user whether audio is needed before enabling it.

- `generate_audio: true` — generates synchronized audio (sound effects, ambient sounds, lip-synced speech). **Costs more.**
- `generate_audio: false` — silent video. **Cheaper.**
- Always explicitly set `generate_audio` in the input — do not rely on the default.
- Audio can be prompted within the text prompt (see Audio Prompting in the Prompting Guide above).

## Workflow

Video generation takes 1-5 minutes. Always use async:

1. `fal_submit` with the appropriate endpoint and `wait: false`
2. `fal_status` to poll until `COMPLETED`
3. `fal_result` to retrieve the .mp4

Never use `fal_run` (sync) for video generation — it will timeout.

**Choosing the right endpoint:**
- Pure text description, no source images → `text-to-video`
- Animate a specific start frame → `image-to-video`
- Character/style consistency with reference media → `reference-to-video`
- Quick iteration/preview → use the `fast/` variant of any endpoint

## Common Mistakes

1. **Using `fal_run` (sync) for video**: always use `fal_submit` (async) — video generation will timeout synchronously.
2. **Passing duration as integer**: must be a string: `"10"` not `10`.
3. **Using `image_url` on reference-to-video**: reference-to-video uses `image_urls` (array). `image_url` (singular) is for image-to-video only.
4. **Vague prompts**: "a cinematic video of a person walking" produces poor results. Follow the 6-layer structure with physics-aware descriptions.
5. **Multiple camera moves in one shot**: use ONE camera instruction per shot. Multiple moves cause confusion.
6. **Negative prompts in the prompt text**: Seedance 2.0 has no `negative_prompt` parameter. Use positive constraints instead ("sharp focus throughout" not "no blur").
7. **Exceeding word limits**: single shots should be 60-100 words, multi-shot under 200 words total. Longer prompts degrade quality.
8. **Forgetting to upload local files**: use `fal_upload` for local images/videos/audio before passing URLs.
9. **Wrong reference syntax**: use `@Image1` not `@image1` or `@Img1`. Same for `@Video1`, `@Audio1`.
10. **Using end_image_url with multi-shot brackets**: end frame control and multi-shot sequences don't mix well — pick one approach.
