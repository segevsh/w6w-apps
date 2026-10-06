import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/project-create-from-template.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("project-create-from-template: calls POST /projects/from-template", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, item: { id: "x1" } } }]);
  const out = await action.execute!(
    { "folderId": "folderId-1", "templateId": "templateId-1" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://www.taskade.com/api/v1/projects/from-template");
  assertEquals(out.item, { id: "x1" });
  assert(calls[0].body !== null);
  assertEquals(typeof JSON.parse(calls[0].body!), "object");
});

Deno.test("project-create-from-template: a failure envelope is an error", async () => {
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
      await action.execute!({ "folderId": "folderId-1", "templateId": "templateId-1" }, ctx),
    Error,
    "UNAUTHORIZED",
  );
});
