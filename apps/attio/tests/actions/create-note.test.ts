import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import createNote from "../../actions/create-note.ts";

Deno.test("create-note: POSTs the five required fields with plaintext as the default format", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: { note_id: "n1" } } } }]);
  await createNote.execute({
    parentObject: "people",
    parentRecordId: "r1",
    title: "Initial Prospecting Call Summary",
    content: "They asked about pricing.",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.attio.com/v2/notes");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      parent_object: "people",
      parent_record_id: "r1",
      title: "Initial Prospecting Call Summary",
      // `format` is required with no server-side default; plaintext is the
      // conservative choice, since markdown would reinterpret a leading `#`.
      format: "plaintext",
      content: "They asked about pricing.",
    },
  });
});

Deno.test("create-note: passes markdown through and backdates when asked", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }]);
  await createNote.execute({
    parentObject: "companies",
    parentRecordId: "r1",
    title: "Recap",
    content: "# Heading\n\n- one",
    format: "markdown",
    createdAt: "2023-01-01T15:00:00.000000000Z",
    meetingId: "m1",
  }, ctx);
  const body = JSON.parse(calls[0].body!).data;
  assertEquals(body.format, "markdown");
  assertEquals(body.created_at, "2023-01-01T15:00:00.000000000Z");
  assertEquals(body.meeting_id, "m1");
});

Deno.test("create-note: the format enum is exactly the two Attio documents", () => {
  assertEquals(optionValues(createNote, "format"), ["plaintext", "markdown"]);
  assertEquals(param(createNote, "format").default, "plaintext");
});

/** The markdown subset is small and the exclusions are the surprising part. */
Deno.test("create-note: enumerates the markdown subset and its exclusions", () => {
  const hint = param(createNote, "format").hint!;
  assert(hint.includes("==highlight=="), hint);
  assert(/[Ii]mages, tables and code blocks are not supported/.test(hint), hint);
  assert(/headings `#` to `###` only/i.test(hint), hint);
});

Deno.test("create-note: says the title is never formatted", () => {
  assert(/[Pp]laintext only/.test(param(createNote, "title").hint!));
});

Deno.test("create-note: says backdating is bounded by rejection, not clamping", () => {
  assert(/rejected\*\*, not clamped/.test(param(createNote, "createdAt").hint!));
});
