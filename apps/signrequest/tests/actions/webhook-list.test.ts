import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-list: GETs /webhooks/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  await webhookList.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/api/v1/webhooks/");
});
