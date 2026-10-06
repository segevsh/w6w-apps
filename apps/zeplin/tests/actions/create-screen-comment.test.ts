import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-screen-comment.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-screen-comment: POSTs the trimmed content to the note's comments", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c1" } }]);
  const out = await action.execute(
    { projectId: "p1", screenId: "s1", noteId: "n1", content: " Looks good " },
    ctx,
  );
  assertEquals(out, { id: "c1" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.zeplin.dev/v1/projects/p1/screens/s1/notes/n1/comments");
  assertEquals(JSON.parse(calls[0].body!), { content: "Looks good" });
  assertEquals(action.idempotent, false);
});

Deno.test("create-screen-comment: empty content is refused; a 422 is thrown", async () => {
  await assertRejects(
    async () =>
      await action.execute(
        { projectId: "p1", screenId: "s1", noteId: "n1", content: " " },
        mockCtx().ctx,
      ),
    Error,
    "Comment is required",
  );
  const { ctx } = mockCtx([{ status: 422, body: { message: "archived" } }]);
  await assertRejects(
    async () =>
      await action.execute({ projectId: "p1", screenId: "s1", noteId: "n1", content: "x" }, ctx),
    Error,
    "archived",
  );
});
