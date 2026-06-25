import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(packageRoot, "skills");

async function findSkillFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findSkillFiles(fullPath)));
    } else if (entry.isFile() && entry.name === "SKILL.md") {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function parseFrontmatter(content, filePath) {
  assert.match(content, /^---\n[\s\S]*?\n---\n/, `${filePath} must start with YAML frontmatter`);
  const [, raw] = content.match(/^---\n([\s\S]*?)\n---\n/);
  const fields = new Map();

  for (const line of raw.split("\n")) {
    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (match) {
      fields.set(match[1], match[2].trim());
    }
  }

  return fields;
}

const expectedSkillNames = new Set([
  "architecture",
  "ai-navigable-folder-architecture",
  "skill-suite-architecture",
  "supierior-package-architecture",
]);

const skillFiles = await findSkillFiles(skillsRoot);
assert.equal(
  skillFiles.length,
  expectedSkillNames.size,
  "package should expose the expected skill count",
);

const discoveredNames = new Set();
for (const skillFile of skillFiles) {
  const content = await readFile(skillFile, "utf8");
  const frontmatter = parseFrontmatter(content, skillFile);
  const name = frontmatter.get("name");
  const description = frontmatter.get("description");

  assert.ok(name, `${skillFile} must define a name`);
  assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${name} must be a valid skill name`);
  assert.ok(description, `${skillFile} must define a description`);
  assert.ok(description.length <= 1024, `${name} description must stay under Pi's limit`);
  discoveredNames.add(name);
}

assert.deepEqual(
  discoveredNames,
  expectedSkillNames,
  "skill names should match the package contract",
);

const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
assert.deepEqual(
  packageJson.pi?.skills,
  ["./skills"],
  "package.json should expose all skills to Pi",
);

for (const relativePath of [
  "skills/ai-navigable-folder-architecture/ai-navigable-folder-architecture.md",
  "skills/skill-suite-architecture/skill-suite-architecture.md",
  "skills/skill-suite-architecture/ai-navigable-folder-architecture.md",
  "skills/supierior-package-architecture/supierior-package-architecture.md",
  "skills/supierior-package-architecture/ai-navigable-folder-architecture.md",
]) {
  const content = await readFile(path.join(packageRoot, relativePath), "utf8");
  assert.doesNotMatch(
    content,
    /@\.pi\/architecture\//,
    `${relativePath} should not depend on repo-local architecture includes`,
  );
}
