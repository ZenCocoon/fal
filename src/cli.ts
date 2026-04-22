#!/usr/bin/env node
import { Command } from "commander";
import * as path from "node:path";
import {
  fal,
  resolveModel,
  MODEL_ALIASES,
  buildGenerateInput,
  buildEditInput,
  buildVideoInput,
  buildUpscaleInput,
  saveOutput,
  resolveUrl,
  uploadFile,
  searchModels,
  extractApiError,
} from "./core";

const program = new Command();
program.name("fal").description("Fal.ai CLI").version("3.0.0");

function parseJSON(input: string): Record<string, any> {
  try {
    return JSON.parse(input);
  } catch {
    console.error("Error: Invalid JSON input. Check your -i/--input value.");
    process.exit(1);
  }
}

// ── generate ──

program
  .command("generate")
  .description("Text-to-image generation")
  .requiredOption("-p, --prompt <prompt>", "Image generation prompt")
  .option("-m, --model <model>", "Model alias or full ID", "nano-banana-2")
  .option("-s, --size <size>", "Size preset (flux models)", "square_hd")
  .option("-n, --num <n>", "Number of images (1-4)", "1")
  .option("--format <format>", "Output format: jpeg, png, webp", "png")
  .option("--ratio <ratio>", "Aspect ratio (nano-banana models)")
  .option("--resolution <res>", "Resolution: 0.5K, 1K, 2K, 4K (nano-banana)")
  .option("--seed <seed>", "Seed for reproducibility")
  .option("--steps <steps>", "Inference steps (flux models)")
  .option("--guidance <scale>", "Guidance scale (flux models)")
  .option("-o, --output <file>", "Save image locally")
  .option("--async", "Submit async instead of waiting")
  .action(async (opts) => {
    try {
      const { model, input } = buildGenerateInput({
        prompt: opts.prompt,
        model: opts.model,
        size: opts.size,
        ratio: opts.ratio,
        resolution: opts.resolution,
        format: opts.format,
        num_images: parseInt(opts.num, 10),
        seed: opts.seed ? parseInt(opts.seed, 10) : undefined,
        steps: opts.steps ? parseInt(opts.steps, 10) : undefined,
        guidance: opts.guidance ? parseFloat(opts.guidance) : undefined,
      });

      if (opts.async) {
        const result = await fal.queue.submit(model, { input });
        console.log(JSON.stringify(result, null, 2));
        const rid = (result as any).request_id;
        if (rid) {
          process.stderr.write(
            `\nTo check:  fal status ${opts.model} ${rid}\nTo get:    fal result ${opts.model} ${rid}\n`
          );
        }
        return;
      }

      process.stderr.write(`Model: ${model}\nGenerating... `);
      const result = await fal.subscribe(model, { input });
      process.stderr.write("done!\n");
      const saved = await saveOutput(result.data, opts.output);
      if (saved) process.stderr.write(`Saved to ${opts.output} (${saved})\n`);
      console.log(JSON.stringify(result.data, null, 2));
    } catch (err: any) {
      console.error(await extractApiError(err));
      process.exit(1);
    }
  });

// ── edit ──

