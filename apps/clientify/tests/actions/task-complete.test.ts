import { assertEquals } from "@std/assert";
import taskComplete from "../../actions/task-complete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-complete: POST /v1/tasks/{taskId}/complete/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "ok" } }]);
  const result = await taskComplete.execute({ taskId: "8" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/8/complete/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, { status: "ok" });
});

Deno.test("task-complete: declares type perform", () => {
  assertEquals(taskComplete.type, "perform");
  assertEquals(taskComplete.idempotent, true);
});

Deno.test("task-complete: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await taskComplete.execute({ taskId: "8" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
