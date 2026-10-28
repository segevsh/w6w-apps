import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-checklist-items.ts";

Deno.test("list-checklist-items: hits the task's checklistItems collection", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({ taskList: "L1", task: "T1" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/todo/lists/L1/tasks/T1/checklistItems",
  );
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
});

Deno.test("list-checklist-items: `all` follows nextLink", async () => {
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "c1" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/p2" } },
    { body: { value: [{ id: "c2" }] } },
  ]);
  const out = await action.execute!({ taskList: "L1", task: "T1", all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
});
