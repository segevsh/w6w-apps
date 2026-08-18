import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/env-delete.ts";

Deno.test("env-delete: DELETEs the variable and reports it", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display: {} });
  const result = await action.execute!({ projectId: "my-app", envId: "env_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v9/projects/my-app/env/env_1");
  assertEquals(result, { id: "env_1", deleted: true });
});

Deno.test("env-delete: both ids are required before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ projectId: "my-app" }, ctx),
    Error,
    "`envId`",
  );
  assertEquals(calls.length, 0);
});
