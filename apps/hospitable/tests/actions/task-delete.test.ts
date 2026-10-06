import { assert, assertEquals } from "@std/assert";
import taskDelete from "../../actions/task-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-delete: DELETE /v2/tasks/{id}; an empty body still returns an object", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await taskDelete.execute({ id: "k1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/tasks/k1");
  assertEquals(out, { status: 204 });
  assertEquals(taskDelete.idempotent, true);
});

Deno.test("task actions: a forbidden answer is reported from the body", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "This action is unauthorized." } }]);
  let message = "";
  try {
    await taskDelete.execute({ id: "k1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403") && message.includes("unauthorized"), message);
});
