import { assertEquals } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import pin from "../../actions/note-pin.ts";

const ok = (Data?: unknown) => ({ body: { Status: "success", Data } });
const B = "https://acme.salesmate.io/apis";

Deno.test("note-pin: PATCHes pin-it with an empty object body", async () => {
  const a = mockSalesmateCtx([ok({})]);
  assertEquals(await pin.execute({ module: "activity", recordId: 2, noteId: 4 }, a.ctx), {
    pinned: true,
    noteId: 4,
  });
  assertEquals(a.calls[0].url, `${B}/activity/v4/modules/2/object/2/notes/4/pin-it`);
  assertEquals(a.calls[0].method, "PATCH");
  assertEquals(a.calls[0].body, "{}");
});
