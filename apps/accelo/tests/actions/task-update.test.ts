import { assertEquals, assertRejects } from "@std/assert";
import { mockAcceloCtx } from "../_helpers.ts";
import action from "../../actions/task-update.ts";

Deno.test("task-update: PUTs only the changed fields to /tasks/{id}", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "8" } },
  }]);
  const out = await action.execute({ taskId: 8, ...{ "title": "T2", "remaining": 1800 } }, ctx);
  assertEquals(out, { id: "8" });
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/tasks/8");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "title": "T2",
    "remaining": "1800",
  });
});

Deno.test("task-update: refuses an update that sets nothing, without a request", async () => {
  const { ctx, calls } = mockAcceloCtx([]);
  await assertRejects(
    async () => await action.execute({ taskId: 8 }, ctx),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});
