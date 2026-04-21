#!/usr/bin/env -S npx tsx
/**
 * Seed a test vault with ~50 markdown notes spanning inline tags,
 * frontmatter tags, and nested hierarchies — matching the scenarios in
 * docs/test-plan.md.
 *
 * Usage:
 *   npx tsx scripts/seed-vault.ts ~/Documents/TagFinderTestVault
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const target = process.argv[2];
if (!target) {
  console.error("usage: tsx scripts/seed-vault.ts <vault-path>");
  process.exit(1);
}

mkdirSync(join(target, "Projects"), { recursive: true });
mkdirSync(join(target, "Daily"), { recursive: true });

const notes: Array<{ path: string; content: string }> = [];

// Inline-tag notes
for (let i = 0; i < 10; i++) {
  notes.push({
    path: join(target, `Inline ${i}.md`),
    content: `# Inline ${i}\n\nBody text with tags #work #personal\n`,
  });
}

// Frontmatter-tag notes
for (let i = 0; i < 10; i++) {
  notes.push({
    path: join(target, `Fm ${i}.md`),
    content: `---\ntags: [project/work, project/work/urgent]\n---\n\n# Fm ${i}\n\nBody.\n`,
  });
}

// Nested-tag variety
notes.push({
  path: join(target, "Projects", "Alpha Plan.md"),
  content: "# Alpha Plan\n\n#project/work/urgent\n",
});
notes.push({
  path: join(target, "Projects", "Beta Review.md"),
  content: "# Beta Review\n\n#project/work\n",
});
notes.push({
  path: join(target, "Projects", "Personal Reflection.md"),
  content: "# Personal Reflection\n\n#personal #personal/journal\n",
});

// Similar-prefix note — must NOT match #project
notes.push({
  path: join(target, "Projection Study.md"),
  content: "# Projection Study\n\n#projection\n",
});

// Daily notes with #daily tag
for (let i = 0; i < 5; i++) {
  notes.push({
    path: join(target, "Daily", `2026-04-${20 - i}.md`),
    content: `# Daily ${i}\n\n#daily #daily/review\n`,
  });
}

for (const n of notes) writeFileSync(n.path, n.content);
console.log(`Seeded ${notes.length} notes into ${target}`);
