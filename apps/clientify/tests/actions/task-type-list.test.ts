import { assertEquals } from "@std/assert";
import taskTypeList from "../../actions/task-type-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-type-list: GET /v1/tasks/types", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      count: 1,
      next: null,
      previous: null,
      results: [{ url: "https://api.clientify.net/v1/tasks/types/65/", name: "Call" }],
    },
  }]);
  const result = await taskTypeList.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/types");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    count: 1,
    next: null,
    previous: null,
    results: [{ url: "https://api.clientify.net/v1/tasks/types/65/", name: "Call" }],
  });
});

Deno.test("task-type-list: declares type read", () => {
  assertEquals(taskTypeList.type, "read");
});

Deno.test("task-type-list: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await taskTypeList.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
