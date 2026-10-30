import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-list.ts";

test("webhook-list: GETs /webhooks with pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  await action.execute({ limit: 20 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/webhooks");
  assertEquals(url.searchParams.get("limit"), "20");
});
