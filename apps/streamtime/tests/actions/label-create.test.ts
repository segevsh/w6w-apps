import { assertEquals } from "@std/assert";
import labelCreate from "../../actions/label-create.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("label-create: POSTs the label and its entity", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 555, name: "Urgent" } }]);
  await labelCreate.execute({
    id: 555,
    name: "Urgent",
    entityId: 1001,
    labelType: '{"id":1,"name":"Job"}',
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/labels");
  assertEquals(bodyOf(calls[0]), {
    id: 555,
    name: "Urgent",
    entityId: 1001,
    labelType: { id: 1, name: "Job" },
  });
});

/** `create_master_label` is a query parameter on this route, and defaults to false. */
Deno.test("label-create: creating a master label is opt-in", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await labelCreate.execute({ id: 1, name: "Urgent", entityId: 2 }, ctx);
  assertEquals(queryOf(calls[0].url), {});

  await labelCreate.execute({ id: 1, name: "Urgent", entityId: 2, createMasterLabel: true }, ctx);
  assertEquals(queryOf(calls[1].url), { create_master_label: "true" });
});
