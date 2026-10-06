import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-get: GET /v1/tasks/{taskId}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 8, name: "Call" } }]);
  const result = await taskGet.execute({ taskId: "8" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/8/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, { id: 8, name: "Call" });
});

Deno.test("task-get: declares type read", () => {
  assertEquals(taskGet.type, "read");
});

Deno.test("task-get: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await taskGet.execute({ taskId: "8" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
