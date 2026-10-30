import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service, { PAGE_ID } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (ctx: any) => service.check!({} as any, ctx);
const page = (api: string, prospecting = "operational", web = "operational") => ({
  page: { id: PAGE_ID, name: "Lusha Status Page" },
  components: [
    { id: "bqq6gm6xj672", name: "Lusha API", status: api },
    { id: "g9tcs4jndlft", name: "Prospecting", status: prospecting },
    { id: "s789cq8cg65b", name: "Lusha Website", status: web },
  ],
});

test("service: operational API components are ok; hits the declared host", async () => {
  const { ctx, calls } = mockCtx([{ body: page("operational") }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://status.lusha.com/api/v2/summary.json");
});

test("service: the website being down does not fail the API check", async () => {
  assertEquals(
    (await run(mockCtx([{ body: page("operational", "operational", "major_outage") }]).ctx)).state,
    "ok",
  );
});

test("service: partial outage degrades, major outage is down", async () => {
  assertEquals((await run(mockCtx([{ body: page("partial_outage") }]).ctx)).state, "degraded");
  const r = await run(mockCtx([{ body: page("operational", "major_outage") }]).ctx);
  assertEquals(r.state, "down");
  assertEquals(r.message, "Prospecting is major_outage");
});

test("service: wrong page, no components, bad status, non-JSON, unreachable are unknown", async () => {
  assertEquals(
    (await run(mockCtx([{ body: { page: { id: "x" }, components: [] } }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await run(mockCtx([{ body: { page: { id: PAGE_ID }, components: [] } }]).ctx)).state,
    "unknown",
  );
  assertEquals((await run(mockCtx([{ status: 500, body: "x" }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ body: "<html>" }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([]).ctx)).state, "unknown");
});
