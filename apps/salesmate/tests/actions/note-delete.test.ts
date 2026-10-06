import { assertEquals } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import del from "../../actions/note-delete.ts";

const B = "https://acme.salesmate.io/apis";

Deno.test("note-delete: DELETEs the note", async () => {
  const { ctx, calls } = mockSalesmateCtx([{ body: { Status: "success" } }]);
  assertEquals(await del.execute({ module: "company", recordId: 2, noteId: 4 }, ctx), {
    deleted: true,
    noteId: 4,
  });
  assertEquals(calls[0].url, `${B}/company/v4/modules/5/object/2/notes/4`);
  assertEquals(calls[0].method, "DELETE");
});
