import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("webhook-list: fetches with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("webhooks", []) }]);
  await webhookList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(webhookList.params, []);
});
