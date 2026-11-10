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
    { apps: 3, webhookApps: 2, pollApps: 2, bothApps: 1, triggers: 7 },
  );
});

Deno.test("formatLine: exact text", () => {
  assertEquals(
    formatLine({
      apps: 3,
      webhookApps: 2,
      pollApps: 2,
      bothApps: 1,
      triggers: 7,
    }),
    "Triggers: 3 apps (2 webhook, 2 poll), 7 triggers",
  );
});

import {
  checkTriggers,
  depthAppLine,
  depthSummary,
  isListAction,
  MECHANISMS,
  type N8nNode,
  renderMarkdown,
  scanDepth,
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
  checkTriggers(
    f.root,
    f.rows,
    md === undefined ? renderMarkdown(f.rows, scanDepth(f.root, f.rows)) : md,
  );
const md = (f: ReturnType<typeof fixture>) =>
  renderMarkdown(f.rows, scanDepth(f.root, f.rows));

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
  assertEquals(run(f, md(f) + "x").length, 1);
  assertEquals(run(f, null).length, 1);
});

Deno.test("renderMarkdown: totals sum to the row count, one table per mechanism", () => {
  const f = fixture();
  const out = md(f);
  assertEquals(
    out.includes(
      "**Totals:** 3 apps — webhook-api: 1, manual-webhook: 0, poll: 1, none: 1",
    ),
    true,
  );
  for (const m of MECHANISMS) assertEquals(out.includes(`## ${m} (`), true);
});

Deno.test("isListAction: classifier table", () => {
  const read = 'type: "read",';
  for (const s of ["list-contacts", "messages-list", "list-all-orders"]) {
    assertEquals(isListAction(s, read), true, s);
  }
  assertEquals(isListAction("search-deals", 'type: "search",'), true);
  assertEquals(isListAction("find-users", read), true);
  for (
    const s of [
      "get-contact",
      "get-list",
      "create-list",
      "add-contact-to-list",
      "remove-from-list",
      "update-list",
      "delete-list",
    ]
  ) assertEquals(isListAction(s, read), false, s);
  // type must be read/search
  assertEquals(isListAction("list-contacts", 'type: "write",'), false);
});

/** Fixture: apps/d has 4 list actions; one backed by import, one covers, one skipped. */
function depthFixture() {
  const root = Deno.makeTempDirSync();
  Deno.writeTextFileSync(
    `${root}/w6w-pack.json`,
    JSON.stringify({ apps: [{ path: "./apps/d" }, { path: "./apps/e" }] }),
  );
  const w = (p: string, t: string) => {
    Deno.mkdirSync(`${root}/${p.replace(/\/[^/]+$/, "")}`, { recursive: true });
    Deno.writeTextFileSync(`${root}/${p}`, t);
  };
  for (const s of ["list-a", "list-b", "list-c", "list-d"]) {
    w(`apps/d/actions/${s}.ts`, 'export default { type: "read" };');
  }
  w("apps/d/actions/get-a.ts", 'export default { type: "read" };');
  w(
    "apps/d/triggers/new-a.ts",
    'import a from "../actions/list-a.ts";\nkey: "new-a"',
  );
  w("apps/d/triggers/new-c.ts", 'key: "new-c"');
  w("apps/e/actions/search-x.ts", 'export default { type: "search" };');
  const row = (path: string, extra = {}): TriggerRow => ({
    path,
    mechanism: "webhook-api",
    candidates: [],
    pollAction: null,
    reason: "r",
    verified: false,
    source: "scan",
    ...extra,
  });
  return { root, row };
}

Deno.test("scanDepth: import-backed, covers, skipped, unaccounted", () => {
  const { root, row } = depthFixture();
  const none = scanDepth(root, [row("apps/d"), row("apps/e")]);
  assertEquals(none.apps["apps/d"].triggers, 2);
  assertEquals(none.apps["apps/d"].list, [
    "list-a",
    "list-b",
    "list-c",
    "list-d",
  ]);
  assertEquals(none.apps["apps/d"].backed, ["list-a"]);
  assertEquals(none.apps["apps/d"].unaccounted, ["list-b", "list-c", "list-d"]);
  const rich = scanDepth(root, [
    row("apps/d", {
      covers: { "list-b": "new-c" },
      skipped: { "list-c": "admin only" },
    }),
    row("apps/e"),
  ]);
  assertEquals(rich.apps["apps/d"].backed, ["list-a", "list-b"]);
  assertEquals(rich.apps["apps/d"].skipped, ["list-c"]);
  assertEquals(rich.apps["apps/d"].unaccounted, ["list-d"]);
  assertEquals(
    depthAppLine("apps/d", rich.apps["apps/d"]),
    "apps/d: triggers=2 list=4 backed=2 skipped=1 unaccounted=[list-d] n8n-missing=n/a",
  );
});

Deno.test("depthSummary: exact text, n/a and measured", () => {
  const { root, row } = depthFixture();
  const rows = [row("apps/d"), row("apps/e")];
  assertEquals(
    depthSummary(scanDepth(root, rows)),
    "depth: 2 apps, 2 triggers, 4 unaccounted list actions in 2 apps, n8n-parity misses n/a (report-only)",
  );
  const n8n: N8nNode[] = [{
    node: "DTrigger",
    app: "apps/d",
    events: ["x", "y"],
  }];
  rows[0].n8n = { x: "skip: no vendor event" };
  assertEquals(
    depthSummary(scanDepth(root, rows, n8n)),
    "depth: 2 apps, 2 triggers, 4 unaccounted list actions in 2 apps, n8n-parity misses 1 (report-only)",
  );
});

Deno.test("checkTriggers: depth validity errors", () => {
  const { root, row } = depthFixture();
  const check = (extra: object) => {
    const rows = [row("apps/d", extra), row("apps/e")];
    return checkTriggers(
      root,
      rows,
      renderMarkdown(rows, scanDepth(root, rows)),
    );
  };
  assertEquals(check({ covers: { "list-b": "new-c" } }), []);
  assertEquals(check({ covers: { zzz: "new-c" } }), [
    'apps/d: covers names missing action "zzz"',
  ]);
  assertEquals(check({ skipped: { zzz: "why" } }), [
    'apps/d: skipped names missing action "zzz"',
  ]);
  assertEquals(check({ covers: { "list-b": "nope" } }), [
    'apps/d: covers "list-b" names unknown trigger "nope"',
  ]);
  assertEquals(check({ events: { e1: "nope" }, n8n: { e2: "nope" } }), [
    'apps/d: events "e1" names unknown trigger "nope"',
    'apps/d: n8n "e2" names unknown trigger "nope"',
  ]);
  assertEquals(check({ events: { e1: "any" }, n8n: { e2: "skip: x" } }), []);
  assertEquals(check({ skipped: { "list-b": " " } }), [
    'apps/d: skipped "list-b" has an empty reason',
  ]);
  assertEquals(
    check({ covers: { "list-b": "new-c" }, skipped: { "list-b": "r" } }),
    ['apps/d: action "list-b" is both covered and skipped'],
  );
});

Deno.test("checkTriggers: strict depth flips the result, default is report-only", () => {
  const { root, row } = depthFixture();
  const rows = [row("apps/d"), row("apps/e")];
  const text = renderMarkdown(rows, scanDepth(root, rows));
  assertEquals(checkTriggers(root, rows, text), []);
  assertEquals(checkTriggers(root, rows, text, { strictDepth: true }), [
    "depth: 4 unaccounted list actions (strict)",
  ]);
});
