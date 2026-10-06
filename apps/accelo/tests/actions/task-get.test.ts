import { assertEquals, assertRejects } from "@std/assert";
import { mockAcceloCtx } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

Deno.test("task-get: GETs /tasks/{id} and returns the unwrapped object", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "7" } },
  }]);
  assertEquals(await action.execute({ taskId: 7 }, ctx), { id: "7" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/tasks/7");
});

Deno.test("task-get: passes _fields through", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "7" } },
  }]);
  await action.execute({ taskId: 7, fields: "_ALL" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/tasks/7?_fields=_ALL");
});

Deno.test("task-get: rejects a missing id before any request", async () => {
  const { ctx, calls } = mockAcceloCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "positive numeric id");
  assertEquals(calls.length, 0);
});
