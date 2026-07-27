import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/merge-request-create.ts";

Deno.test("merge-request-create: POSTs /projects/{id}/merge_requests", async () => {
  const { ctx, calls } = mockCtx([{ body: { iid: 1 } }]);
  await action.execute(
    { projectId: "group/project", sourceBranch: "feat", targetBranch: "main", title: "Feature" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/group%2Fproject/merge_requests");
  assertEquals(JSON.parse(calls[0].body!), {
    source_branch: "feat",
    target_branch: "main",
    title: "Feature",
  });
});

Deno.test("merge-request-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
