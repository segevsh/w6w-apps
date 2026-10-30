import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("webhook-list: GETs /v2/account/webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "w1" }]) }]);
  const out = await webhookList.execute({}, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/account/webhooks");
  assertEquals(out.data, [{ id: "w1" }]);
});
