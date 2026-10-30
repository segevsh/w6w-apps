import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/payment-get-many.ts";

test("payment-get-many: GETs /payments scoped to a client", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { data: [] } }]);
  await action.execute({ clientId: "cl1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/payments");
  assertEquals(url.searchParams.get("client_id"), "cl1");
});
