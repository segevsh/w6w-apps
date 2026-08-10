import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import updateTask from "../../actions/update-task.ts";

Deno.test("update-task: PATCHes only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: { task_id: "t1" } } } }]);
  await updateTask.execute({ taskId: "t1", isCompleted: true }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://api.attio.com/v2/tasks/t1");
  // Untouched fields are absent, not null — omission means "leave it alone".
  assertEquals(JSON.parse(calls[0].body!), { data: { is_completed: true } });
});

/**
 * The distinction that `compact()` exists for: on this endpoint `deadline_at`
 * is typed `["string","null"]`, so an explicit null CLEARS the deadline while
 * omission leaves it alone.
 */
Deno.test("update-task: an explicit null deadline survives and clears it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }]);
  await updateTask.execute({ taskId: "t1", deadlineAt: null }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { data: { deadline_at: null } });
});

Deno.test("update-task: converts assignees, and an empty array unassigns everyone", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: {} } },
    { status: 200, body: { data: {} } },
  ]);
  await updateTask.execute({ taskId: "t1", assignees: ["alice@attio.com"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).data.assignees, [
    { workspace_member_email_address: "alice@attio.com" },
  ]);

  await updateTask.execute({ taskId: "t1", assignees: [] }, ctx);
  // An empty array is a deliberate "no assignees", not an omission.
  assertEquals(JSON.parse(calls[1].body!), { data: { assignees: [] } });
});

Deno.test("update-task: says the content cannot be changed", () => {
  assert(/text cannot be changed/i.test(updateTask.description!));
  assertEquals((updateTask.params ?? []).some((p) => p.key === "content"), false);
});
