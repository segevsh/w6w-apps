import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import noteList from "../../actions/note-list.ts";
import { listEnvelope, mockCtx, queryOf } from "../_helpers.ts";

test("note-list: maps resourceType/q filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await noteList.execute({ resourceType: "deal", q: "important" }, ctx);
  assertEquals(queryOf(calls[0].url), { resource_type: "deal", q: "important" });
});
