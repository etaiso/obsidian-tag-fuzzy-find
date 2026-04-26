#!/usr/bin/env -S npx tsx
/**
 * Seed a vault with a realistic-looking knowledge base for screenshots and
 * GIF demos. Mixes inline and frontmatter tags, uses realistic note titles,
 * and produces a tag distribution that looks lively in the modal:
 *
 *   - A few high-count tags (#project, #daily, #area/work) for visual weight
 *   - Several mid-count tags for fuzzy-match demos
 *   - Deep nested hierarchies (#project/atlas/launch) to demonstrate
 *     descendant-inclusion semantics
 *   - A long tail of 1-2 note tags for realism
 *
 * Generates ~55 notes spread across folders that mimic a PARA-style vault.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-vault.ts ~/Documents/TagFuzzyFindDemoVault
 *
 * Idempotent: rewrites the same files each run. Existing user notes outside
 * the seeded paths are not touched, but seeded files are overwritten.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import process from "node:process";

const target = process.argv[2];
if (!target) {
  console.error("usage: tsx scripts/seed-demo-vault.ts <vault-path>");
  process.exit(1);
}

type Note = { path: string; content: string };

/** Inline-tagged note (tags appear in the body). */
function inline(path: string, title: string, body: string, tags: string[]): Note {
  const tagLine = tags.map(t => (t.startsWith("#") ? t : "#" + t)).join(" ");
  return {
    path,
    content: `# ${title}\n\n${body}\n\n${tagLine}\n`,
  };
}

