import { assert, assertEquals, assertRejects } from "@std/assert";
import noteGet from "../../actions/note-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const NOTE = { id: "not_1d3tmYTlCICgjy", title: "T", summary_text: "s", transcript: null };

Deno.test("note-get: reads one note without include by default", async () => {
  const { ctx, calls } = mockCtx([{ body: NOTE }]);
  const out = await noteGet.execute({ noteId: NOTE.id }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/notes/not_1d3tmYTlCICgjy");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.transcript_too_large, false);
  assertEquals(out.title, "T");
});

Deno.test("note-get: includeTranscript sends include=transcript", async () => {
  const { ctx, calls } = mockCtx([{ body: { ...NOTE, transcript: [] } }]);
  await noteGet.execute({ noteId: NOTE.id, includeTranscript: true }, ctx);
  assertEquals(queryOf(calls[0].url), { include: "transcript" });
});

Deno.test("note-get: 413 TRANSCRIPT_TOO_LARGE falls back to the note without a transcript", async () => {
  const { ctx, calls } = mockCtx([
    { status: 413, body: { code: "TRANSCRIPT_TOO_LARGE", message: "too large" } },
    { body: NOTE },
  ]);
  const out = await noteGet.execute({ noteId: NOTE.id, includeTranscript: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 2);
  assertEquals(queryOf(calls[0].url), { include: "transcript" });
  assertEquals(queryOf(calls[1].url), {});
  assertEquals(out.transcript_too_large, true);
  assertEquals(out.transcript, null);
});

Deno.test("note-get: 404 is an error naming the status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "not_found", message: "no note" } }]);
  const err = await assertRejects(async () => await noteGet.execute({ noteId: NOTE.id }, ctx));
  assert(String((err as Error).message).includes("404 (not_found)"));
});

Deno.test("note-get: a path-hostile id is encoded, not interpolated", async () => {
  const { ctx, calls } = mockCtx([{ body: NOTE }]);
  await noteGet.execute({ noteId: "../folders" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/notes/..%2Ffolders");
});
