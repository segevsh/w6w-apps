import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSalesmateCtx } from "../_helpers.ts";
import getMany from "../../actions/note-get-many.ts";

const ok = (Data?: unknown) => ({ body: { Status: "success", Data } });
const B = "https://acme.salesmate.io/apis";

test("note-get-many: reads via the generic module notes path", async () => {
  const a = mockSalesmateCtx([ok([{ id: 1 }])]);
  assertEquals(await getMany.execute({ module: "contact", recordId: 9 }, a.ctx), {
    notes: [{ id: 1 }],
  });
  assertEquals(a.calls[0].url, `${B}/module/v4/modules/1/objects/9/notes`);
});
