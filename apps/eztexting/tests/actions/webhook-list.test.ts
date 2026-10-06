import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

Deno.test("webhook-list: calls GET /webhooks/subscriptions and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "w1", type: "inbound_text.received" }]) }]);
  const result = await webhookList.execute({ "page": 0 } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/webhooks/subscriptions`);
  assertEquals(queryOf(calls[0].url), { "page": "0" });
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "content": [{ "id": "w1", "type": "inbound_text.received" }],
    "totalPages": 1,
    "totalElements": 1,
    "numberOfElements": 1,
  });
});

Deno.test("webhook-list: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "w1", type: "inbound_text.received" }]) }]);
  await webhookList.execute({ "page": 0 } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
