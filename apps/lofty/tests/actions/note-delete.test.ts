import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-delete.ts";

Deno.test("note-delete: deletes by note id and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute!({ noteId: 400000012345 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/notes/400000012345");
  assertEquals(result, { noteId: 400000012345, status: 200 });
});
