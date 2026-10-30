import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import subscriptionDelete from "../../actions/subscription-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("subscription-delete: DELETEs /v2/subscriptions/{iden}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await subscriptionDelete.execute({ iden: "s1" }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/subscriptions/s1");
  assertEquals(out.deleted, true);
});

test("subscription-delete: is declared idempotent", () => {
  assertEquals(subscriptionDelete.idempotent, true);
});
