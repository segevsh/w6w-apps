import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-log-list.ts";
import { envelope, exec, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-log-list: lists a webhook's deliveries with filters", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ id: 3 }], { hasMore: true, startingAfter: 3 }),
  }]);
  const out = await exec(action, {
    webhookId: "1623423",
    status: "failed",
    dateSentAfter: "2026-01-01",
    limit: 5,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/webhooks/1623423/logs");
  const q = queryOf(calls[0].url);
  assertEquals(q.status, "failed");
  assertEquals(q.dateSentAfter, "2026-01-01");
  assertEquals(q.limit, "5");
  assertEquals(out.logs, [{ id: 3 }]);
  assertEquals(out.hasMore, true);
  assertEquals(out.startingAfter, 3);
});
