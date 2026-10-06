import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/workspace-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("workspace-list: calls GET /workspaces", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, items: [{ id: "x1" }, { id: "x2" }] } }]);
  const out = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://www.taskade.com/api/v1/workspaces");
  assertEquals(out.count, 2);
});

Deno.test("workspace-list: a failure envelope is an error", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: {
        ok: false,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        statusMessage: "Unauthorized",
      },
    },
  ]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "UNAUTHORIZED",
  );
});
