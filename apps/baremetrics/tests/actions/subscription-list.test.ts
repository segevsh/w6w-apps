import { assert, assertEquals } from "@std/assert";
import subscriptionList from "../../actions/subscription-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscription-list: GET /v1/src1/subscriptions with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriptions: [] } }]);
  const out = await subscriptionList.execute({
    source_id: "src1",
    customer_oid: "x1",
    order: "desc",
    per_page: 5,
    page: 5,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/src1/subscriptions");
  assertEquals(queryOf(calls[0].url), {
    customer_oid: "x1",
    order: "desc",
    per_page: "5",
    page: "5",
  });

  const bare = mockCtx([{ body: {} }]);
  await subscriptionList.execute({ source_id: "src1" }, bare.ctx);
  assertEquals(queryOf(bare.calls[0].url), {}, "unset optional params must not reach the query");
  assertEquals(calls[0].body, null);
  assert("subscriptions" in out);
});

Deno.test("subscription-list: declares type search and every required param", () => {
  assertEquals(subscriptionList.type, "search");
  const required = (subscriptionList.params ?? []).filter((p) => p.required).map((p) => p.key)
    .sort();
  assertEquals(required, ["source_id"]);
});

Deno.test("subscription-list: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await subscriptionList.execute({
      source_id: "src1",
      customer_oid: "x1",
      order: "desc",
      per_page: 5,
      page: 5,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
