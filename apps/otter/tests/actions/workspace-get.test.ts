import { assertEquals } from "@std/assert";
import workspaceGet from "../../actions/workspace-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("workspace-get: fetches GET /workspace with no params", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      meta: { retrieved_at: "2026-09-29T00:00:00Z" },
      data: {
        id: 42,
        name: "workspace name",
        member_count: 50,
        handle: "otter.ai",
        type: "business",
      },
    },
  }]);

  const out = await workspaceGet.execute({}, ctx);

  assertEquals(calls[0].url, "https://api.otter.ai/v1/workspace");
  assertEquals(out.data.name, "workspace name");
  assertEquals(out.data.id, 42);
});

Deno.test("workspace-get: declares no params", () => {
  assertEquals(workspaceGet.params, []);
  assertEquals(workspaceGet.type, "read");
});
