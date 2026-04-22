// CJS entry point for Claude Desktop's built-in Node.js
process.on("uncaughtException", (err) => {
  console.error("[fal-ai] Uncaught exception:", err.stack || err.message || err);
});
process.on("unhandledRejection", (err) => {
  console.error("[fal-ai] Unhandled rejection:", err);
});

console.error("[fal-ai] entry.cjs loaded, starting dynamic import...");

import("./dist/mcp.js")
  .then(() => {
    console.error("[fal-ai] ESM module loaded successfully");
  })
  .catch((err) => {
    console.error("[fal-ai] Failed to import ESM module:", err.stack || err.message || err);
    process.exit(1);
  });
