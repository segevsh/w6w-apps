import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import spaceClosingNoteList from "../../actions/space-closing-note-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("space-closing-note-list: GETs /space/closing_notes", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ category: "Resolved", description: "Issue fixed" }]) },
  ]);
  const out = await spaceClosingNoteList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/space/closing_notes");
  assertEquals(out.items.length, 1);
});
