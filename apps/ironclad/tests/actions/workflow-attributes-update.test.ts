import { assertEquals, assertRejects } from "@std/assert";
import workflowAttributesUpdate from "../../actions/workflow-attributes-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workflow-attributes-update: PATCH /workflows/{id}/attributes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1" } }]);
  const updates = [{ action: "set", path: "contractValue", value: "100" }];
  await workflowAttributesUpdate.execute({ workflowId: "w1", updates, comment: "fix" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflows/w1/attributes");
  assertEquals(JSON.parse(calls[0].body!), { updates, comment: "fix" });
});

Deno.test("workflow-attributes-update: an empty update list is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await workflowAttributesUpdate.execute({ workflowId: "w1", updates: [] }, ctx)
  );
  assertEquals(calls.length, 0);
});
