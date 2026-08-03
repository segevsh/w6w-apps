import { assert, assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/list-relationships.ts";

Deno.test("list-relationships: GETs the PLURAL relationships route", async () => {
  // Write routes use the singular /relationship; only the list is plural.
  const { ctx, calls } = mockQbCtx([{ body: { relationships: [] } }]);
  await action.execute({ tableId: "bck1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/tables/bck1/relationships");
});

Deno.test("list-relationships: forwards skip, omits it when unset", async () => {
  const paged = mockQbCtx([{ body: {} }]);
  await action.execute({ tableId: "bck1", skip: 10 }, paged.ctx);
  assertEquals(new URL(paged.calls[0].url).searchParams.get("skip"), "10");

  const first = mockQbCtx([{ body: {} }]);
  await action.execute({ tableId: "bck1" }, first.ctx);
  assert(!new URL(first.calls[0].url).searchParams.has("skip"));
});

Deno.test("list-relationships: surfaces foreign key plus derived lookup/summary fields", async () => {
  const { ctx } = mockQbCtx([{
    body: {
      relationships: [{
        id: 6,
        parentTableId: "bckparent",
        childTableId: "bck1",
        isCrossApp: false,
        foreignKeyField: { id: 6, label: "Related Customer", type: "numeric" },
        lookupFields: [{ id: 10, label: "Customer Name", type: "text" }],
        summaryFields: [{ id: 11, label: "Total Orders", type: "numeric" }],
      }],
      metadata: { skip: 0, numRelationships: 1, totalRelationships: 1 },
    },
  }]);
  const out = await action.execute({ tableId: "bck1" }, ctx);

  assertEquals(out.relationships![0].foreignKeyField!.id, 6);
  assertEquals(out.relationships![0].lookupFields![0].label, "Customer Name");
  assertEquals(out.metadata!.totalRelationships, 1);
});
