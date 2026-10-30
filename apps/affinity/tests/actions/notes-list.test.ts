import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import notesList from "../../actions/notes-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("notes-list: calls GET /notes with the documented filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 22984, content: "..." }] }]);
  await notesList.execute({ organizationId: 64779194 }, ctx);
  assertEquals(pathOf(calls[0].url), "/notes");
  assertEquals(queryOf(calls[0].url).organization_id, "64779194");
});
