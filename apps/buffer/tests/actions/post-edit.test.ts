import { assert, assertEquals, assertRejects } from "@std/assert";
import { data, gqlOf, mockCtx, param } from "../_helpers.ts";
import postEdit from "../../actions/post-edit.ts";

const ok = () => data({ editPost: { __typename: "PostActionSuccess", post: { id: "p1" } } });

function input(calls: { body: string | null }[]): Record<string, unknown> {
  return (gqlOf(calls[0] as never).variables as { input: Record<string, unknown> }).input;
}

Deno.test("post-edit: an id alone sends only the id — nothing else is touched", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postEdit.execute({ postId: "p1" }, ctx);
  assertEquals(input(calls), { id: "p1" });
});

Deno.test("post-edit: mode is optional here, unlike on create — blank means no reschedule", async () => {
  assertEquals(param(postEdit, "mode").required, undefined);
  const { ctx, calls } = mockCtx([ok()]);
  await postEdit.execute({ postId: "p1", text: "new", mode: "" }, ctx);
  assertEquals("mode" in input(calls), false);
});

Deno.test("post-edit: omitted assets preserve the existing list", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postEdit.execute({ postId: "p1", text: "new" }, ctx);
  assertEquals("assets" in input(calls), false);
});

Deno.test("post-edit: an explicit empty array clears them — Buffer's documented distinction", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postEdit.execute({ postId: "p1", assets: [] }, ctx);
  assertEquals(input(calls).assets, []);
});

Deno.test("post-edit: the raw assets hint spells out preserve-vs-clear", () => {
  const hint = String(param(postEdit, "assets").hint);
  assert(/Omit to keep/.test(hint), hint);
  assert(/pass `\[\]` to clear/.test(hint), hint);
});

Deno.test("post-edit: rescheduling sends both mode and dueAt", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postEdit.execute({
    postId: "p1",
    mode: "customScheduled",
    dueAt: "2026-04-01T09:00:00.000Z",
  }, ctx);
  assertEquals(input(calls).mode, "customScheduled");
  assertEquals(input(calls).dueAt, "2026-04-01T09:00:00.000Z");
});

Deno.test("post-edit: approvalChange is not exposed — its enum members are unpublished", () => {
  const keys = (postEdit.params ?? []).map((p) => p.key);
  assert(!keys.includes("approvalChange"), "would be guessed enum members");
});

Deno.test("post-edit: a NotFoundError arrives 200 and throws", async () => {
  const { ctx } = mockCtx([
    data({ editPost: { __typename: "NotFoundError", message: "Post not found" } }),
  ]);
  const err = await assertRejects(
    () => Promise.resolve(postEdit.execute({ postId: "nope" }, ctx)),
    Error,
  );
  assert(/Post not found/.test(err.message), err.message);
});

Deno.test("post-edit: is idempotent — re-sending converges rather than duplicating", () => {
  assertEquals(postEdit.idempotent, true);
});
