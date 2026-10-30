import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-get.ts";

test("webhook-get: GETs /webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "WHK-1", secret: "abc" } }]);
  await action.execute({ id: "WHK-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/webhooks/WHK-1");
});
