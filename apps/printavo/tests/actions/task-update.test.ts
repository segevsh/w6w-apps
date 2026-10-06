import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-update.ts";

Deno.test("task-update: sends the taskUpdate operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { taskUpdate: { id: "t1", completed: true } } },
  }]);
  const out = await action.execute({ id: "t1", completed: true }, ctx);
  assertEquals(out, { id: "t1", completed: true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("taskUpdate"), true);
  assertEquals(sent.variables, { id: "t1", input: { completed: true } });
});

Deno.test("task-update: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ id: "t1", completed: true }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
