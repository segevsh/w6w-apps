import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/folder-agent-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("folder-agent-list: calls GET /folders/{folderId}/agents", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, items: [{ id: "x1" }, { id: "x2" }] } }]);
  const out = await action.execute!(
    { "folderId": "folderId-1", "limit": 5, "page": 2 },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://www.taskade.com/api/v1/folders/folderId-1/agents?limit=5&page=2",
  );
  assertEquals(out.count, 2);
});

Deno.test("folder-agent-list: a failure envelope is an error", async () => {
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
    async () => await action.execute!({ "folderId": "folderId-1", "limit": 5, "page": 2 }, ctx),
    Error,
    "UNAUTHORIZED",
  );
});
