import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, csv, PagerDutyClient } from "../../lib/client.ts";

Deno.test("client: sends the versioning accept header and no authorization", async () => {
  const { ctx, calls } = mockCtx([{ body: { incident: { id: "P1" } } }]);
  await new PagerDutyClient(ctx).request("/incidents/P1");
  assertEquals(calls[0].url, "https://api.pagerduty.com/incidents/P1");
  assertEquals(calls[0].headers["accept"], "application/vnd.pagerduty+json;version=2");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: sets the From header only when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await new PagerDutyClient(ctx).request("/incidents", { method: "POST", body: {} });
  assertEquals("from" in calls[0].headers, false);

  await new PagerDutyClient(ctx).request("/incidents", {
    method: "POST",
    body: {},
    from: "user@example.com",
  });
  assertEquals(calls[1].headers["from"], "user@example.com");
});

Deno.test("client: array query params use the bracketed `key[]` form", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new PagerDutyClient(ctx).request("/incidents", {
    query: { "statuses": ["triggered", "acknowledged"], "team_ids": ["T1"] },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("statuses[]"), ["triggered", "acknowledged"]);
  assertEquals(url.searchParams.getAll("team_ids[]"), ["T1"]);
});

Deno.test("client: surfaces PagerDuty's error body", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    statusText: "Bad Request",
    body: '{"error":{"message":"Arguments caused an error","code":2001}}',
  }]);
  await assertRejects(
    () => new PagerDutyClient(ctx).request("/incidents", { method: "POST", body: {} }),
    Error,
    "Arguments caused an error",
  );
});

Deno.test("client: returns undefined for a 204 response", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new PagerDutyClient(ctx).request("/schedules/S1/overrides/O1"), undefined);
});

Deno.test("requestAll: follows `more` until it is false, one page per call", async () => {
  const { ctx, calls } = mockCtx([
    { body: { incidents: [{ id: "P1" }], more: true } },
    { body: { incidents: [{ id: "P2" }], more: false } },
  ]);
  const items = await new PagerDutyClient(ctx).requestAll("/incidents", "incidents");
  assertEquals(items, [{ id: "P1" }, { id: "P2" }]);
  assertEquals(calls.length, 2);
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "0");
  assertEquals(new URL(calls[1].url).searchParams.get("offset"), "100");
});

Deno.test("requestAll: stops early once `wantTotal` items are collected", async () => {
  const { ctx, calls } = mockCtx([{
    body: { incidents: [{ id: "P1" }, { id: "P2" }], more: true },
  }]);
  const items = await new PagerDutyClient(ctx).requestAll("/incidents", "incidents", {}, 1);
  assertEquals(items, [{ id: "P1" }]);
  assertEquals(calls.length, 1);
});

Deno.test("requestAll: stops when a page comes back empty even if `more` is true", async () => {
  const { ctx, calls } = mockCtx([{ body: { incidents: [], more: true } }]);
  const items = await new PagerDutyClient(ctx).requestAll("/incidents", "incidents");
  assertEquals(items, []);
  assertEquals(calls.length, 1);
});

Deno.test("compact: keeps false/0 but drops unset fields", () => {
  assertEquals(compact({ ok: false, n: 0, a: undefined, b: null, c: "" }), { ok: false, n: 0 });
});

Deno.test("csv: splits, trims and drops blanks; a blank field stays unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
  assertEquals(csv(" , "), undefined);
});
