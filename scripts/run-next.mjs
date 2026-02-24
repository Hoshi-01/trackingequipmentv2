import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/run-next.mjs <next-command> [...args]");
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
