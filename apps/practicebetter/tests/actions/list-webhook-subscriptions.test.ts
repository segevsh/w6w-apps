import { assertEquals } from "@std/assert";
import action from "../../actions/list-webhook-subscriptions.ts";
import { API_ROOT, mockCtx, page, queryOf, urlOf } from "../_helpers.ts";

const sample = page([{ id: "sub-1", endpointUrl: "https://example.com/hook" }], { count: 1 });

Deno.test("list-webhook-subscriptions: reads /webhooks/subscription", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/webhooks/subscription`);
  assertEquals(result, sample);
});

Deno.test("list-webhook-subscriptions: its own filters — not the id/date family — are sent", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({
    eventType: "client.created",
    isActive: true,
    status: "enabled",
    limit: 10,
  }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.eventType, "client.created");
  assertEquals(query.isActive, "true");
  assertEquals(query.status, "enabled");
  assertEquals(query.limit, "10");
  // The response is still the shared envelope even though the filters are not.
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "count",
    "hasMore",
    "items",
  ]);
});

Deno.test("list-webhook-subscriptions: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
