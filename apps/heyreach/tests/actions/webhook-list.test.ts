import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-list.ts";

Deno.test("webhook-list: POSTs the paging body and leaves custom headers out by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 1, items: [] } }]);
  await action.execute!({ limit: 50, offset: 0 }, ctx);
  assertEquals(calls[0].url, "https://api.heyreach.io/api/public/webhooks/GetAllWebhooks");
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { offset: 0, limit: 50 });
});

Deno.test("webhook-list: custom headers are only returned when asked for", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({ includeCustomHeaders: true, limit: 10, offset: 0 }, ctx);
  assertEquals(jsonBody(calls[0]), { offset: 0, limit: 10, includeCustomHeaders: true });
});
