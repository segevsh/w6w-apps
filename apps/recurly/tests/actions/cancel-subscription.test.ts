import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/cancel-subscription.ts";
import { optionValues } from "../_helpers.ts";

Deno.test("cancel-subscription: is an idempotent perform action requiring subscriptionId", () => {
  assertEquals(action.key, "cancel-subscription");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  const p = (action.params ?? []).find((p) => p.key === "subscriptionId")!;
  assertEquals(p.required, true);
});

Deno.test("cancel-subscription: offers exactly the two documented timeframe values", () => {
  assertEquals(optionValues(action, "timeframe"), ["bill_date", "term_end"]);
});

Deno.test("cancel-subscription: PUTs /subscriptions/{id}/cancel with the timeframe", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "s1", state: "canceled" } }]);
  await action.execute({ subscriptionId: "s1", timeframe: "bill_date" }, connected(ctx));
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/subscriptions/s1/cancel");
  assertEquals(JSON.parse(calls[0].body ?? "{}").timeframe, "bill_date");
});

Deno.test("cancel-subscription: omitting timeframe lets Recurly apply its own default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ subscriptionId: "s1" }, connected(ctx));
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {});
});
