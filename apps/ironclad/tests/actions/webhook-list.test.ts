import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-list: GET /webhooks (no count in this envelope)", async () => {
  const { ctx, calls } = mockCtx([{ body: { page: 0, pageSize: 20, list: [{ id: "h1" }] } }]);
  const out = await webhookList.execute({ pageSize: 20 }, ctx) as { list: unknown[] };
  assertEquals(pathOf(calls[0].url), "/public/api/v1/webhooks");
  assertEquals(queryOf(calls[0].url), { pageSize: "20" });
  assertEquals(out.list.length, 1);
});
