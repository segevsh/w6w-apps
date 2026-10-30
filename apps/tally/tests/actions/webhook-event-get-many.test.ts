import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-event-get-many.ts";

test("webhook-event-get-many: GETs the delivery log", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        events: [{ id: "e1", webhookId: "wh1" }],
        page: 1,
        limit: 25,
        hasMore: false,
        totalNumberOfEvents: 1,
      },
    },
  ]);
  const result = await action.execute({ webhookId: "wh1", page: 1 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/webhooks/wh1/events");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(result.events, [{ id: "e1", webhookId: "wh1" }]);
  assertEquals(result.totalNumberOfEvents, 1);
});

test("webhook-event-get-many: offers no limit — the server fixes pages at 25", () => {
  assertEquals(action.params?.map((p) => p.key), ["webhookId", "page"]);
});
