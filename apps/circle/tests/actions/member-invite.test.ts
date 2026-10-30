import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { API, bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/member-invite.ts";

test("member-invite: POSTs /community_members with just the address", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 9 } }]);
  await action.execute({ email: "new@example.com" }, ctx);
  assertEquals(calls[0].url, `${API}/community_members`);
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { email: "new@example.com" });
});

test("member-invite: spaces, groups and tags go in ONE call, as integer arrays", async () => {
  // Circle's own advice: one call with a list beats one call per space, and
  // every request is metered.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { email: "a@b.c", spaceIds: "1, 2", spaceGroupIds: "3", memberTagIds: "4,5" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]), {
    email: "a@b.c",
    space_ids: [1, 2],
    space_group_ids: [3],
    member_tag_ids: [4, 5],
  });
});

test("member-invite: skip_invitation is sent only when switched on", async () => {
  // `false` is Circle's own default; sending it says nothing.
  const off = mockCtx([{ body: {} }]);
  await action.execute({ email: "a@b.c", skipInvitation: false }, off.ctx);
  assertEquals(bodyOf(off.calls[0]).skip_invitation, undefined);

  const on = mockCtx([{ body: {} }]);
  await action.execute({ email: "a@b.c", skipInvitation: true }, on.ctx);
  assertEquals(bodyOf(on.calls[0]).skip_invitation, true);
});

test("member-invite: profile fields accept an object or a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ email: "a@b.c", profileFields: { company: "Acme" } }, ctx);
  assertEquals(bodyOf(calls[0]).community_member_profile_fields, { company: "Acme" });
  await action.execute({ email: "a@b.c", profileFields: '{"company":"Acme"}' }, ctx);
  assertEquals(bodyOf(calls[1]).community_member_profile_fields, { company: "Acme" });
});

test("member-invite: is not idempotent — a repeat is a duplicate-create", () => {
  assertEquals(action.idempotent, false);
});

test("member-invite: does not expose password", () => {
  // Setting someone else's password is not an integration action, and the value
  // would travel as ordinary input rather than as a secret.
  assertEquals(action.params!.some((p) => /password/i.test(p.key)), false);
});
