#!/usr/bin/env node
// Fails if anything under skills/, hosts/, agents/ or .claude-plugin/ differs from what render.mjs
// produces from core/.
//
// The README promises those directories are generated. A promise no one checks is not a
// constraint: a hand-edit would survive, and the next render would silently revert it — the
// edit lost, the reason forgotten. This turns the promise into a gate.
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { cpSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Every file under dir, as a path→content map keyed relative to dir. */
async function tree(dir) {
  const out = new Map();
  async function walk(d) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return; // directory absent — reported as a difference by the caller
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else out.set(relative(dir, p), await readFile(p, "utf8"));
    }
  }
  await walk(dir);
  return out;
}

// Render into a scratch copy so the working tree is never touched by the check itself.
const scratch = mkdtempSync(join(tmpdir(), "memoz-skills-check-"));
for (const item of ["core", "skills.json", "scripts", "plugin.json"]) {
  cpSync(join(root, item), join(scratch, item), { recursive: true });
}
execFileSync(process.execPath, [join(scratch, "scripts", "render.mjs")], { stdio: "ignore" });

let differences = 0;
for (const area of ["skills", "hosts", ".claude-plugin", "agents"]) {
  const expected = await tree(join(scratch, area));
  const actual = await tree(join(root, area));
  for (const [p, content] of expected) {
    if (!actual.has(p)) {
      console.error(`missing: ${area}/${p}`);
      differences++;
    } else if (actual.get(p) !== content) {
      console.error(`stale:   ${area}/${p}`);
      differences++;
    }
  }
  for (const p of actual.keys()) {
    if (!expected.has(p)) {
      console.error(`extra:   ${area}/${p}`);
      differences++;
    }
  }
}

if (differences > 0) {
  console.error(`\n${differences} file(s) differ from core/. Edit core/ and run: node scripts/render.mjs`);
  process.exit(1);
}
console.log("generated files match core/");
