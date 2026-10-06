import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("task-get: GET /v2/tasks/{id} with include", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "k1" }, meta: {} } }]);
  await taskGet.execute({ id: "k1", include: "checklist,photos" }, ctx);
  assertEquals(
    calls[0].url,
    "https://public.api.hospitable.com/v2/tasks/k1?include=checklist%2Cphotos",
  );
});
