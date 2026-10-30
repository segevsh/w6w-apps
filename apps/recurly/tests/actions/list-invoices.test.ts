import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-invoices.ts";
import { optionValues } from "../_helpers.ts";

const ok = { status: 200, body: { object: "list", has_more: false, next: null, data: [] } };

test("list-invoices: is a search action over the invoice resource", () => {
  assertEquals(action.key, "list-invoices");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "invoice");
});

test("list-invoices: GETs /invoices with state and type filters", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ state: "past_due", type: "charge" }, connected(ctx));
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/invoices");
  assertEquals(url.searchParams.get("state"), "past_due");
  assertEquals(url.searchParams.get("type"), "charge");
});

test("list-invoices: offers exactly the eight documented state values", () => {
  assertEquals(optionValues(action, "state"), [
    "pending",
    "processing",
    "past_due",
    "paid",
    "failed",
    "open",
    "closed",
    "voided",
  ]);
});

test("list-invoices: offers exactly the four documented type values", () => {
  assertEquals(optionValues(action, "type"), ["charge", "credit", "non-legacy", "legacy"]);
});
