import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-get.ts";

Deno.test("issue-get: GETs /projects/{id}/issues/{iid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { iid: 42 } }]);
  await action.execute({ projectId: "group/project", issueIid: 42 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/group%2Fproject/issues/42");
});
