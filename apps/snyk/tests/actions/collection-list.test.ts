import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/collection-list.ts";

Deno.test("collection-list: lists an org's collections", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "c1" }], links: {} } }], {
    display: { orgId: "org-1" },
  });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/orgs/org-1/collections");
  assertEquals(result, [{ id: "c1" }]);
});
