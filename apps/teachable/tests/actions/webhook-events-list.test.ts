import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookEventsList from "../../actions/webhook-events-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("webhook-events-list: paths by webhook ID and forwards status-range filters", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("events", []) }]);
  await webhookEventsList.execute(
    { webhookId: 3, responseHttpStatusGte: 500, responseHttpStatusLte: 599 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/webhooks/3/events");
  assertEquals(
    queryOf(calls[0].url),
    { response_http_status_gte: "500", response_http_status_lte: "599", per: "20" },
  );
});
