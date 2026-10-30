import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

const WEBHOOK = {
  webhookId: "507f191e810c19729de860ea",
  url: "https://example.com/hook",
  triggers: ["INCOMING_MESSAGE"],
};

test("webhook-list: reads the webhooks page and returns its rows", async () => {
  const { ctx, calls } = mockCtx([{ body: page([WEBHOOK], { totalElements: 1 }) }]);
  const result = await webhookList.execute({}, ctx) as { content: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/webhooks`);
  assertEquals(result.content, [WEBHOOK]);
});

test("webhook-list: forwards page and size verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await webhookList.execute({ page: 0, size: 50 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "0", size: "50" });
});

test("webhook-list: is a read action grouped under webhook", () => {
  assertEquals(webhookList.type, "read");
  assertEquals(webhookList.resource, "webhook");
});
