import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-edit.ts";

Deno.test("issue-edit: PUTs only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { iid: 3 } }]);
  await action.execute(
    { projectId: "group/project", issueIid: 3, title: "New", stateEvent: "reopen" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/group%2Fproject/issues/3");
  assertEquals(JSON.parse(calls[0].body!), { title: "New", state_event: "reopen" });
});
