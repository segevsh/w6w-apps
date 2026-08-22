import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

const display = { orgId: "org-1" };

Deno.test("project-list: filters map to Snyk's repeated params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "p1" }], links: {} } }], {
    display,
  });
  const result = await action.execute!({ targetId: "t1,t2", origins: "github" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/rest/orgs/org-1/projects");
  assertEquals(q.getAll("target_id"), ["t1", "t2"]);
  assertEquals(q.getAll("origins"), ["github"]);
  assertEquals(result, [{ id: "p1" }]);
});
