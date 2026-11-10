import { assertEquals } from "@std/assert";
import { countTriggers, formatLine, summarize } from "./triggers-coverage.ts";

Deno.test("countTriggers: 2 webhook + 1 poll", () => {
  const def = {
    triggers: [
      { key: "a", onSubscribe() {}, onUnsubscribe() {} },
      { key: "b" },
      { key: "c", poll() {} },
    ],
  };
  assertEquals(countTriggers(def), { webhook: 2, poll: 1 });
});

Deno.test("countTriggers: no triggers key", () => {
  assertEquals(countTriggers({ actions: [] }), { webhook: 0, poll: 0 });
  assertEquals(countTriggers(undefined), { webhook: 0, poll: 0 });
});

Deno.test("summarize: webhook-only, poll-only, both", () => {
  assertEquals(
    summarize({
      a: { webhook: 3, poll: 0 },
      b: { webhook: 0, poll: 1 },
      c: { webhook: 1, poll: 2 },
      d: { webhook: 0, poll: 0 },
    }),
    { apps: 3, webhookApps: 2, pollApps: 2, bothApps: 1 },
  );
});

Deno.test("formatLine: exact text", () => {
  assertEquals(
    formatLine({ apps: 3, webhookApps: 2, pollApps: 2, bothApps: 1 }),
    "Triggers: 3 apps (2 webhook, 2 poll)",
  );
});

import {
  checkTriggers,
  MECHANISMS,
  renderMarkdown,
  type TriggerRow,
} from "./triggers-coverage.ts";

function fixture(): { root: string; rows: TriggerRow[] } {
  const root = Deno.makeTempDirSync();
  const apps = ["apps/a", "apps/b", "apps/c"];
  Deno.writeTextFileSync(
    `${root}/w6w-pack.json`,
    JSON.stringify({ apps: apps.map((p) => ({ path: `./${p}` })) }),
  );
  for (const p of apps) {
    Deno.mkdirSync(`${root}/${p}/actions`, { recursive: true });
  }
  Deno.writeTextFileSync(`${root}/apps/b/actions/list-things.ts`, "");
  const row = (
    path: string,
    mechanism: TriggerRow["mechanism"],
    extra = {},
  ): TriggerRow => ({
    path,
    mechanism,
    candidates: [],
    pollAction: null,
    reason: "r",
    verified: false,
    source: "scan",
    ...extra,
  });
  return {
    root,
    rows: [
      row("apps/a", "none"),
      row("apps/b", "poll", { pollAction: "list-things" }),
      row("apps/c", "webhook-api"),
    ],
  };
}

const run = (f: ReturnType<typeof fixture>, md?: string | null) =>
  checkTriggers(f.root, f.rows, md === undefined ? renderMarkdown(f.rows) : md);

Deno.test("checkTriggers: clean fixture has no errors", () => {
  assertEquals(run(fixture()), []);
});

Deno.test("checkTriggers: pack app without a row", () => {
  const f = fixture();
  f.rows.splice(2, 1);
  assertEquals(run(f), ["apps/c: pack app has no row in TRIGGERS.json"]);
});

Deno.test("checkTriggers: row for a non-pack path", () => {
  const f = fixture();
  f.rows.push({ ...f.rows[0], path: "apps/zzz" });
  assertEquals(run(f), ["apps/zzz: row for a path not in w6w-pack.json"]);
});

Deno.test("checkTriggers: unknown mechanism", () => {
  const f = fixture();
  // deno-lint-ignore no-explicit-any
  (f.rows[2] as any).mechanism = "unclassified";
  assertEquals(run(f), ['apps/c: unknown mechanism "unclassified"']);
});

Deno.test("checkTriggers: poll row naming a missing action", () => {
  const f = fixture();
  f.rows[1].pollAction = "nope";
  assertEquals(run(f), ['apps/b: poll row names missing action "nope"']);
});

Deno.test("checkTriggers: none row with triggers/*.ts", () => {
  const f = fixture();
  Deno.mkdirSync(`${f.root}/apps/a/triggers`);
  Deno.writeTextFileSync(`${f.root}/apps/a/triggers/x.ts`, "");
  assertEquals(run(f), ["apps/a: row says none but the app has triggers/*.ts"]);
});

Deno.test("checkTriggers: none row without a reason", () => {
  const f = fixture();
  f.rows[0].reason = " ";
  assertEquals(run(f), ["apps/a: none row has no reason"]);
});

Deno.test("checkTriggers: TRIGGERS.md out of date or missing", () => {
  const f = fixture();
  assertEquals(run(f, renderMarkdown(f.rows) + "x").length, 1);
  assertEquals(run(f, null).length, 1);
});

Deno.test("renderMarkdown: totals sum to the row count, one table per mechanism", () => {
  const f = fixture();
  const md = renderMarkdown(f.rows);
  assertEquals(
    md.includes(
      "**Totals:** 3 apps — webhook-api: 1, manual-webhook: 0, poll: 1, none: 1",
    ),
    true,
  );
  for (const m of MECHANISMS) assertEquals(md.includes(`## ${m} (`), true);
});
