#!/usr/bin/env node
// Renders every host package from core/ — the single source.
//
// WHY THIS EXISTS: the same instructions, maintained by hand for several hosts, drift apart.
// Editing the output re-creates that problem. Edit core/ and re-run.
//
// Claude Code and Gemini CLI share the SKILL.md shape (frontmatter `name` + `description`),
// so one tree serves both. Codex CLI loads flat prompt files instead.
//
// The plugin identity lives once, in plugin.json at the root (the layout Antigravity reads).
// Claude Code wants the same identity at .claude-plugin/plugin.json, so that file is GENERATED
// from the root one rather than maintained beside it — two hand-written manifests carrying the
// same name and version are a drift waiting to happen.
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(join(root, "skills.json"), "utf8"));

const banner = (source) =>
  `<!-- GENERATED from ${source} — do not edit. Run: node scripts/render.mjs -->\n`;

/** YAML frontmatter scalar: collapse to one line, escape double quotes. */
function scalar(v) {
  return `"${String(v).replace(/\s+/g, " ").trim().replace(/"/g, '\\"')}"`;
}

for (const out of ["skills", "hosts", ".claude-plugin"]) {
  await rm(join(root, out), { recursive: true, force: true });
}

for (const c of manifest.capabilities) {
  const body = await readFile(join(root, c.core), "utf8");

  // Claude Code + Gemini CLI
  const skillDir = join(root, "skills", c.id);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, "SKILL.md"),
    `---\nname: ${c.id}\ndescription: ${scalar(c.description)}\n---\n\n${banner(c.core)}\n${body}`,
  );

  // Codex CLI — flat prompt, no frontmatter
  const codexDir = join(root, "hosts", "codex");
  await mkdir(codexDir, { recursive: true });
  await writeFile(join(codexDir, `${c.id}.md`), `${banner(c.core)}\n# ${c.title}\n\n${body}`);

  console.log(`${c.id}: skills/${c.id}/SKILL.md · hosts/codex/${c.id}.md`);
}

// Claude Code manifest — derived from the root manifest, never edited by hand.
const identity = JSON.parse(await readFile(join(root, "plugin.json"), "utf8"));
await mkdir(join(root, ".claude-plugin"), { recursive: true });
await writeFile(
  join(root, ".claude-plugin", "plugin.json"),
  `${JSON.stringify({ ...identity, skills: "./skills/" }, null, 2)}\n`,
);
console.log("identity: .claude-plugin/plugin.json (from plugin.json)");

// Marketplace manifest — the same identity again, so it is generated too. Three hand-written
// manifests naming the same version is how a release ships as two different versions.
await writeFile(
  join(root, ".claude-plugin", "marketplace.json"),
  `${JSON.stringify(
    {
      name: identity.name + "-skills",
      owner: identity.author,
      metadata: { description: identity.description, version: identity.version },
      plugins: [
        {
          name: identity.name,
          source: "./",
          description: identity.description,
          version: identity.version,
          author: identity.author,
          keywords: identity.keywords,
        },
      ],
    },
    null,
    2,
  )}\n`,
);
console.log("marketplace: .claude-plugin/marketplace.json (from plugin.json)");
