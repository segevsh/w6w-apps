import { assertEquals } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import update from "../../actions/note-update.ts";

const B = "https://acme.salesmate.io/apis";

Deno.test("note-update: PUTs to the note under the record", async () => {
  const { ctx, calls } = mockSalesmateCtx([{ body: { Status: "success" } }]);
  const out = await update.execute({ module: "contact", recordId: 9, noteId: 4, note: "x" }, ctx);
  assertEquals(out, { updated: true, noteId: 4 });
  assertEquals(calls[0].url, `${B}/contact/v4/modules/1/object/9/notes/4`);
  assertEquals(calls[0].method, "PUT");
});
