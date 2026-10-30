import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-subscriptions.ts";
import { optionValues } from "../_helpers.ts";

const ok = { status: 200, body: { object: "list", has_more: false, next: null, data: [] } };

test("list-subscriptions: is a search action over the subscription resource", () => {
  assertEquals(action.key, "list-subscriptions");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "subscription");
});

test("list-subscriptions: GETs /subscriptions with the state filter", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ state: "live" }, connected(ctx));
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/subscriptions");
  assertEquals(url.searchParams.get("state"), "live");
});

test("list-subscriptions: offers exactly the six documented state values", () => {
  assertEquals(optionValues(action, "state"), [
    "active",
    "canceled",
    "expired",
    "future",
    "in_trial",
    "live",
  ]);
});

test("list-subscriptions: a `next` value overrides every other param", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ next: "/subscriptions?cursor=xyz", state: "active" }, connected(ctx));
  assertEquals(calls[0].url, "https://v3.recurly.com/subscriptions?cursor=xyz");
});
