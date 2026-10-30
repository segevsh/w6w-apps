import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import sequenceList from "../../actions/sequence-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("sequence-list: calls GET /1/objects with objectID=5 (the generic endpoint)", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1" }]) }]);
  const out = await sequenceList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/1/objects");
  assertEquals(queryOf(calls[0].url).objectID, "5");
  assertEquals(out.items.length, 1);
});
