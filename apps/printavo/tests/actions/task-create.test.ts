import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

Deno.test("task-create: sends the taskCreate operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { taskCreate: { id: "t1", name: "Order blanks" } } },
  }]);
  const out = await action.execute({
    name: "Order blanks",
    dueAt: "2026-11-01T09:00:00Z",
    taskableId: "3",
    taskableType: "QUOTE",
  }, ctx);
  assertEquals(out, { id: "t1", name: "Order blanks" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("taskCreate"), true);
  assertEquals(sent.variables, {
    input: {
      name: "Order blanks",
      dueAt: "2026-11-01T09:00:00Z",
      taskable: { id: "3", type: "QUOTE" },
    },
  });
});

Deno.test("task-create: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({
      name: "Order blanks",
      dueAt: "2026-11-01T09:00:00Z",
      taskableId: "3",
      taskableType: "QUOTE",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
