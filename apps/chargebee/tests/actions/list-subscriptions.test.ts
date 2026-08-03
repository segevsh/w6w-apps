import { assertEquals } from "@std/assert";
import { connected, mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/list-subscriptions.ts";

const ok = { status: 200, body: { list: [] } };

Deno.test("list-subscriptions: is a search action over the subscription resource", () => {
  assertEquals(action.key, "list-subscriptions");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "subscription");
});

Deno.test("list-subscriptions: GETs /subscriptions", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({}, connected(ctx));
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/subscriptions");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-subscriptions: sends every filter in operator form", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    limit: 100,
    offset: "cur",
    customerId: "cust_1",
    itemId: "silver",
    itemPriceId: "silver-USD-monthly",
    status: "active",
    includeDeleted: false,
    sortAttribute: "created_at",
    sortOrder: "asc",
  }, connected(ctx));

  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("limit"), "100");
  assertEquals(q.get("offset"), "cur");
  assertEquals(q.get("customer_id[is]"), "cust_1");
  assertEquals(q.get("item_id[is]"), "silver");
  assertEquals(q.get("item_price_id[is]"), "silver-USD-monthly");
  assertEquals(q.get("status[is]"), "active");
  assertEquals(q.get("sort_by[asc]"), "created_at");
  // `false` is a real value, not an omission.
  assertEquals(q.get("include_deleted"), "false");
});

Deno.test("list-subscriptions: offers exactly Chargebee's documented status filter values", () => {
  assertEquals(optionValues(action, "status"), [
    "future",
    "in_trial",
    "active",
    "non_renewing",
    "paused",
    "cancelled",
  ]);
});

Deno.test("list-subscriptions: sorts by created_at or updated_at, matching this endpoint", () => {
  assertEquals(optionValues(action, "sortAttribute"), ["created_at", "updated_at"]);
});

Deno.test("list-subscriptions: returns the list envelope unchanged", async () => {
  const body = { list: [{ subscription: { id: "s1" }, customer: { id: "c1" } }], next_offset: "x" };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute({}, connected(ctx)), body);
});
