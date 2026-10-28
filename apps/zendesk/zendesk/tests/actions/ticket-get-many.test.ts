import { assertEquals } from "@std/assert";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-get-many.ts";

Deno.test("ticket-get-many: uses Zendesk's page[size]/page[after] cursor params", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { tickets: [] } }]);
  await action.execute({ pageSize: 50, cursor: "abc", sortBy: "updated_at" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("page[size]"), "50");
  assertEquals(q.get("page[after]"), "abc");
  assertEquals(q.get("sort_by"), "updated_at");
});
