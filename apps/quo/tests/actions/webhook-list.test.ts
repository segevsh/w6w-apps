import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("webhook-list: GETs /v1/webhooks with an optional userId filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await webhookList.execute({ userId: "US1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(queryOf(calls[0].url).userId, "US1");
});

test("webhook-list: is a search action", () => {
  assertEquals(webhookList.type, "search");
});
