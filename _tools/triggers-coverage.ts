/**
 * Trigger coverage of the w6w app pack — pure counting helpers used by `audit.ts`.
 *
 * A trigger is a poll trigger iff it carries a `poll` function (the loader's derived
 * `type` is not present on the live default export); anything else is a webhook
 * trigger (webhook or plain receiver).
 */

export interface TriggerCounts {
  webhook: number;
  poll: number;
}

export interface TriggerSummary {
  /** Apps with at least one trigger. */
  apps: number;
  webhookApps: number;
  pollApps: number;
  bothApps: number;
}

// deno-lint-ignore no-explicit-any
export function countTriggers(def: any): TriggerCounts {
  const counts: TriggerCounts = { webhook: 0, poll: 0 };
  const triggers = def?.triggers;
  if (!Array.isArray(triggers)) return counts;
  for (const t of triggers) {
    if (t && typeof t.poll === "function") counts.poll++;
    else counts.webhook++;
  }
  return counts;
}

export function summarize(map: Record<string, TriggerCounts>): TriggerSummary {
  const s: TriggerSummary = {
    apps: 0,
    webhookApps: 0,
    pollApps: 0,
    bothApps: 0,
  };
  for (const c of Object.values(map)) {
    if (c.webhook + c.poll === 0) continue;
    s.apps++;
    if (c.webhook > 0) s.webhookApps++;
    if (c.poll > 0) s.pollApps++;
    if (c.webhook > 0 && c.poll > 0) s.bothApps++;
  }
  return s;
}

export function formatLine(s: TriggerSummary): string {
  return `Triggers: ${s.apps} apps (${s.webhookApps} webhook, ${s.pollApps} poll)`;
}

// ---------------------------------------------------------------------------
// TRIGGERS.json — the classification of every pack app (source of truth) and
// its generated TRIGGERS.md. `--write` renders, `--check` validates (import-free).
// ---------------------------------------------------------------------------

export const MECHANISMS = [
  "webhook-api",
  "manual-webhook",
  "poll",
  "none",
] as const;
export type Mechanism = (typeof MECHANISMS)[number];

export interface TriggerRow {
  path: string;
  mechanism: Mechanism;
  candidates: string[];
  pollAction: string | null;
  reason: string;
  verified: false | string;
  source: "survey" | "scan" | "hand";
}

const GENERATED_HEADER = [
  "# Trigger coverage",
  "",
  "<!-- Generated from TRIGGERS.json. Do not edit by hand: run",
  "     `deno task --cwd _tools triggers --write` -->",
  "",
  "Generated from [TRIGGERS.json](TRIGGERS.json) (the source of truth) by",
  "`deno task --cwd _tools triggers --write`; `--check` fails when this file is stale.",
  "Rows with `verified: false` come from a code scan or model knowledge, not vendor docs.",
  "Shipped status is derived from code (`triggers/*.ts`), never stored here.",
  "",
].join("\n");

const cell = (s: string) => s.replaceAll("|", "\\|").replaceAll("\n", " ");

export function renderMarkdown(rows: TriggerRow[]): string {
  const out = [GENERATED_HEADER];
  const by = (m: Mechanism) => rows.filter((r) => r.mechanism === m);
  out.push(
    `**Totals:** ${rows.length} apps — ` +
      MECHANISMS.map((m) => `${m}: ${by(m).length}`).join(", "),
    "",
  );
  for (const m of MECHANISMS) {
    const list = by(m);
    out.push(`## ${m} (${list.length})`, "");
    out.push(
      m === "poll"
        ? "| app | poll action | candidates | verified | source | reason |"
        : "| app | candidates | verified | source | reason |",
    );
    out.push(
      m === "poll" ? "|---|---|---|---|---|---|" : "|---|---|---|---|---|",
    );
    for (const r of list) {
      const common = [
        cell(r.candidates.join(", ")),
        r.verified === false ? "no" : cell(r.verified),
        r.source,
        cell(r.reason),
      ];
      const head = m === "poll"
        ? [r.path, cell(String(r.pollAction))]
        : [r.path];
      out.push(`| ${[...head, ...common].join(" | ")} |`);
    }
    out.push("");
  }
  return out.join("\n");
}

