import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import process from "node:process";

const root = process.cwd();
const ignored = new Set([
  ".git",
  ".next",
  ".gstack",
  "node_modules",
  "coverage",
  "playwright-report",
  "test-results",
]);
const readable = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".sql",
  ".toml",
  ".yml",
  ".yaml",
]);
const patterns = [
  {
    label: "OpenAI secret key",
    expression: /sk-(?:proj-)?[A-Za-z0-9_-]{24,}/g,
  },
  {
    label: "Google private key",
    expression: /-----BEGIN\s+PRIVATE\s+KEY-----/g,
  },
  {
    label: "Supabase service JWT",
    expression:
      /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
  },
];

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await files(path)));
    else if (readable.has(extname(entry.name)) && entry.name !== ".env.example")
      output.push(path);
  }
  return output;
}

const findings = [];
for (const file of await files(root)) {
  const contents = await readFile(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.expression.test(contents))
      findings.push(`${pattern.label}: ${relative(root, file)}`);
    pattern.expression.lastIndex = 0;
  }
}

if (findings.length) {
  process.stderr.write(`Potential secrets found:\n${findings.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("Secret scan passed.\n");
