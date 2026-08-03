import { assert, assertEquals } from "@std/assert";
import { API, bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/member-update.ts";

Deno.test("member-update: PUTs /community_members/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5 } }]);
  await action.execute({ memberId: 5, name: "Alice B" }, ctx);
  assertEquals(calls[0].url, `${API}/community_members/5`);
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { name: "Alice B" });
});

Deno.test("member-update: an untouched association is omitted, never sent as []", async () => {
  // `space_ids` REPLACES the member's spaces. Sending `[]` for a field the user
  // left blank would silently remove them from every space they are in.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ memberId: 5, spaceIds: "", memberTagIds: "  ,  " }, ctx);
  assertEquals(bodyOf(calls[0]), {});
});

Deno.test("member-update: a supplied association list is sent as integers", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ memberId: 5, spaceIds: "1,2", memberTagIds: "9" }, ctx);
  assertEquals(bodyOf(calls[0]), { space_ids: [1, 2], member_tag_ids: [9] });
});

Deno.test("member-update: exposes no email param — an address cannot be changed here", () => {
  // The v2 update schema has no `email` property; only create does.
  assertEquals(action.params!.some((p) => p.key === "email"), false);
});

Deno.test("member-update: the replace semantics are stated on every association hint", () => {
  for (const key of ["spaceIds", "spaceGroupIds", "memberTagIds"]) {
    const p = action.params!.find((p) => p.key === key)!;
    assert(/REPLACE/i.test(p.hint ?? ""), `${key}: hint does not warn about replacement`);
  }
});

Deno.test("member-update: is idempotent — it sets what it is given", () => {
  assertEquals(action.idempotent, true);
});
