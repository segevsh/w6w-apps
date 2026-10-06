import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/project-copy.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("project-copy: calls POST /projects/{projectId}/copy", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, item: { id: "x1" } } }]);
  const out = await action.execute!(
    { "projectId": "projectId-1", "folderId": "folderId-1" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://www.taskade.com/api/v1/projects/projectId-1/copy");
  assertEquals(out.item, { id: "x1" });
  assert(calls[0].body !== null);
  assertEquals(typeof JSON.parse(calls[0].body!), "object");
});

Deno.test("project-copy: a failure envelope is an error", async () => {
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
    async () =>
      await action.execute!({ "projectId": "projectId-1", "folderId": "folderId-1" }, ctx),
    Error,
    "UNAUTHORIZED",
  );
});
