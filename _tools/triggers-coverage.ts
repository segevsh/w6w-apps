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
  /** Total triggers (webhook + poll) across the audited apps. */
  triggers: number;
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
    triggers: 0,
  };
  for (const c of Object.values(map)) {
    if (c.webhook + c.poll === 0) continue;
    s.apps++;
    s.triggers += c.webhook + c.poll;
    if (c.webhook > 0) s.webhookApps++;
    if (c.poll > 0) s.pollApps++;
    if (c.webhook > 0 && c.poll > 0) s.bothApps++;
  }
  return s;
}

export function formatLine(s: TriggerSummary): string {
  return `Triggers: ${s.apps} apps (${s.webhookApps} webhook, ${s.pollApps} poll), ${s.triggers} triggers`;
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
  /** list action stem -> trigger key, only where the static scan cannot see the link. */
  covers?: Record<string, string>;
  /** list action stem -> short reason it is deliberately not behind a trigger. */
  skipped?: Record<string, string>;
  /** vendor event name -> trigger key, or "any" (only via the Any-event trigger). */
  events?: Record<string, string>;
  /** n8n event value -> trigger key | "skip: <reason>". */
  n8n?: Record<string, string>;
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

export function renderMarkdown(rows: TriggerRow[], scan: DepthScan): string {
  const triggersOf = (path: string) => scan.apps[path]?.triggers ?? 0;
  const out = [GENERATED_HEADER];
  const by = (m: Mechanism) => rows.filter((r) => r.mechanism === m);
  out.push(
    `**Totals:** ${rows.length} apps — ` +
      MECHANISMS.map((m) => `${m}: ${by(m).length}`).join(", "),
    "",
  );
  out.push(...renderDepth(scan));
  for (const m of MECHANISMS) {
    const list = by(m);
    out.push(`## ${m} (${list.length})`, "");
    out.push(
      m === "poll"
        ? "| app | triggers | poll action | candidates | verified | source | reason |"
        : "| app | triggers | candidates | verified | source | reason |",
    );
    out.push(
      m === "poll"
        ? "|---|---|---|---|---|---|---|"
        : "|---|---|---|---|---|---|",
    );
    for (const r of list) {
      const common = [
        cell(r.candidates.join(", ")),
        r.verified === false ? "no" : cell(r.verified),
        r.source,
        cell(r.reason),
      ];
      const t = String(triggersOf(r.path));
      const head = m === "poll"
        ? [r.path, t, cell(String(r.pollAction))]
        : [r.path, t];
      out.push(`| ${[...head, ...common].join(" | ")} |`);
    }
    out.push("");
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Depth: how many of an app's list/search actions sit behind a trigger.
// Report-only unless DEPTH_STRICT (see `main`). Static and import-free.
// ---------------------------------------------------------------------------

/** Env flag / CLI flag that makes unaccounted list actions fail `--check`. */
export const DEPTH_STRICT_ENV = "TRIGGERS_DEPTH_STRICT";

/**
 * List/search classifier. An action file is a list action when its text declares
 * `type: "read"` or `type: "search"` AND its stem has a `-`-separated token `list`
 * or `search` (or starts with `find-`/`query-`) AND does not start with a
 * `get-`/`create-`/`add-`/`remove-`/`update-`/`delete-` verb (those name a
 * single record or a mutation: `get-list`, `create-list`, `add-contact-to-list`).
 * Pinned by the table in triggers-coverage.test.ts.
 */
export function isListAction(stem: string, text: string): boolean {
  if (!/\btype:\s*["'](?:read|search)["']/.test(text)) return false;
  if (/^(?:get|create|add|remove|update|delete)-/.test(stem)) return false;
  if (/^(?:find|query)-/.test(stem)) return true;
  return stem.split("-").some((t) => t === "list" || t === "search");
}

export interface AppDepth {
  triggers: number;
  list: string[];
  backed: string[];
  skipped: string[];
  unaccounted: string[];
  n8nMissing: string[] | null;
}

export interface DepthScan {
  apps: Record<string, AppDepth>;
  /** False when no n8n file was given: parity is "not measured". */
  n8nMeasured: boolean;
}

export interface N8nNode {
  node: string;
  file?: string;
  app: string | null;
  events: string[];
  polling?: boolean;
}

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  try {
    for (const e of Deno.readDirSync(dir)) {
      if (e.isFile && e.name.endsWith(".ts")) out.push(e.name);
    }
  } catch { /* dir absent */ }
  return out.sort();
}

export function scanDepth(
  root: string,
  rows: TriggerRow[],
  n8n: N8nNode[] | null = null,
): DepthScan {
  const byPath = new Map(rows.map((r) => [r.path, r]));
  const apps: Record<string, AppDepth> = {};
  for (const path of packPaths(root)) {
    const row = byPath.get(path);
    const trig = tsFiles(`${root}/${path}/triggers`);
    const imported = new Set<string>();
    for (const sub of ["triggers", "lib"]) {
      for (const f of tsFiles(`${root}/${path}/${sub}`)) {
        const text = Deno.readTextFileSync(`${root}/${path}/${sub}/${f}`);
        for (const m of text.matchAll(/actions\/([\w.-]+?)\.ts/g)) {
          imported.add(m[1]);
        }
      }
    }
    const list = tsFiles(`${root}/${path}/actions`)
      .map((f) => f.slice(0, -3))
      .filter((stem) =>
        isListAction(
          stem,
          Deno.readTextFileSync(`${root}/${path}/actions/${stem}.ts`),
        )
      );
    const covers = row?.covers ?? {};
    const skippedKeys = row?.skipped ?? {};
    const backed = list.filter((s) => imported.has(s) || s in covers);
    const skipped = list.filter((s) => s in skippedKeys);
    const unaccounted = list.filter((s) =>
      !backed.includes(s) && !(s in skippedKeys)
    );
    let n8nMissing: string[] | null = null;
    if (n8n) {
      const have = new Set(Object.keys(row?.n8n ?? {}));
      n8nMissing = [
        ...new Set(
          n8n.filter((n) => n.app === path).flatMap((n) => n.events),
        ),
      ].filter((e) => !have.has(e));
    }
    apps[path] = {
      triggers: trig.length,
      list,
      backed,
      skipped,
      unaccounted,
      n8nMissing,
    };
  }
  return { apps, n8nMeasured: n8n !== null };
}

export function depthSummary(scan: DepthScan): string {
  const all = Object.values(scan.apps);
  const T = all.reduce((n, a) => n + a.triggers, 0);
  const U = all.reduce((n, a) => n + a.unaccounted.length, 0);
  const K = all.filter((a) => a.unaccounted.length > 0).length;
  const M = scan.n8nMeasured
    ? String(all.reduce((n, a) => n + (a.n8nMissing?.length ?? 0), 0))
    : "n/a";
  return `depth: ${all.length} apps, ${T} triggers, ${U} unaccounted list actions in ${K} apps, n8n-parity misses ${M} (report-only)`;
}

export function depthAppLine(path: string, a: AppDepth): string {
  const n8n = a.n8nMissing === null ? "n/a" : `[${a.n8nMissing.join(", ")}]`;
  return `${path}: triggers=${a.triggers} list=${a.list.length} backed=${a.backed.length} skipped=${a.skipped.length} unaccounted=[${
    a.unaccounted.join(", ")
  }] n8n-missing=${n8n}`;
}

function renderDepth(scan: DepthScan): string[] {
  const out = ["## Depth", "", depthSummary(scan), ""];
  const rows = Object.entries(scan.apps)
    .filter(([, a]) => a.unaccounted.length > 0 || a.triggers > 0)
    .sort(([pa, a], [pb, b]) =>
      b.unaccounted.length - a.unaccounted.length || (pa < pb ? -1 : 1)
    );
  out.push(
    "| app | triggers | list actions | unaccounted |",
    "|---|---|---|---|",
  );
  for (const [p, a] of rows) {
    out.push(
      `| ${p} | ${a.triggers} | ${a.list.length} | ${a.unaccounted.length} |`,
    );
  }
  out.push("");
  return out;
}

/** Validity errors for the optional depth fields on a row (always on). */
function checkDepthFields(root: string, r: TriggerRow): string[] {
  const errors: string[] = [];
  if (!r.covers && !r.skipped && !r.events && !r.n8n) return errors;
  const actions = new Set(
    tsFiles(`${root}/${r.path}/actions`).map((f) => f.slice(0, -3)),
  );
  const keys = new Set<string>();
  for (const f of tsFiles(`${root}/${r.path}/triggers`)) {
    const text = Deno.readTextFileSync(`${root}/${r.path}/triggers/${f}`);
    for (const m of text.matchAll(/\bkey:\s*["']([^"']+)["']/g)) keys.add(m[1]);
  }
  for (const field of ["covers", "skipped"] as const) {
    for (const stem of Object.keys(r[field] ?? {})) {
      if (!actions.has(stem)) {
        errors.push(`${r.path}: ${field} names missing action "${stem}"`);
      }
    }
  }
  for (const [stem, key] of Object.entries(r.covers ?? {})) {
    if (!keys.has(key)) {
      errors.push(`${r.path}: covers "${stem}" names unknown trigger "${key}"`);
    }
    if (r.skipped && stem in r.skipped) {
      errors.push(`${r.path}: action "${stem}" is both covered and skipped`);
    }
  }
  for (const [stem, why] of Object.entries(r.skipped ?? {})) {
    if (!String(why ?? "").trim()) {
      errors.push(`${r.path}: skipped "${stem}" has an empty reason`);
    }
  }
  for (const field of ["events", "n8n"] as const) {
    for (const [k, v] of Object.entries(r[field] ?? {})) {
      if (v === "any" || /^skip:/.test(v)) continue;
      if (!keys.has(v)) {
        errors.push(`${r.path}: ${field} "${k}" names unknown trigger "${v}"`);
      }
    }
  }
  return errors;
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
  opts: { strictDepth?: boolean } = {},
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
    errors.push(...checkDepthFields(root, r));
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
  const scan = scanDepth(root, rows);
  if (opts.strictDepth) {
    const u = Object.values(scan.apps).reduce(
      (n, a) => n + a.unaccounted.length,
      0,
    );
    if (u > 0) errors.push(`depth: ${u} unaccounted list actions (strict)`);
  }
  if (markdown !== renderMarkdown(rows, scan)) {
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
    Deno.writeTextFileSync(mdPath, renderMarkdown(rows, scanDepth(root, rows)));
    console.log(`wrote TRIGGERS.md (${rows.length} rows)`);
    return;
  }
  if (args.includes("--check")) {
    let md: string | null = null;
    try {
      md = Deno.readTextFileSync(mdPath);
    } catch { /* missing */ }
    const strictDepth = args.includes("--strict-depth") ||
      Deno.env.get(DEPTH_STRICT_ENV) === "1";
    const errors = checkTriggers(root, rows, md, { strictDepth });
    for (const e of errors) console.error(`triggers-coverage: ${e}`);
    if (errors.length) Deno.exit(1);
    console.log(`triggers-coverage: ok (${rows.length} rows)`);
    console.log(depthSummary(scanDepth(root, rows)));
    return;
  }
  if (args.includes("--depth")) {
    const flag = (name: string) =>
      args.flatMap((a, i) => a === name ? [args[i + 1]] : []);
    const n8nFile = flag("--n8n")[0];
    let n8n: N8nNode[] | null = null;
    if (n8nFile) {
      try {
        n8n = JSON.parse(Deno.readTextFileSync(n8nFile));
      } catch { /* missing: parity not measured */ }
    }
    const scan = scanDepth(root, rows, n8n);
    console.log(depthSummary(scan));
    const only = flag("--app");
    if (only.length || args.includes("--verbose")) {
      for (const [p, a] of Object.entries(scan.apps)) {
        if (only.length && !only.includes(p)) continue;
        console.log(depthAppLine(p, a));
      }
    }
    return;
  }
  console.log(
    MECHANISMS.map((m) =>
      `${m}: ${rows.filter((r) => r.mechanism === m).length}`
    ).join(", "),
  );
}

if (import.meta.main) await main(Deno.args);
