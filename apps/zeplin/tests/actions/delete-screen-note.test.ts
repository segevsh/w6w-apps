import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/delete-screen-note.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("delete-screen-note: DELETEs the note path and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute({ projectId: "p1", screenId: "s1", noteId: "n/1" }, ctx), {
    deleted: true,
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.zeplin.dev/v1/projects/p1/screens/s1/notes/n%2F1");
  assertEquals(calls[0].body, null);
});

Deno.test("delete-screen-note: a missing note id is refused; a 404 is thrown", async () => {
  await assertRejects(
    async () => await action.execute({ projectId: "p1", screenId: "s1" }, mockCtx().ctx),
    Error,
    "Note ID is required",
  );
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  await assertRejects(
    async () => await action.execute({ projectId: "p1", screenId: "s1", noteId: "n1" }, ctx),
    Error,
    "Not Found",
  );
});
