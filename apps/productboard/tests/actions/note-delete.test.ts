import { assert, assertEquals } from "@std/assert";
import action from "../../actions/note-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-delete: DELETEs the note", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ noteId: "n-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/notes/n-1");
  assertEquals(out, { status: 204, deleted: true });
});

Deno.test("note-delete: logs a warning before destroying feedback", async () => {
  const { ctx, logs } = mockCtx([{ status: 204, body: undefined }]);
  await action.execute({ noteId: "n-1" }, ctx);
  assertEquals(logs[0].level, "warn");
});

Deno.test("note-delete: points at archiving as the reversible alternative", () => {
  assert(action.description!.toLowerCase().includes("archiv"), action.description!);
  assertEquals(action.idempotent, true);
});
