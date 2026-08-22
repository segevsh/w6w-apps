import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/segmentation-query.ts";

const conn = { display: { projectId: "123", region: "eu" } };

Deno.test("segmentation-query: sends the event, the window and the count type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], conn);
  await action.execute!({
    event: "Signed Up",
    fromDate: "2026-08-01",
    toDate: "2026-08-18",
    type: "unique",
    on: 'properties["plan"]',
  }, ctx);
  const url = new URL(calls[0].url);
  // The EU project's query host, not the US one.
  assertEquals(url.host, "eu.mixpanel.com");
  assertEquals(url.pathname, "/api/query/segmentation");
  assertEquals(url.searchParams.get("event"), "Signed Up");
  assertEquals(url.searchParams.get("type"), "unique");
  assertEquals(url.searchParams.get("on"), 'properties["plan"]');
});

Deno.test("segmentation-query: an ISO timestamp is truncated to a date", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({
    event: "x",
    fromDate: "2026-08-01T10:00:00Z",
    toDate: "2026-08-18T10:00:00Z",
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("from_date"), "2026-08-01");
});

Deno.test("segmentation-query: the dates are required", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ event: "x" }, ctx), Error, "fromDate");
  assertEquals(calls.length, 0);
});

/** Counting events and counting people are different questions. */
Deno.test("segmentation-query: the count hint warns about the tenfold mistake", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) => p.key === "type")!;
  assert(/tenfold/.test(p.hint!), p.hint);
});
