import { assertEquals, assertRejects } from "@std/assert";
import workflowCreate from "../../actions/workflow-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workflow-create: POST /workflows with template and attributes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w9", step: "Create" } }]);
  const out = await workflowCreate.execute(
    { template: "t1", attributes: { counterpartyName: "Acme" }, useDefaultValues: true },
    ctx,
  ) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflows");
  assertEquals(queryOf(calls[0].url), { useDefaultValues: "true" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    template: "t1",
    attributes: { counterpartyName: "Acme" },
  });
  assertEquals(out.id, "w9");
});

Deno.test("workflow-create: attributes may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await workflowCreate.execute({ template: "t1", attributes: '{"counterpartyName":"A"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).attributes, { counterpartyName: "A" });
});

Deno.test("workflow-create: invalid attributes JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await workflowCreate.execute({ template: "t1", attributes: "{nope" }, ctx)
  );
  assertEquals(calls.length, 0);
});
