import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-project.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("update-project: PATCHes only the set fields and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute({ projectId: "p1", name: "New", description: "" }, ctx), {
    updated: true,
  });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://api.zeplin.dev/v1/projects/p1");
  assertEquals(JSON.parse(calls[0].body!), { name: "New" });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("update-project: linking, unlinking (null) and the workflow status", async () => {
  const link = mockCtx([{ status: 204 }]);
  await action.execute(
    { projectId: "p1", linkedStyleguideId: "sg1", workflowStatusId: "w1" },
    link.ctx,
  );
  assertEquals(JSON.parse(link.calls[0].body!), {
    workflow_status_id: "w1",
    linked_styleguide_id: "sg1",
  });
  const unlink = mockCtx([{ status: 204 }]);
  await action.execute({ projectId: "p1", unlinkStyleguide: true }, unlink.ctx);
  assertEquals(JSON.parse(unlink.calls[0].body!), { linked_styleguide_id: null });
});

Deno.test("update-project: no fields, no project id and vendor errors are refused", async () => {
  await assertRejects(
    async () => await action.execute({ projectId: "p1" }, mockCtx().ctx),
    Error,
    "at least one",
  );
  await assertRejects(
    async () => await action.execute({ name: "x" }, mockCtx().ctx),
    Error,
    "Project ID is required",
  );
  const conflict = mockCtx([{ status: 409, body: { message: "conflict" } }]);
  await assertRejects(
    async () => await action.execute({ projectId: "p1", name: "x" }, conflict.ctx),
    Error,
    "409",
  );
  assertEquals(action.idempotent, true);
});
