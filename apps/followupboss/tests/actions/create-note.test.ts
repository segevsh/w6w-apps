import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import createNote from "../../actions/create-note.ts";

Deno.test("create-note: POSTs /notes with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 32 } }]);
  await createNote.execute({
    personId: 12235,
    subject: "Some note subject",
    body: "This is the content",
    isHtml: false,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/notes");
  assertEquals(JSON.parse(calls[0].body!), {
    personId: 12235,
    subject: "Some note subject",
    body: "This is the content",
    isHtml: false,
  });
});

Deno.test("create-note: requires only personId and warns about the tight rate limit", () => {
  assertEquals(createNote.idempotent, false);
  assertEquals((createNote.params ?? []).filter((p) => p.required).map((p) => p.key), ["personId"]);
  assert(/10 requests/.test(createNote.description!), createNote.description);
});
