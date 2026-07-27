import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-create.ts";

Deno.test("issue-create: POSTs /projects/{id}/issues", async () => {
  const { ctx, calls } = mockCtx([{ body: { iid: 1 } }]);
  await action.execute({ projectId: "group/project", title: "Bug" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/group%2Fproject/issues");
  assertEquals(JSON.parse(calls[0].body!), { title: "Bug" });
});

Deno.test("issue-create: sends labels as a CSV string and assignee_ids as numbers", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { projectId: "1", title: "Bug", labels: "p1, bug", assigneeIds: "5, 9" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.labels, "p1,bug");
  assertEquals(body.assignee_ids, [5, 9]);
});

Deno.test("issue-create: is not idempotent — a retry files a duplicate", () => {
  assertEquals(action.idempotent, false);
});