function declaresTriggers(root: string, path: string): boolean {
  try {
    for (const e of Deno.readDirSync(`${root}/${path}/triggers`)) {
      if (e.isFile && e.name.endsWith(".ts")) return true;
    }
  } catch { /* no triggers dir */ }
  return false;
}

function isFile(p: string): boolean {
  try {
    return Deno.statSync(p).isFile;
  } catch {
    return false;
  }
}

/** Pack app paths in row form (`apps/<id>`), read from `<root>/w6w-pack.json`. */
export function packPaths(root: string): string[] {
  const pack = JSON.parse(Deno.readTextFileSync(`${root}/w6w-pack.json`));
  return pack.apps.map((a: { path: string }) => a.path.replace(/^\.\//, ""))
    .sort();
}

/** Every problem found, each naming the offender; empty = clean. */
export function checkTriggers(
  root: string,
  rows: TriggerRow[],
  markdown: string | null,
): string[] {
  const errors: string[] = [];
  const pack = new Set(packPaths(root));
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.path)) errors.push(`${r.path}: duplicate row`);
    seen.add(r.path);
    if (!pack.has(r.path)) {
      errors.push(`${r.path}: row for a path not in w6w-pack.json`);
    }
    if (!(MECHANISMS as readonly string[]).includes(r.mechanism)) {
      errors.push(`${r.path}: unknown mechanism "${r.mechanism}"`);
    }
    if (r.mechanism === "poll") {
      const f = `${root}/${r.path}/actions/${r.pollAction}.ts`;
      if (!r.pollAction || !isFile(f)) {
        errors.push(
          `${r.path}: poll row names missing action "${r.pollAction}"`,
        );
      }
    }
    if (r.mechanism === "none" && !String(r.reason ?? "").trim()) {
      errors.push(`${r.path}: none row has no reason`);
    }
    if (r.mechanism === "none" && declaresTriggers(root, r.path)) {
      errors.push(`${r.path}: row says none but the app has triggers/*.ts`);
    }
  }
  for (const p of pack) {
    if (!seen.has(p)) errors.push(`${p}: pack app has no row in TRIGGERS.json`);
  }
  const sorted = rows.map((r) => r.path).every((p, i, a) =>
    i === 0 || a[i - 1] < p
  );
  if (!sorted) errors.push("TRIGGERS.json: rows are not sorted by path");
  if (markdown !== renderMarkdown(rows)) {
    errors.push(
      "TRIGGERS.md: out of date (run `deno task --cwd _tools triggers --write`)",
    );
  }
  return errors;
}

async function main(args: string[]) {
  const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
  const jsonPath = `${root}/TRIGGERS.json`;
  const mdPath = `${root}/TRIGGERS.md`;
  const rows: TriggerRow[] = JSON.parse(Deno.readTextFileSync(jsonPath));
  if (args.includes("--write")) {
    Deno.writeTextFileSync(mdPath, renderMarkdown(rows));
    console.log(`wrote TRIGGERS.md (${rows.length} rows)`);
    return;
  }
  if (args.includes("--check")) {
    let md: string | null = null;
    try {
      md = Deno.readTextFileSync(mdPath);
    } catch { /* missing */ }
    const errors = checkTriggers(root, rows, md);
    for (const e of errors) console.error(`triggers-coverage: ${e}`);
    if (errors.length) Deno.exit(1);
    console.log(`triggers-coverage: ok (${rows.length} rows)`);
    return;
  }
  console.log(
    MECHANISMS.map((m) =>
      `${m}: ${rows.filter((r) => r.mechanism === m).length}`
    ).join(", "),
  );
}

if (import.meta.main) await main(Deno.args);
