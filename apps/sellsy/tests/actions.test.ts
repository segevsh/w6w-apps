import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "./_assert.ts";
import { mockCtx } from "./_helpers.ts";
import type { HookContext } from "@w6w/types";
import app from "../index.ts";
import { cases } from "./actions/cases.ts";
import { SellsyError } from "../lib/client.ts";

const byKey = (key: string) => {
  const a = app.actions.find((x) => x.key === key);
  if (!a) throw new Error(`no action ${key}`);
  return a;
};

const run = (key: string, input: Record<string, unknown>, ctx: HookContext): Promise<unknown> =>
  Promise.resolve(byKey(key).execute!(input, ctx));

test("cases: exactly one case per action", () => {
  assertEquals(cases.map((c) => c.key).sort(), app.actions.map((a) => a.key).sort());
});

test("list result: carries data, pagination and aggregations", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      pagination: { limit: 25, count: 1, total: 9, offset: "c" },
      data: [{ id: 1 }],
      aggregations: { n: 1 },
    },
  }]);
  const out = await run("opportunity-search", {}, ctx) as Record<string, unknown>;
  assertEquals(out.data, [{ id: 1 }]);
  assertEquals((out.pagination as { offset: string }).offset, "c");
  assertEquals(out.aggregations, { n: 1 });
});

test("search: an empty filter set still sends `filters: {}` (the API requires it)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await run("company-search", {}, ctx);
  assertEquals(JSON.parse(calls[0].body!), { filters: {} });
});

test("search: the raw filters JSON is merged over the typed fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await run("company-search", {
    name: "A",
    filters: '{"created":{"start":"2026-01-01T00:00:00Z"}}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    filters: { name: "A", created: { start: "2026-01-01T00:00:00Z" } },
  });
});

test("paging: limit outside 1-100 is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => run("staff-list", { limit: 101 }, ctx),
    Error,
    "limit",
  );
  await assertRejects(
    () => run("search", { q: "x", limit: 0 }, ctx),
    Error,
    "limit",
  );
  assertEquals(calls.length, 0);
});

test("update: refuses an empty update instead of sending {}", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => run("company-update", { id: 7 }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

test("update: the `extra` JSON reaches fields the form does not list", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7 } }]);
  await run("company-update", { id: 7, extra: '{"capital":"1000"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { capital: "1000" });
});

test("update: a 204 answer still returns a result object", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await run("contact-update", { id: 9, note: "x" }, ctx) as {
    contact: unknown;
  };
  assertEquals(out.contact, { id: 9 });
});

test("json params: invalid JSON names the offending field", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => run("company-create", { name: "A", type: "client", legal_france: "{oops" }, ctx),
    Error,
    "legal_france must be valid JSON",
  );
});

test("id lists: a non-integer is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => run("company-search", { id: "1,x" }, ctx),
    Error,
    "integer IDs",
  );
});

test("webhook-create: needs at least one event", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => run("webhook-create", { endpoint: "https://x.io", events: " , " }, ctx),
    Error,
    "at least one event",
  );
});

test("estimate-status-update: refuses an unknown status", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => run("estimate-status-update", { id: 1, status: "won" }, ctx),
    Error,
    "status must be one of",
  );
});

test("errors: the vendor's message and per-field details are surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      error: {
        code: 400,
        message: "Validation failed",
        context: "validation",
        details: { name: "required" },
      },
    },
  }]);
  const err = await assertRejects(
    () => run("company-create", { name: "A", type: "client" }, ctx),
    SellsyError,
  );
  assertEquals(err.message, "Sellsy: Validation failed (name: required)");
  assertEquals((err as SellsyError).context, "validation");
});

test("errors: 403 points at the missing scope, 429 at the quota", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: { error: { code: 403, message: "Forbidden" } } },
    { status: 429, body: { error: { code: 429, message: "Rate limit error" } } },
  ]);
  const a = await assertRejects(
    () => run("staff-list", {}, ctx),
    SellsyError,
  );
  assert(a.message.includes("scope"));
  const b = await assertRejects(
    () => run("staff-list", {}, ctx),
    SellsyError,
  );
  assert(b.message.includes("quota"));
});

test("errors: a non-JSON failure body still yields a readable message", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    body: "<html>bad gateway</html>",
    headers: { "content-type": "text/html" },
  }]);
  const err = await assertRejects(
    () => run("quota-get", {}, ctx),
    SellsyError,
  );
  assertEquals(err.message, "Sellsy returned HTTP 502");
});
