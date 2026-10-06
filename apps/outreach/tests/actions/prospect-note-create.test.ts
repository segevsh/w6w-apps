import { assertEquals } from "@std/assert";
import prospectNoteCreate from "../../actions/prospect-note-create.ts";
import { bodyOf, mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("prospect-note-create: POSTs a prospectNote related to the prospect", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: single("prospectNote", 4) }]);
  await prospectNoteCreate.execute({
    message: "Met at the expo",
    noteType: "meeting",
    pinned: false,
    prospectId: 12,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/prospectNotes");
  assertEquals(bodyOf(calls[0]), {
    data: {
      type: "prospectNote",
      attributes: { message: "Met at the expo", noteType: "meeting", pinned: false },
      relationships: { prospect: { data: { type: "prospect", id: 12 } } },
    },
  });
});

Deno.test("prospect-note-create: message and prospectId are required", () => {
  const required = prospectNoteCreate.params!.filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["message", "prospectId"]);
});
