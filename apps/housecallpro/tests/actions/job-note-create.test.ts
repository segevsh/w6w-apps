import { assertEquals } from "@std/assert";
import jobNoteCreate from "../../actions/job-note-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-note-create: POSTs the note content", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "n1", content: "Parts ordered" } }]);
  const out = await jobNoteCreate.execute({ jobId: "j1", content: "Parts ordered" }, ctx) as {
    id: string;
  };

  assertEquals(pathOf(calls[0].url), "/jobs/j1/notes");
  assertEquals(bodyOf(calls[0]), { content: "Parts ordered" });
  assertEquals(out.id, "n1");
});

Deno.test("job-note-create: is not idempotent — notes accumulate", () => {
  assertEquals(jobNoteCreate.idempotent, false);
});
