import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import projectCommentCreate from "../../actions/project-comment-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("project-comment-create: nests the content under comment", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1" } }]);
  await projectCommentCreate.execute({ projectId: "1", content: "On site now" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/comments");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { comment: { content: "On site now" } });
});

test("project-comment-create: credits another user when asked", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await projectCommentCreate.execute(
    { projectId: "1", content: "hi", actAs: "crew@example.com" },
    ctx,
  );
  assertEquals(calls[0].headers["x-companycam-user"], "crew@example.com");
  assertEquals(projectCommentCreate.idempotent, false);
});
