import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import listNotes from "../../actions/list-notes.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("list-notes: GET /notes filtered by contact", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("notes", [{ note: { id: "n1" } }]) }]);
  const out = await listNotes.execute(
    { contactId: "c1", sortBy: "date", order: "asc" },
    ctx,
  ) as Record<
    string,
    unknown
  >;
  assertEquals(pathOf(calls[0].url), "/api/v3/notes");
  assertEquals(queryOf(calls[0].url), { contact_id: "c1", sort_by: "date", order: "asc" });
  assertEquals(out.items, [{ note: { id: "n1" } }]);
});