/** Frontmatter-tagged note (tags in YAML). */
function fm(path: string, title: string, body: string, tags: string[]): Note {
  const stripped = tags.map(t => t.replace(/^#/, ""));
  const yamlTags = stripped.map(t => `  - ${t}`).join("\n");
  return {
    path,
    content: `---\ntags:\n${yamlTags}\n---\n\n# ${title}\n\n${body}\n`,
  };
}

const notes: Note[] = [
  // ── Projects (cross-cutting overview notes) ────────────────────────────
  inline(
    "Projects/Projects Overview.md",
    "Projects Overview",
    "High-level dashboard linking to every active workstream.",
    ["project", "status/active", "priority/p0"],
  ),
  inline(
    "Projects/2026 Project Roadmap.md",
    "2026 Project Roadmap",
    "Quarterly plan with milestones, owners, and dependencies.",
    ["project", "status/active"],
  ),
  inline(
    "Projects/Active Project Status.md",
    "Active Project Status",
    "Weekly rolled-up status from each project lead.",
    ["project", "status/active", "meeting/standup"],
  ),

  // ── Atlas project ──────────────────────────────────────────────────────
  fm(
    "Projects/Atlas/Q2 Launch Plan.md",
    "Q2 Launch Plan",
    "Launch plan: scope, owners, risks, GTM checklist, exit criteria.",
    ["project/atlas", "project/atlas/launch", "priority/p0", "status/active"],
  ),
  fm(
    "Projects/Atlas/Architecture Decisions.md",
    "Atlas — Architecture Decisions",
    "ADR log: data model choices, queue topology, retry semantics.",
    ["project/atlas", "project/atlas/architecture", "topic/distributed-systems"],
  ),
  inline(
    "Projects/Atlas/Sprint 14 Retro.md",
    "Atlas — Sprint 14 Retro",
    "What went well, what didn't, action items.",
    ["project/atlas", "project/atlas/retro", "status/done"],
  ),
  inline(
    "Projects/Atlas/Sprint 15 Planning.md",
    "Atlas — Sprint 15 Planning",
    "Goals, capacity, story breakdown.",
    ["project/atlas", "status/active"],
  ),
  fm(
    "Projects/Atlas/API Spec v2.md",
    "Atlas API Spec v2",
    "Endpoint catalog, request/response shapes, versioning policy.",
    ["project/atlas", "topic/typescript", "status/active"],
  ),

  // ── Beacon project ─────────────────────────────────────────────────────
  fm(
    "Projects/Beacon/Roadmap 2026.md",
    "Beacon Roadmap 2026",
    "Three-phase rollout plan.",
    ["project/beacon", "project/beacon/roadmap", "status/active"],
  ),
  inline(
    "Projects/Beacon/Stakeholder Sync Notes.md",
    "Beacon — Stakeholder Sync Notes",
    "Risks raised by partners, mitigation plans.",
    ["project/beacon", "project/beacon/stakeholders", "meeting/offsite"],
  ),
  inline(
    "Projects/Beacon/Beta Feedback Summary.md",
    "Beacon — Beta Feedback Summary",
    "Top complaints, top compliments, prioritized fixes.",
    ["project/beacon", "status/active"],
  ),

  // ── Phoenix project ────────────────────────────────────────────────────
  fm(
    "Projects/Phoenix/Kickoff Document.md",
    "Phoenix — Kickoff Document",
    "Charter, success criteria, milestones, T-shirt sizing.",
    ["project/phoenix", "project/phoenix/kickoff", "status/active", "priority/p1"],
  ),
  inline(
    "Projects/Phoenix/Vision Board.md",
    "Phoenix — Vision Board",
    "Aspirational use-cases, sketches, gut-feel UX.",
    ["project/phoenix", "status/idea"],
  ),

  // ── Daily notes (10) ───────────────────────────────────────────────────
  ...buildDailyNotes(),

  // ── Areas / Work ───────────────────────────────────────────────────────
  inline(
    "Areas/Work/Code Review Best Practices.md",
    "Code Review Best Practices",
    "Tone, scope, and what to flag vs let go.",
    ["area/work", "topic/typescript"],
  ),
  inline(
    "Areas/Work/Performance Goals 2026.md",
    "Performance Goals 2026",
    "OKRs and growth themes for the year.",
    ["area/work", "status/active"],
  ),
  inline(
    "Areas/Work/Eng Career Ladder Notes.md",
    "Eng Career Ladder Notes",
    "Levels, expectations, growth signals.",
    ["area/work"],
  ),
  inline(
    "Areas/Work/Onboarding Checklist.md",
    "Onboarding Checklist",
    "First 30/60/90 day plan for new engineers.",
    ["area/work", "status/done"],
  ),

  // ── Areas / Health ─────────────────────────────────────────────────────
  inline(
    "Areas/Health/Marathon Training Week 4.md",
    "Marathon Training — Week 4",
    "Easy run × 3, long run 20km, strength × 1.",
    ["area/health", "status/active"],
  ),
  inline(
    "Areas/Health/Recipes - Mediterranean.md",
    "Recipes — Mediterranean",
    "Salads, grain bowls, batch-cook ideas.",
    ["area/health", "topic/cooking"],
  ),
  inline(
    "Areas/Health/Sleep Tracking April.md",
    "Sleep Tracking — April",
    "Average 7h12m, two bad nights mid-month.",
    ["area/health", "daily/journal"],
  ),

  // ── Areas / Finance ────────────────────────────────────────────────────
  inline(
    "Areas/Finance/Tax Planning 2026.md",
    "Tax Planning 2026",
    "Deductions to track, contribution windows, deadlines.",
    ["area/finance", "priority/p2"],
  ),
  inline(
    "Areas/Finance/Investment Review Q1.md",
    "Investment Review Q1",
    "Allocation drift, rebalancing notes.",
    ["area/finance", "status/done"],
  ),

  // ── Areas / Learning ───────────────────────────────────────────────────
  inline(
    "Areas/Learning/Rust Ownership Notes.md",
    "Rust Ownership Notes",
    "Move vs borrow, lifetimes, common borrow-checker errors.",
    ["area/learning", "topic/rust"],
  ),
  inline(
    "Areas/Learning/TypeScript Generics Deep Dive.md",
    "TypeScript Generics Deep Dive",
    "Conditional types, infer keyword, mapped types.",
    ["area/learning", "topic/typescript"],
  ),
  inline(
    "Areas/Learning/Distributed Systems Course - Week 3.md",
    "Distributed Systems Course — Week 3",
    "CAP theorem revisited; consensus protocols intro.",
    ["area/learning", "topic/distributed-systems"],
  ),
  inline(
    "Areas/Learning/Recurrent Themes Latest Reading.md",
    "Recurrent Themes — Latest Reading",
    "Patterns showing up across recent books.",
    ["area/learning"],
  ),

  // ── People ─────────────────────────────────────────────────────────────
  inline(
    "People/1-1 Sarah - April Skip.md",
    "1-1 Sarah — April Skip-level",
    "Career goals, current blockers, feedback for me.",
    ["person/sarah", "meeting/1-1"],
  ),
  inline(
    "People/1-1 Sarah - March Skip.md",
    "1-1 Sarah — March Skip-level",
    "Q1 review, Q2 priorities.",
    ["person/sarah", "meeting/1-1", "status/done"],
  ),
  inline(
    "People/1-1 Marcus.md",
    "1-1 Marcus",
    "Project pivots, pair programming session next week.",
    ["person/marcus", "meeting/1-1", "status/active"],
  ),
  inline(
    "People/Coffee chat with Alex.md",
    "Coffee chat with Alex",
    "Career trajectories, hobbies, book recommendations.",
    ["person/alex"],
  ),

  // ── Meetings ───────────────────────────────────────────────────────────
  inline(
    "Meetings/Q2 Planning Offsite.md",
    "Q2 Planning Offsite",
    "Two-day offsite agenda, breakout outputs, action items.",
    ["meeting/offsite", "priority/p0", "project/atlas"],
  ),
  inline(
    "Meetings/Eng Allhands April.md",
    "Eng All-hands April",
    "Org updates, Q&A summary.",
    ["meeting/allhands"],
  ),
  inline(
    "Meetings/Architecture Review - Atlas v2.md",
    "Architecture Review — Atlas v2",
    "Reviewer feedback on the new sharding plan.",
    ["meeting/standup", "project/atlas", "topic/distributed-systems"],
  ),
  inline(
    "Meetings/Beacon Stakeholder Update.md",
    "Beacon Stakeholder Update",
    "Monthly report-out to executive sponsors.",
    ["meeting/offsite", "project/beacon"],
  ),

  // ── Reference ──────────────────────────────────────────────────────────
  inline(
    "Reference/Style Guide.md",
    "Engineering Style Guide",
    "Naming, formatting, comments policy.",
    ["topic/typescript", "area/work"],
  ),
  inline(
    "Reference/Glossary.md",
    "Glossary",
    "Domain terms with one-line definitions.",
    [],
  ),
];

function buildDailyNotes(): Note[] {
  // Last 10 weekdays leading up to today (skipping weekends keeps the demo
  // realistic — most people don't journal Saturdays).
  const out: Note[] = [];
  const today = new Date();
  let cursor = new Date(today);
  let added = 0;
  while (added < 10) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, "0");
      const dd = String(cursor.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const isStandupDay = added < 5; // Recent five also tagged as standups
      const tags = isStandupDay
        ? ["daily", "daily/standup", "meeting/standup"]
        : ["daily", "daily/journal"];
      out.push(
        inline(
          `Daily/${dateStr}.md`,
          `Daily — ${dateStr}`,
          isStandupDay
            ? "**Yesterday:** wrapped up review.\n**Today:** ship the launch checklist.\n**Blocked:** none."
            : "Reflection on the week — what mattered, what didn't.",
          tags,
        ),
      );
      added++;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return out;
}

function ensureDir(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

let written = 0;
for (const note of notes) {
  const fullPath = join(target, note.path);
  ensureDir(fullPath);
  writeFileSync(fullPath, note.content);
  written++;
}

const tagSet = new Set<string>();
for (const note of notes) {
  for (const m of note.content.matchAll(/#[A-Za-z0-9/_-]+/g)) tagSet.add(m[0]);
  for (const m of note.content.matchAll(/^\s+- ([A-Za-z0-9/_-]+)$/gm)) tagSet.add("#" + m[1]);
}

console.log(`Seeded ${written} notes into ${target}`);
console.log(`Unique tags: ${tagSet.size}`);
