import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/note-update.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-update: PATCHes the note", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "n-1" }) }]);
  await action.execute({ noteId: "n-1", fields: { processed: true } }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/notes/n-1");
  assertEquals(bodyOf(calls[0]), { data: { fields: { processed: true } } });
});

Deno.test("note-update: the patch form is forwarded verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  const patch = [{ op: "addItems", path: "tags", value: [{ name: "q2" }] }];
  await action.execute({ noteId: "n-1", patch }, ctx);
  assertEquals(bodyOf(calls[0]), { data: { patch } });
});

Deno.test("note-update: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ noteId: "n-1" }, ctx)),
    Error,
    "an empty update does nothing",
  );
  assertEquals(calls.length, 0);
});

Deno.test("note-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
