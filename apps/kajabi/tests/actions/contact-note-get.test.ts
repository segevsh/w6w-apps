import { assertEquals } from "@std/assert";
import contactNoteGet from "../../actions/contact-note-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-note-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await contactNoteGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/contact_notes/7");
});

Deno.test("contact-note-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await contactNoteGet.execute({ id: "7", fields: "body" }, ctx);
  assertEquals(queryOf(calls[0])["fields[contact_notes]"], "body");
});

Deno.test("contact-note-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await contactNoteGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/contact_notes/a%2Fb");
});

Deno.test("contact-note-get: forwards `include` for compound documents", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await contactNoteGet.execute({ id: "7", include: "tags" }, ctx);
  assertEquals(queryOf(calls[0])["include"], "tags");
});
