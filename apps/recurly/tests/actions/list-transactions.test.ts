import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-transactions.ts";
import { optionValues } from "../_helpers.ts";

const ok = { status: 200, body: { object: "list", has_more: false, next: null, data: [] } };

Deno.test("list-transactions: is a search action over the transaction resource", () => {
  assertEquals(action.key, "list-transactions");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "transaction");
});

Deno.test("list-transactions: GETs /transactions with type and success filters", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ type: "refund", success: true }, connected(ctx));
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/transactions");
  assertEquals(url.searchParams.get("type"), "refund");
  assertEquals(url.searchParams.get("success"), "true");
});

Deno.test("list-transactions: success=false sends nothing — Recurly's filter is `true`-only", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ success: false }, connected(ctx));
  assertEquals(new URL(calls[0].url).searchParams.get("success"), null);
});

Deno.test("list-transactions: offers exactly the six documented type values", () => {
  assertEquals(optionValues(action, "type"), [
    "authorization",
    "capture",
    "payment",
    "purchase",
    "refund",
    "verify",
  ]);
});
