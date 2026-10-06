import { assertEquals } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import get from "../../actions/note-get.ts";

const ok = (Data?: unknown) => ({ body: { Status: "success", Data } });
const B = "https://acme.salesmate.io/apis";

Deno.test("note-get: reads one note via the generic module notes path", async () => {
  const b = mockSalesmateCtx([ok({ id: 4 })]);
  assertEquals(await get.execute({ module: "deal", recordId: 9, noteId: 4 }, b.ctx), {
    note: { id: 4 },
  });
  assertEquals(b.calls[0].url, `${B}/module/v4/modules/4/objects/9/notes/4`);
});
