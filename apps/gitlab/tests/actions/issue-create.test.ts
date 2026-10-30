import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-create.ts";

test("issue-create: POSTs /projects/{id}/issues", async () => {
  const { ctx, calls } = mockCtx([{ body: { iid: 1 } }]);
  await action.execute({ projectId: "group/project", title: "Bug" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/group%2Fproject/issues");
  assertEquals(JSON.parse(calls[0].body!), { title: "Bug" });
});

test("issue-create: sends labels as a CSV string and assignee_ids as numbers", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { projectId: "1", title: "Bug", labels: "p1, bug", assigneeIds: "5, 9" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.labels, "p1,bug");
  assertEquals(body.assignee_ids, [5, 9]);
});

test("issue-create: is not idempotent — a retry files a duplicate", () => {
  assertEquals(action.idempotent, false);
});

test("issue-create: forwards milestone_id, confidential and weight", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { projectId: "1", title: "Bug", milestoneId: 7, confidential: true, weight: 3 },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.milestone_id, 7);
  assertEquals(body.confidential, true);
  assertEquals(body.weight, 3);
});

test("issue-create: the weight param documents the Premium/Ultimate gate", () => {
  assert(action.params?.find((p) => p.key === "weight")?.hint?.match(/premium|ultimate/i));
});

test("issue-create: omits the new optional fields when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ projectId: "1", title: "Bug" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body).sort(), ["title"]);
});
