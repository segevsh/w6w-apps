import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import updateTask from "../../actions/update-task.ts";

Deno.test("update-task: PUTs /tasks/{id} and omits untouched fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 4066 } }]);
  await updateTask.execute({ id: 4066, isCompleted: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/tasks/4066");
  assertEquals(JSON.parse(calls[0].body!), { isCompleted: true });
});

/** The PUT schema declares no due-date fields; offering them would invent surface. */

/** The PUT schema declares no due-date fields; offering them would invent surface. */
Deno.test("update-task: does not offer undocumented due-date fields", () => {
  const keys = (updateTask.params ?? []).map((p) => p.key);
  for (const absent of ["dueDate", "dueDateTime", "remindSecondsBefore"]) {
    assert(!keys.includes(absent), `${absent} is not in the PUT schema and must not be offered`);
  }
  assertEquals(updateTask.idempotent, true);
});
