import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/charge-get.ts";

Deno.test("charge-get: GETs /charges/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ch_1" } }]);
  await action.execute({ chargeId: "ch_1" }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/charges/ch_1");
});
