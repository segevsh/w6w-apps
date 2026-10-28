import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-checklist-item.ts";

Deno.test("update-checklist-item: PATCHes the encoded three-segment path", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c=1" } }]);
  await action.execute!({
    taskList: "L=1",
    task: "T=1",
    checklistItem: "c=1",
    isChecked: true,
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/todo/lists/L%3D1/tasks/T%3D1/checklistItems/c%3D1",
  );
  assertEquals(JSON.parse(calls[0].body!), { isChecked: true });
});

Deno.test("update-checklist-item: unticking sends false rather than nothing", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ taskList: "L1", task: "T1", checklistItem: "c1", isChecked: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { isChecked: false });
});

Deno.test("update-checklist-item: renaming alone touches nothing else", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    taskList: "L1",
    task: "T1",
    checklistItem: "c1",
    displayName: "Renamed",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { displayName: "Renamed" });
});
