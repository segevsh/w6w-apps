import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-list: GET /v1/tasks/", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { count: 1, next: null, previous: null, results: [{ id: 8, name: "Call" }] },
  }]);
  const result = await taskList.execute({
    statusId: "5",
    filters: { "due_date[lt]": "2026-12-01" },
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), { "due_date[lt]": "2026-12-01", status_id: "5" });
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    count: 1,
    next: null,
    previous: null,
    results: [{ id: 8, name: "Call" }],
  });
});

Deno.test("task-list: declares type search", () => {
  assertEquals(taskList.type, "search");
});

Deno.test("task-list: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await taskList.execute({ statusId: "5", filters: { "due_date[lt]": "2026-12-01" } }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
