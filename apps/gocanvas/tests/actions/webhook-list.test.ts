import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-list: GET /api/v3/forms/346127/webhooks with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }] }]);
  const out = await action.execute({ "formId": 346127, "page": 2 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/forms/346127/webhooks");
  assertEquals(queryOf(calls[0].url), { "page": "2" });
  assertEquals(calls[0].body, null);
  assertEquals((out as { items: unknown }).items, [{ "id": 1 }]);
});
