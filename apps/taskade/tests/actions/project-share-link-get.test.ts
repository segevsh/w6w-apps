import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/project-share-link-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("project-share-link-get: calls GET /projects/{projectId}/shareLink", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, item: { id: "x1" } } }]);
  const out = await action.execute!({ "projectId": "projectId-1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://www.taskade.com/api/v1/projects/projectId-1/shareLink");
  assertEquals(out.item, { id: "x1" });
});

Deno.test("project-share-link-get: a failure envelope is an error", async () => {
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
    async () => await action.execute!({ "projectId": "projectId-1" }, ctx),
    Error,
    "UNAUTHORIZED",
  );
});
