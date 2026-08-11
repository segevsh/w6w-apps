import { assertEquals } from "@std/assert";
import action from "../../actions/entity-field-value-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("entity-field-value-list: GETs the field's values sub-path", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "v-1", name: "In Progress" }]) }]);
  const out = await action.execute({ fieldId: "status" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/entities/fields/status/values");
  assertEquals(out.items.length, 1);
});

Deno.test("entity-field-value-list: the assigned types are repeated keys", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({
    fieldId: "9fe06369-0801-4a31-a900-0051aa78e01c",
    assignedEntityTypes: ["feature", "initiative"],
    pageCursor: "c",
  }, ctx);
  assertEquals(queryAll(calls[0].url, "assignedEntityType[]"), ["feature", "initiative"]);
  assertEquals(queryOf(calls[0].url).pageCursor, "c");
});

Deno.test("entity-field-value-list: takes a FIELD id, which is required", () => {
  const p = action.params?.find((p) => p.key === "fieldId");
  assertEquals(p?.required, true);
});
