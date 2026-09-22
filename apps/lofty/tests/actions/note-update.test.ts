import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-update.ts";

Deno.test("note-update: writes all three documented fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute!({
    noteId: 400000012345,
    content: "Updated",
    leadId: 1,
    isPin: true,
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/notes/400000012345");
  assertEquals(JSON.parse(calls[0].body!), { content: "Updated", leadId: 1, isPin: true });
  assertEquals(result, { noteId: 400000012345, status: 200 });
});

Deno.test("note-update: the schema's three body fields are all required", () => {
  for (const key of ["content", "leadId", "isPin"]) {
    assertEquals(action.params!.find((p) => p.key === key)!.required, true, key);
  }
});
