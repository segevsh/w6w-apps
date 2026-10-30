import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookGet from "../../actions/webhook-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-get: GETs /v1/webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "WH1" } } }]);
  await webhookGet.execute({ id: "WH1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/WH1");
});

test("webhook-get: is a read action", () => {
  assertEquals(webhookGet.type, "read");
});
