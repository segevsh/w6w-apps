import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/target-list.ts";

Deno.test("target-list: lists repositories, the level above projects", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "t1" }], links: {} } }], {
    display: { orgId: "org-1" },
  });
  const result = await action.execute!({ origin: "github", excludeEmpty: true }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/rest/orgs/org-1/targets");
  assertEquals(q.get("origin"), "github");
  assertEquals(q.get("exclude_empty"), "true");
  assertEquals(result, [{ id: "t1" }]);
});
