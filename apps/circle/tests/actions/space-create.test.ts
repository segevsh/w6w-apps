import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { API, bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/space-create.ts";

test("space-create: POSTs /spaces with the three mandatory fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { space: { id: 7 } } }]);
  await action.execute({ name: "Feedback", slug: "feedback", spaceGroupId: 2 }, ctx);
  assertEquals(calls[0].url, `${API}/spaces`);
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { name: "Feedback", slug: "feedback", space_group_id: 2 });
});

/**
 * Circle's create schema lists `name`, `slug` and `space_group_id` as required.
 * Leaving `slug` optional and hoping Circle derives one would produce a 422 —
 * and a 422 costs the community a metered request.
 */
test("space-create: name, slug and space group are all required", () => {
  const required = action.params!.filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["name", "slug", "spaceGroupId"]);
});

test("space-create: a false privacy flag is sent — it means public, not absent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { name: "N", slug: "n", spaceGroupId: 1, isPrivate: false, isHiddenFromNonMembers: true },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).is_private, false);
  assertEquals(bodyOf(calls[0]).is_hidden_from_non_members, true);
});

test("space-create: offers the six space types Circle's enum declares", () => {
  const values = (action.params!.find((p) => p.key === "spaceType")!.options as Array<
    { value: string }
  >).map((o) => o.value);
  assertEquals(values.sort(), ["basic", "chat", "course", "event", "image", "members"]);
});

test("space-create: is not idempotent — a retry mints a second space", () => {
  assertEquals(action.idempotent, false);
});
