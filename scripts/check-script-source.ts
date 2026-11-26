// The hash of the sources of the check script (core, messages, the script itself, without tests): the build writes it
// into the published file, a test compares it with the sources as they are.
/// <reference types="node" />
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/core", "src/messages", "src/tools/challenge-check.ts"];

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path)
    .flatMap((name) => files(join(path, name)))
    .filter((f) => !f.endsWith(".test.ts"));
}

export function sourceHash(): string {
  const hash = createHash("sha256");
  for (const file of ROOTS.flatMap(files).sort()) hash.update(file).update(readFileSync(file));
  return hash.digest("hex").slice(0, 16);
}
