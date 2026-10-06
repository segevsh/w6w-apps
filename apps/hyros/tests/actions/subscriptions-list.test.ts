import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import subscriptionsList from "../../actions/subscriptions-list.ts";

Deno.test("subscriptions-list: GET /subscriptions, unwraps result and cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { request_id: "r", result: [{ id: "a" }], nextPageId: "n1" },
  }]);
  const out = await subscriptionsList.execute({ pageSize: 25, pageId: "p0" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/subscriptions");
  assertEquals(queryOf(calls[0].url).pageSize, "25");
  assertEquals(queryOf(calls[0].url).pageId, "p0");
  assertEquals(out, { result: [{ id: "a" }], nextPageId: "n1" });
});

Deno.test("subscriptions-list: null cursor on the last page; empty filters omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [] } }]);
  const out = await subscriptionsList.execute({}, ctx) as { nextPageId: string | null };
  assertEquals(out.nextPageId, null);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("subscriptions-list: surfaces a Hyros error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { result: "ERROR", message: ["bad"] } }]);
  await assertRejects(async () => await subscriptionsList.execute({}, ctx), Error, "bad");
});

Deno.test("subscriptions-list: states are an unquoted comma list", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [] } }]);
  await subscriptionsList.execute({ subscriptionStates: "ACTIVE, PAUSED" }, ctx);
  assertEquals(queryOf(calls[0].url).subscriptionStates, "ACTIVE,PAUSED");
});
