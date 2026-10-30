import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pageEnvelope, pathOf } from "../_helpers.ts";

test("webhook-list: hits /webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: "wh_1" }]) }]);
  await webhookList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
});
