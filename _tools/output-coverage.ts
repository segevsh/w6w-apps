/**
 * Output-declaration coverage of the w6w app pack.
 *
 * Classifies every action and trigger of every pack app five ways by what it
 * declares about its output, and prints a per-app report, worst first.
 *
 *   declared        non-empty array `output`
 *   declared-empty  `output: []`
 *   dynamic         `output: { source }`
 *   sample-only     no `output` key, has `sample`
 *   neither         no `output`, no `sample`
 *
 * Reads each app's `index.ts` directly (same as `audit.ts`); never `dist/`.
 * Writes nothing: markdown to stdout, JSON with `--json`.
 *
 *   deno run --no-check -A _tools/output-coverage.ts [--json] [app ...]
 */
import { appPath, appPaths } from "./app-paths.ts";

export const CLASSES = [
  "declared",
  "declared-empty",
  "dynamic",
  "sample-only",
  "neither",
] as const;
export type OutputClass = typeof CLASSES[number];
export type Counts = Record<OutputClass, number>;

/** Apps with live Cohost traffic (gap-analysis T-2 §4), called out separately. */
export const COHOST = ["eventbrite", "twilio/sendgrid", "slack", "2chat"];

export const emptyCounts = (): Counts => ({
  "declared": 0,
  "declared-empty": 0,
  "dynamic": 0,
  "sample-only": 0,
  "neither": 0,
});

// deno-lint-ignore no-explicit-any
export function classify(entry: any): OutputClass {
  if (entry && "output" in entry && entry.output !== undefined) {
    const out = entry.output;
    if (Array.isArray(out)) return out.length ? "declared" : "declared-empty";
    if (out && typeof out === "object" && "source" in out) return "dynamic";
  }
  return entry && entry.sample !== undefined ? "sample-only" : "neither";
}

export interface AppRow {
  path: string;
  id?: string;
  cohost: boolean;
  actions: Counts;
  triggers: Counts;
  /** Output arrays whose fields declare `items` (HITL-1). */
  itemsFields: number;
  error?: string;
}

const total = (c: Counts) => CLASSES.reduce((n, k) => n + c[k], 0);
const sum = (a: Counts, b: Counts): Counts => {
  const r = emptyCounts();
  for (const k of CLASSES) r[k] = a[k] + b[k];
  return r;
};
const both = (r: AppRow) => sum(r.actions, r.triggers);

// deno-lint-ignore no-explicit-any
function countItems(entries: any[]): number {
  let n = 0;
  for (const e of entries) {
    if (!Array.isArray(e?.output)) continue;
    // deno-lint-ignore no-explicit-any
    const walk = (fields: any[]) => {
      for (const f of fields) {
        if (f && f.items !== undefined) n++;
        if (Array.isArray(f?.fields)) walk(f.fields);
      }
    };
    walk(e.output);
  }
  return n;
}

// deno-lint-ignore no-explicit-any
export function measure(path: string, def: any): AppRow {
  const actions = emptyCounts();
  const triggers = emptyCounts();
  const acts = Array.isArray(def?.actions) ? def.actions : [];
  const trigs = Array.isArray(def?.triggers) ? def.triggers : [];
  for (const a of acts) actions[classify(a)]++;
  for (const t of trigs) triggers[classify(t)]++;
  return {
    path,
    cohost: COHOST.includes(path),
    actions,
    triggers,
    itemsFields: countItems(acts) + countItems(trigs),
  };
}

/** Most `neither`, then lowest declared share (declared / total), then path. */
export function worstFirst(a: AppRow, b: AppRow): number {
  const ca = both(a), cb = both(b);
  if (cb.neither !== ca.neither) return cb.neither - ca.neither;
  const sa = total(ca) ? ca.declared / total(ca) : 1;
  const sb = total(cb) ? cb.declared / total(cb) : 1;
  if (sa !== sb) return sa - sb;
  return a.path.localeCompare(b.path);
}

export interface Report {
  apps: number;
  totals: { actions: Counts; triggers: Counts; itemsFields: number };
  errors: AppRow[];
  rows: AppRow[];
  cohost: AppRow[];
}

export function buildReport(all: AppRow[]): Report {
  const errors = all.filter((r) => r.error);
  const rows = all.filter((r) => !r.error).sort(worstFirst);
  const totals = {
    actions: emptyCounts(),
    triggers: emptyCounts(),
    itemsFields: 0,
  };
  for (const r of rows) {
    totals.actions = sum(totals.actions, r.actions);
    totals.triggers = sum(totals.triggers, r.triggers);
    totals.itemsFields += r.itemsFields;
  }
  return {
    apps: all.length,
    totals,
    errors,
    rows,
    cohost: rows.filter((r) => r.cohost),
  };
}

const cells = (c: Counts) => CLASSES.map((k) => c[k]).join(" | ");
const HEAD = `| app | kind | ${CLASSES.join(" | ")} |\n|---|---|${
  CLASSES.map(() => "---").join("|")
}|`;
const rowLines = (r: AppRow) => [
  `| ${r.path} | actions | ${cells(r.actions)} |`,
  `| ${r.path} | triggers | ${cells(r.triggers)} |`,
];

export function renderMarkdown(rep: Report): string {
  const t = rep.totals;
  const out: string[] = [
    "# Pack output coverage",
    "",
    `Totals: ${rep.apps} apps (${rep.errors.length} import errors); ` +
    `actions ${total(t.actions)} [${
      CLASSES.map((k) => `${k} ${t.actions[k]}`).join(", ")
    }]; triggers ${total(t.triggers)} [${
      CLASSES.map((k) => `${k} ${t.triggers[k]}`).join(", ")
    }]; output fields declaring items: ${t.itemsFields}.`,
    "",
    "Note: this counts triggers too; `audit.ts` `declares no output` is action-only.",
    "",
    "## Cohost apps",
    "",
    HEAD,
    ...rep.cohost.flatMap(rowLines),
    "",
  ];
  if (rep.errors.length) {
    out.push("## Import errors", "");
    for (const e of rep.errors) out.push(`- ${e.path}: ${e.error}`);
    out.push("");
  }
  out.push("## All apps, worst first", "", HEAD);
  for (const r of rep.rows) out.push(...rowLines(r));
  return out.join("\n") + "\n";
}

async function main() {
  const root = new URL("../apps/", import.meta.url).pathname;
  const args = Deno.args.filter((a) => !a.startsWith("--"));
  const asJson = Deno.args.includes("--json");
  const paths = args.length ? args.map(appPath) : appPaths();
  const rows: AppRow[] = [];
  for (const path of paths) {
    try {
      const def = (await import(`file://${root}${path}/index.ts`)).default;
      rows.push(measure(path, def));
    } catch (e) {
      rows.push({
        path,
        cohost: COHOST.includes(path),
        actions: emptyCounts(),
        triggers: emptyCounts(),
        itemsFields: 0,
        error: String((e as Error)?.message ?? e).split("\n")[0],
      });
    }
  }
  const rep = buildReport(rows);
  console.log(asJson ? JSON.stringify(rep, null, 2) : renderMarkdown(rep));
}

if (import.meta.main) await main();
