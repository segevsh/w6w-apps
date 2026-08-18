import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/org-list.ts";

Deno.test("org-list: needs no org of its own — it is how you find one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "o1" }], links: {} } }], {
    display: {},
  });
  const result = await action.execute!({ groupId: "g1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/orgs");
  assertEquals(new URL(calls[0].url).searchParams.get("group_id"), "g1");
  assertEquals(result, [{ id: "o1" }]);
});
