import { assertEquals } from "@std/assert";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/organization-get-many.ts";

Deno.test("organization-get-many: pages with page[size]", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { organizations: [] } }]);
  await action.execute({ pageSize: 25 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("page[size]"), "25");
});
