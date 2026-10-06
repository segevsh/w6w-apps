import { assertEquals } from "@std/assert";
import taskMarkComplete from "../../actions/task-mark-complete.ts";
import { mockCtx, pathOf, queryOf, single } from "../_helpers.ts";

Deno.test("task-mark-complete: POST /tasks/{id}/actions/markComplete with actionParams in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: single("task", 6, { state: "complete" }) }]);
  await taskMarkComplete.execute({
    id: 6,
    completionNote: "Done: spoke to Jane",
    completionAction: "finish_replied",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/tasks/6/actions/markComplete");
  assertEquals(calls[0].body, null);
  assertEquals(queryOf(calls[0].url), {
    "actionParams[completionNote]": "Done: spoke to Jane",
    "actionParams[completionAction]": "finish_replied",
  });
});

Deno.test("task-mark-complete: with no options the query string is empty", async () => {
  const { ctx, calls } = mockCtx([{ body: single("task", 6) }]);
  await taskMarkComplete.execute({ id: 6 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
