import { assert, assertEquals } from "@std/assert";
import labelsList from "../../actions/labels-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("labels-list: the label type is required and travels in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Urgent" }] }]);
  const result = await labelsList.execute({ labelTypeId: 4 }, ctx) as { labels: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/labels");
  assertEquals(queryOf(calls[0].url), { label_type_id: "4" });
  assertEquals(result.labels.length, 1);
});

/**
 * One route, two response types: master labels for the type, or the labels
 * attached to an entity.
 */
Deno.test("labels-list: an entity id switches the response to that entity's labels", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 9, name: "Urgent", entityId: 101 }] }]);
  const result = await labelsList.execute({ labelTypeId: 4, entityId: 101 }, ctx) as {
    labels: Array<Record<string, unknown>>;
  };

  assertEquals(queryOf(calls[0].url), { label_type_id: "4", entity_id: "101" });
  assertEquals(result.labels[0].entityId, 101);
});

Deno.test("labels-list: label_type_id is required, matching the spec", () => {
  const param = (labelsList.params ?? []).find((p) => p.key === "labelTypeId");
  assertEquals(param?.required, true);
  assert(labelsList.params!.length === 2);
});
