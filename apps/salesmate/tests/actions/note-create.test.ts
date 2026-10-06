import { assertEquals } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import create from "../../actions/note-create.ts";

const ok = (Data?: unknown) => ({ body: { Status: "success", Data } });
const B = "https://acme.salesmate.io/apis";

Deno.test("note-create: uses each module's own path and numeric module id", async () => {
  const expected = {
    contact: "contact/v4/modules/1",
    company: "company/v4/modules/5",
    deal: "deal/v4/modules/4",
    activity: "activity/v4/modules/2",
  } as const;
  for (const [module, prefix] of Object.entries(expected)) {
    const { ctx, calls } = mockSalesmateCtx([ok({ noteId: 203 })]);
    const out = await create.execute({
      module: module as "contact",
      recordId: 9,
      note: "<div>hi</div>",
    }, ctx);
    assertEquals(out, { noteId: 203 });
    assertEquals(calls[0].url, `${B}/${prefix}/object/9/notes`);
    assertEquals(calls[0].method, "POST");
    assertEquals(JSON.parse(calls[0].body!), {
      note: "<div>hi</div>",
      attachments: [],
      type: "Note",
    });
  }
});

Deno.test("note-create: parses a JSON-string attachments param", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({ noteId: 1 })]);
  await create.execute({ module: "deal", recordId: 1, note: "n", attachments: '[{"a":1}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).attachments, [{ a: 1 }]);
});
