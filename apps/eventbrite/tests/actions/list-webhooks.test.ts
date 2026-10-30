import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-webhooks.ts";

test("list-webhooks: GETs org webhooks", async () => {
  const body = { webhooks: [], pagination: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ organizationId: "9" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/organizations/9/webhooks/");
  assertEquals(result, body);
});
