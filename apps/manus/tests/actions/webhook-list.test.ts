import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

test("webhook-list: gets /v2/webhook.list and returns the array unwrapped", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({
      data: [{ id: "w1", url: "https://example.com/hook", status: "active", created_at: 1 }],
    }),
  }]);
  const out = await webhookList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/webhook.list");
  assertEquals(out[0].id, "w1");
});
