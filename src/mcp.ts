#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  fal,
  resolveModel,
  MODEL_ALIASES,
  saveOutput,
  autoSaveOutput,
  uploadFile,
  extractApiError,
  searchModels,
} from "./core";

console.error("[fal-ai] Loading MCP server module...");

// ── Tool definitions (primitives only) ──

const TOOLS = [
  {
    name: "fal_submit",
    description:
      "Submit an async job to any fal.ai model. IMPORTANT: Do NOT guess model IDs — they are not intuitive (e.g. Seedance 2.0 is \"bytedance/seedance-2.0/image-to-video\", not \"fal-ai/seedance-2.0\"). If you are not 100% certain of the exact endpoint ID, call fal_search_models first to find it. Aliases from fal_list_aliases are a small subset — fal_search_models searches the full live catalog of 1300+ models. Input must be a JSON string matching the target model's API schema. Returns a request_id for tracking with fal_status and fal_result. Recommended for video generation and any job taking >30 seconds.",
    inputSchema: {
      type: "object" as const,
      properties: {
        model_id: {
          type: "string",
          description: "Model alias or full model ID",
        },
        input: {
          type: "string",
          description: "JSON string of model input parameters",
        },
        wait: {
          type: "boolean",
          description:
            "Wait for completion and return result (default: false). For video, prefer false and poll with fal_status.",
        },
        output: {
          type: "string",
          description:
            "Save first output file locally (only with wait: true)",
        },
      },
      required: ["model_id", "input"],
    },
  },
  {
    name: "fal_run",
    description:
      "Run any fal.ai model synchronously. Best for fast operations like image generation or upscaling. For video generation, prefer fal_submit (async) to avoid timeouts. IMPORTANT: Do NOT guess model IDs. If unsure of the exact endpoint ID, call fal_search_models first — model IDs are vendor-specific paths, not simple names.",
    inputSchema: {
      type: "object" as const,
      properties: {
        model_id: {
          type: "string",
          description: "Model alias or full model ID",
        },
        input: {
          type: "string",
          description: "JSON string of model input parameters",
        },
        output: {
          type: "string",
          description: "Save first output file locally",
        },
      },
      required: ["model_id", "input"],
    },
  },
  {
    name: "fal_status",
    description:
      "Check the status of a queued fal.ai job. Returns IN_QUEUE, IN_PROGRESS, or COMPLETED with timing info.",
    inputSchema: {
      type: "object" as const,
      properties: {
        model_id: {
          type: "string",
          description: "Model alias or full model ID",
        },
        request_id: {
          type: "string",
          description: "Request ID from fal_submit",
        },
        logs: { type: "boolean", description: "Include processing logs" },
      },
      required: ["model_id", "request_id"],
    },
  },
  {
    name: "fal_result",
    description:
      "Get the result of a completed fal.ai job. Returns the output (video URL, image URLs, etc.). If inference_time is suspiciously short (<5 seconds for video), the job likely failed — check the response for error details.",
    inputSchema: {
      type: "object" as const,
      properties: {
        model_id: {
          type: "string",
          description: "Model alias or full model ID",
        },
        request_id: {
          type: "string",
          description: "Request ID from fal_submit",
        },
        output: {
          type: "string",
          description: "Save first output file locally",
        },
      },
      required: ["model_id", "request_id"],
    },
  },
  {
    name: "fal_cancel",
    description: "Cancel a queued fal.ai job.",
    inputSchema: {
      type: "object" as const,
      properties: {
        model_id: {
          type: "string",
          description: "Model alias or full model ID",
        },
        request_id: {
          type: "string",
          description: "Request ID to cancel",
        },
      },
      required: ["model_id", "request_id"],
    },
  },
  {
    name: "fal_upload",
    description:
      "Upload a local file to fal.ai CDN and get a URL back. Use this to prepare images/videos as inputs for other tools.",
    inputSchema: {
      type: "object" as const,
      properties: {
        file_path: {
          type: "string",
          description: "Local file path to upload",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "fal_search_models",
    description:
      "ALWAYS call this tool FIRST when the user requests a model you don't have the exact endpoint ID for. Searches fal.ai's full live catalog of 1300+ models in real-time. Returns the exact endpoint_id to pass to fal_run or fal_submit. Model IDs on fal.ai are NOT guessable — they follow vendor-specific paths (e.g. \"bytedance/seedance-2.0/image-to-video\", \"fal-ai/kling-video/v3.0/pro/image-to-video\"). Guessing will either hit the wrong model or fail silently. New models appear here immediately when published — no code update needed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query (e.g. \"seedance\", \"flux\", \"kling\"). Omit to list all models.",
        },
        category: {
          type: "string",
          description:
            "Filter by category: text-to-image, image-to-image, text-to-video, image-to-video, video-to-video, text-to-audio, speech-to-text, llm, vision, training",
        },
        limit: {
          type: "number",
          description: "Max results to return (default: 20)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor from previous search to get next page",
        },
      },
    },
  },
  {
    name: "fal_list_aliases",
    description:
      "List hardcoded shortcut aliases. WARNING: This is a tiny subset of available models. If the model you need is NOT in this list, do NOT guess the model ID — call fal_search_models instead to search the full live catalog. Guessing model IDs will fail or hit the wrong model.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

// ── Tool handlers ──

async function handleTool(
  name: string,
  args: Record<string, any>
): Promise<string> {
  switch (name) {
    case "fal_run": {
      const model = resolveModel(args.model_id);
      let input: Record<string, any>;
      try {
        input = JSON.parse(args.input);
      } catch {
        return "Error: Invalid JSON in input parameter. Ensure the input is a valid JSON string.";
      }
      try {
        const result = await fal.run(model, { input });
        if (args.output) {
          const saved = await saveOutput(result.data, args.output);
          if (saved)
            return `Saved to ${args.output} (${saved})\n${JSON.stringify(result.data, null, 2)}`;
        }
        const auto = await autoSaveOutput(result.data, model);
        if (auto)
          return `Auto-saved to ${auto.path} (${auto.size})\n${JSON.stringify(result.data, null, 2)}`;
        return JSON.stringify(result.data, null, 2);
      } catch (err: any) {
        return await extractApiError(err);
      }
    }

    case "fal_submit": {
      const model = resolveModel(args.model_id);
      let input: Record<string, any>;
      try {
        input = JSON.parse(args.input);
      } catch {
        return "Error: Invalid JSON in input parameter. Ensure the input is a valid JSON string.";
      }
      if (args.wait) {
        try {
          const result = await fal.subscribe(model, { input });
          if (args.output) {
            const saved = await saveOutput(result.data, args.output);
            if (saved)
              return `Saved to ${args.output} (${saved})\n${JSON.stringify(result.data, null, 2)}`;
          }
          const auto = await autoSaveOutput(result.data, model);
          if (auto)
            return `Auto-saved to ${auto.path} (${auto.size})\n${JSON.stringify(result.data, null, 2)}`;
          return JSON.stringify(result.data, null, 2);
        } catch (err: any) {
          return await extractApiError(err);
        }
      }
      try {
        return JSON.stringify(
          await fal.queue.submit(model, { input }),
          null,
          2
        );
      } catch (err: any) {
        return await extractApiError(err);
      }
    }

    case "fal_status": {
      const model = resolveModel(args.model_id);
      try {
        const result = await fal.queue.status(model, {
          requestId: args.request_id,
          logs: args.logs ? true : undefined,
        });
        return JSON.stringify(result, null, 2);
      } catch (err: any) {
        return await extractApiError(err);
      }
    }

    case "fal_result": {
      const model = resolveModel(args.model_id);
      try {
        const result = await fal.queue.result(model, {
          requestId: args.request_id,
        });
        if (args.output) {
          const saved = await saveOutput(result.data, args.output);
          if (saved)
            return `Saved to ${args.output} (${saved})\n${JSON.stringify(result.data, null, 2)}`;
        }
        const auto = await autoSaveOutput(result.data, model);
        if (auto)
          return `Auto-saved to ${auto.path} (${auto.size})\n${JSON.stringify(result.data, null, 2)}`;
        return JSON.stringify(result.data, null, 2);
      } catch (err: any) {
        return await extractApiError(err);
      }
    }

    case "fal_cancel": {
      try {
        await fal.queue.cancel(resolveModel(args.model_id), {
          requestId: args.request_id,
        });
        return "Cancelled.";
      } catch (err: any) {
        return await extractApiError(err);
      }
    }

    case "fal_upload": {
      try {
        return await uploadFile(args.file_path);
      } catch (err: any) {
        return `Upload error: ${err.message}`;
      }
    }

    case "fal_search_models": {
      try {
        const result = await searchModels({
          query: args.query,
          category: args.category,
          limit: args.limit || 20,
          cursor: args.cursor,
        });

        if (result.models.length === 0) {
          return "No models found." + (args.query ? ` Try a different search term.` : "");
        }

        const lines = result.models.map(
          (m) =>
            `${m.endpoint_id.padEnd(45)} ${m.category.padEnd(18)} ${m.display_name}`
        );
        let output = `${"MODEL ID".padEnd(45)} ${"CATEGORY".padEnd(18)} DISPLAY NAME\n${"-".repeat(100)}\n${lines.join("\n")}`;

        if (result.has_more && result.next_cursor) {
          output += `\n\n[More results available — pass cursor: "${result.next_cursor}" to get next page]`;
        }

        return output;
      } catch (err: any) {
        return `Model search error: ${err.message}`;
      }
    }

    case "fal_list_aliases": {
      const lines = Object.entries(MODEL_ALIASES).map(
        ([alias, id]) => `${alias.padEnd(20)} ${id}`
      );
      return `${"ALIAS".padEnd(20)} MODEL ID\n${"-".repeat(70)}\n${lines.join("\n")}\n\n⚠️  This is a SMALL subset of 1300+ models on fal.ai. If the model you need is NOT listed above, do NOT guess the ID — call fal_search_models to search the full live catalog. Model IDs are vendor-specific paths that cannot be guessed reliably.`;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Server setup ──

function createServer(): Server {
  const server = new Server(
    { name: "fal-ai", version: "3.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const text = await handleTool(name, args || {});
      return { content: [{ type: "text", text }] };
    } catch (err: any) {
      const errText = await extractApiError(err);
      return {
        content: [{ type: "text", text: errText }],
        isError: true,
      };
    }
  });

  return server;
}

// ── Transport setup ──

async function main() {
  console.error("[fal-ai] main() started");
  console.error("[fal-ai] FAL_KEY set:", !!process.env.FAL_KEY);
  console.error("[fal-ai] Node version:", process.version);

  const server = createServer();
  console.error("[fal-ai] Server created, connecting stdio transport...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[fal-ai] Connected and ready");
}

main().catch((err) => {
  console.error("[fal-ai] Fatal error:", err?.stack || err);
  process.exit(1);
});