program
  .command("edit")
  .description("Image editing with reference images")
  .requiredOption("-p, --prompt <prompt>", "Edit prompt")
  .requiredOption(
    "--images <urls>",
    "Comma-separated image URLs or local paths"
  )
  .option("-m, --model <model>", "Model alias or full ID", "nano-banana-2")
  .option("-s, --size <size>", "Size preset (non-nano-banana)", "square_hd")
  .option("--format <format>", "Output format: jpeg, png, webp", "png")
  .option("--seed <seed>", "Seed for reproducibility")
  .option("-o, --output <file>", "Save image locally")
  .option("--async", "Submit async instead of waiting")
  .action(async (opts) => {
    try {
      const { model, input } = await buildEditInput({
        prompt: opts.prompt,
        images: opts.images,
        model: opts.model,
        size: opts.size,
        format: opts.format,
        seed: opts.seed ? parseInt(opts.seed, 10) : undefined,
      });

      if (opts.async) {
        const result = await fal.queue.submit(model, { input });
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      process.stderr.write(`Model: ${model}\nGenerating... `);
      const result = await fal.subscribe(model, { input });
      process.stderr.write("done!\n");
      const saved = await saveOutput(result.data, opts.output);
      if (saved) process.stderr.write(`Saved to ${opts.output} (${saved})\n`);
      console.log(JSON.stringify(result.data, null, 2));
    } catch (err: any) {
      console.error(await extractApiError(err));
      process.exit(1);
    }
  });

// ── video ──

program
  .command("video")
  .description("Video generation from images/text")
  .option("-p, --prompt <prompt>", "Video prompt")
  .option("--start <image>", "Start frame image (URL or local path)")
  .option("--end <image>", "End frame image (URL or local path)")
  .option("-m, --model <model>", "Model alias or full ID", "kling-2.6")
  .option("-d, --duration <sec>", "Duration: 5 or 10", "5")
  .option("--ratio <ratio>", "Aspect ratio", "9:16")
  .option("--negative <prompt>", "Negative prompt")
  .option("--no-audio", "Disable audio generation (reduces cost)")
  .option("-o, --output <file>", "Output file path")
  .option("--async", "Submit async instead of waiting")
  .action(async (opts) => {
    if (!opts.prompt && !opts.start) {
      console.error("Error: --prompt and/or --start is required");
      process.exit(1);
    }

    try {
      const { model, input } = await buildVideoInput({
        prompt: opts.prompt,
        start: opts.start,
        end: opts.end,
        model: opts.model,
        duration: opts.duration,
        ratio: opts.ratio,
        negative: opts.negative,
        no_audio: opts.audio === false, // only true when user explicitly passes --no-audio
      });

      const outputPath =
        opts.output ||
        `fal-video-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.mp4`;

      if (opts.async) {
        const result = await fal.queue.submit(model, { input });
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      process.stderr.write(
        `Model: ${model}\nSubmitting (video generation may take 1-5 minutes)...\n`
      );
      const result = await fal.subscribe(model, { input });
      process.stderr.write("Done!\n");
      const saved = await saveOutput(result.data, outputPath, "video");
      if (saved) process.stderr.write(`Saved to ${outputPath} (${saved})\n`);
      console.log(JSON.stringify(result.data, null, 2));
    } catch (err: any) {
      console.error(await extractApiError(err));
      process.exit(1);
    }
  });

// ── upscale ──

program
  .command("upscale")
  .description("Upscale an image (ESRGAN)")
  .requiredOption("--image <url>", "Image URL or local file path")
  .option("--scale <factor>", "Upscale factor 1-8", "2")
  .option("--face", "Optimize for face upscaling")
  .option("--format <format>", "Output format: png, jpeg", "png")
  .option("-o, --output <file>", "Save result locally")
  .option("--async", "Submit async instead of waiting")
  .action(async (opts) => {
    try {
      const { model, input } = await buildUpscaleInput({
        image: opts.image,
        model: "esrgan",
        scale: Math.max(1, Math.min(8, parseFloat(opts.scale) || 2)),
        face: opts.face,
        format: opts.format,
      });

      if (opts.async) {
        const result = await fal.queue.submit(model, { input });
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      process.stderr.write(`Model: ${model}\nUpscaling... `);
      const result = await fal.subscribe(model, { input });
      process.stderr.write("done!\n");
      const saved = await saveOutput(result.data, opts.output);
      if (saved) process.stderr.write(`Saved to ${opts.output} (${saved})\n`);
      console.log(JSON.stringify(result.data, null, 2));
    } catch (err: any) {
      console.error(await extractApiError(err));
      process.exit(1);
    }
  });

// ── run (any model, sync) ──

program
  .command("run <model_id>")
  .description("Run any model synchronously with raw JSON input")
  .requiredOption("-i, --input <json>", "JSON input string")
  .option("-o, --output <file>", "Save first output file locally")
  .action(async (modelId: string, opts) => {
    try {
      const model = resolveModel(modelId);
      const input = parseJSON(opts.input);

      process.stderr.write(`Running ${model}...\n`);
      const result = await fal.run(model, { input });
      const saved = await saveOutput(result.data, opts.output);
      if (saved) process.stderr.write(`Saved to ${opts.output} (${saved})\n`);
      console.log(JSON.stringify(result.data, null, 2));
    } catch (err: any) {
      console.error(await extractApiError(err));
      process.exit(1);
    }
  });

// ── submit (queue) ──

program
  .command("submit <model_id>")
  .description("Submit a job to the queue")
  .requiredOption("-i, --input <json>", "JSON input string")
  .option("--wait", "Wait for completion and return result")
  .option("-o, --output <file>", "Save first output file (with --wait)")
  .option("--timeout <seconds>", "Max wait time", "600")
  .action(async (modelId: string, opts) => {
    try {
      const model = resolveModel(modelId);
      const input = parseJSON(opts.input);

      if (opts.wait) {
        process.stderr.write(`Submitting to ${model}...\n`);
        const result = await fal.subscribe(model, { input });
        const saved = await saveOutput(result.data, opts.output);
        if (saved)
          process.stderr.write(`Saved to ${opts.output} (${saved})\n`);
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        const result = await fal.queue.submit(model, { input });
        console.log(JSON.stringify(result, null, 2));
        const rid = (result as any).request_id;
        if (rid) {
          process.stderr.write(
            `\nTo check:  fal status ${modelId} ${rid}\nTo get:    fal result ${modelId} ${rid}\n`
          );
        }
      }
    } catch (err: any) {
      console.error(await extractApiError(err));
      process.exit(1);
    }
  });

// ── status ──

program
  .command("status <model_id> <request_id>")
  .description("Check queue job status")
  .option("--logs", "Include logs")
  .action(async (modelId: string, requestId: string, opts) => {
    try {
      const model = resolveModel(modelId);
      const result = await fal.queue.status(model, {
        requestId,
        logs: opts.logs ? true : undefined,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (err: any) {
      console.error(await extractApiError(err));
      process.exit(1);
    }
  });

// ── result ──

program
  .command("result <model_id> <request_id>")
  .description("Get queue job result")
  .option("-o, --output <file>", "Save first output file locally")
  .action(async (modelId: string, requestId: string, opts) => {
    try {
      const model = resolveModel(modelId);
      const result = await fal.queue.result(model, { requestId });
      const saved = await saveOutput(result.data, opts.output);
      if (saved) process.stderr.write(`Saved to ${opts.output} (${saved})\n`);
      console.log(JSON.stringify(result.data, null, 2));
    } catch (err: any) {
      console.error(await extractApiError(err));
      process.exit(1);
    }
  });

// ── cancel ──

program
  .command("cancel <model_id> <request_id>")
  .description("Cancel a queued job")
  .action(async (modelId: string, requestId: string) => {
    try {
      const model = resolveModel(modelId);
      await fal.queue.cancel(model, { requestId });
      console.log("Cancelled.");
    } catch (err: any) {
      console.error(await extractApiError(err));
      process.exit(1);
    }
  });

// ── upload ──

program
  .command("upload <file_path>")
  .description("Upload a local file to fal CDN")
  .action(async (filePath: string) => {
    try {
      const stat = await import("node:fs/promises").then((f) =>
        f.stat(filePath)
      );
      const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
      process.stderr.write(
        `Uploading ${path.basename(filePath)} (${sizeMb} MB)... `
      );
      const url = await uploadFile(filePath);
      process.stderr.write("done!\n");
      console.log(url);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ── models (dynamic search) ──

program
  .command("models [query]")
  .description("Search fal.ai models (fetches live from API)")
  .option(
    "-c, --category <category>",
    "Filter by category (text-to-image, image-to-video, text-to-video, etc.)"
  )
  .option("-n, --limit <n>", "Max results", "20")
  .option("--cursor <cursor>", "Pagination cursor for next page")
  .action(async (query: string | undefined, opts) => {
    try {
      const result = await searchModels({
        query,
        category: opts.category,
        limit: Math.min(Math.max(parseInt(opts.limit, 10) || 20, 1), 100),
        cursor: opts.cursor,
      });

      if (result.models.length === 0) {
        console.log("No models found.");
        return;
      }

      console.log(
        `${"MODEL ID".padEnd(45)} ${"CATEGORY".padEnd(18)} DISPLAY NAME\n${"-".repeat(100)}`
      );
      for (const m of result.models) {
        console.log(
          `${m.endpoint_id.padEnd(45)} ${m.category.padEnd(18)} ${m.display_name}`
        );
      }

      if (result.has_more && result.next_cursor) {
        console.log(
          `\nMore results available. Next page: fal models${query ? ` ${query}` : ""} --cursor ${result.next_cursor}`
        );
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ── aliases (backward compat) ──

program
  .command("aliases")
  .description("List shortcut aliases (hardcoded)")
  .action(() => {
    console.log(
      `${"ALIAS".padEnd(20)} MODEL ID\n${"-".repeat(70)}`
    );
    for (const [alias, id] of Object.entries(MODEL_ALIASES)) {
      console.log(`${alias.padEnd(20)} ${id}`);
    }
  });

// ── Run ──

program.parseAsync().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
