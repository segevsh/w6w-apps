import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-list: GETs /forms/{formId}/webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ tag: "hubspot-webhook" }] }]);
  const out = await webhookList.execute({ formId: "f1" }, ctx) as { result: unknown };
  assertEquals(pathOf(calls[0].url), "/forms/f1/webhooks");
  assertEquals(out.result, [{ tag: "hubspot-webhook" }]);
});
