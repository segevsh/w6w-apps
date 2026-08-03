import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-task-list.ts";

Deno.test("get-task-list: GETs one list and percent-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "A=" } }]);
  await action.execute!({ taskList: "AAMkADIyAAAAABrJAAA=" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/todo/lists/AAMkADIyAAAAABrJAAA%3D",
  );
});

Deno.test("get-task-list: forwards $select", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ taskList: "L1", select: ["id", "wellknownListName"] }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("$select"),
    "id,wellknownListName",
  );
});

Deno.test("get-task-list: requires the task list id", () => {
  assertEquals(action.params!.find((p) => p.key === "taskList")?.required, true);
});
