import { cp, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(root, "..");
const repoRoot = resolve(extensionRoot, "../..");
const tsc = resolve(repoRoot, "node_modules/.bin/tsc");

await rm(resolve(extensionRoot, "dist"), { recursive: true, force: true });
await mkdir(resolve(extensionRoot, "dist"), { recursive: true });

const result = spawnSync(tsc, ["-p", "tsconfig.json"], {
  cwd: extensionRoot,
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status ?? 1);

await cp(resolve(extensionRoot, "manifest.json"), resolve(extensionRoot, "dist/manifest.json"));
await cp(resolve(extensionRoot, "src/popup/index.html"), resolve(extensionRoot, "dist/popup/index.html"), { recursive: true });
await cp(resolve(extensionRoot, "src/sidepanel/index.html"), resolve(extensionRoot, "dist/sidepanel/index.html"), { recursive: true });
await cp(resolve(extensionRoot, "public/icons"), resolve(extensionRoot, "dist/icons"), { recursive: true });

console.log("NeuralNexus Capture extension built in extensions/neuralnexus-browser/dist");
