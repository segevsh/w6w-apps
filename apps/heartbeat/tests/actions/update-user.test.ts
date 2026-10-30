import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import updateUser from "../../actions/update-user.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("update-user: POST /users, only provided fields sent", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await updateUser.execute({ email: "a@b.com", bio: "New bio" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v0/users");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com", bio: "New bio" });
});

test("update-user: completedLessonID becomes a one-item completedLessons array", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await updateUser.execute({ email: "a@b.com", completedLessonID: "l1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.completedLessons, [{ lessonID: "l1" }]);
});

test("update-user: is idempotent — a retry overwrites to the same end state", () => {
  assertEquals(updateUser.idempotent, true);
});
