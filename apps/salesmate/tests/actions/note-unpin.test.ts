import { assertEquals } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import unpin from "../../actions/note-unpin.ts";

const ok = (Data?: unknown) => ({ body: { Status: "success", Data } });
const B = "https://acme.salesmate.io/apis";

Deno.test("note-unpin: PATCHes unpin-it", async () => {
  const b = mockSalesmateCtx([ok({})]);
  assertEquals(await unpin.execute({ module: "deal", recordId: 2, noteId: 4 }, b.ctx), {
    pinned: false,
    noteId: 4,
  });
  assertEquals(b.calls[0].url, `${B}/deal/v4/modules/4/object/2/notes/4/unpin-it`);
  assertEquals(b.calls[0].method, "PATCH");
});
