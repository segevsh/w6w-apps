import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-checklist-item.ts";

Deno.test("create-checklist-item: POSTs displayName to the task's collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c1" } }]);
  await action.execute!({ taskList: "L1", task: "T1", displayName: "Sign off" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/todo/lists/L1/tasks/T1/checklistItems",
  );
  assertEquals(JSON.parse(calls[0].body!), { displayName: "Sign off" });
});

Deno.test("create-checklist-item: isChecked=false is sent, not dropped as falsy", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ taskList: "L1", task: "T1", displayName: "x", isChecked: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { displayName: "x", isChecked: false });
});

Deno.test("create-checklist-item: never offers the server-stamped timestamps", () => {
  const keys = action.params!.map((p) => p.key);
  for (const forbidden of ["checkedDateTime", "createdDateTime", "id"]) {
    assert(!keys.includes(forbidden), `${forbidden} must not be an input`);
  }
  assertEquals(action.idempotent, false);
});
