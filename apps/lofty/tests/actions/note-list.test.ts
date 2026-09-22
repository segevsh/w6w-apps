import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-list.ts";

Deno.test("note-list: filters by lead and passes includeSystemNote", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { notes: [{ id: 111, noteId: 400000012345, content: "Called" }] },
  }]);
  const result = await action.execute!({ leadId: 555, includeSystemNote: true }, ctx) as {
    notes: Array<{ noteId: number }>;
  };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/notes");
  assertEquals(url.searchParams.get("leadId"), "555");
  assertEquals(url.searchParams.get("includeSystemNote"), "true");
  assertEquals(result.notes[0].noteId, 400000012345);
});

/** The two ids are not interchangeable, and the hint has to say so. */
Deno.test("note-list: the note id is available alongside the timeline id", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { notes: [{ id: 111, noteId: 400000012345, content: "Called" }] },
  }]);
  const result = await action.execute!({ leadId: 1 }, ctx) as {
    notes: Array<{ id: number; noteId: number }>;
  };
  assertEquals(Object.keys(result.notes[0]).sort(), ["content", "id", "noteId"]);
  assertEquals(result.notes[0].id !== result.notes[0].noteId, true);
});
