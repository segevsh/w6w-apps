import { assert, assertEquals } from "@std/assert";
import { API, bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/tagged-member-add.ts";

Deno.test("tagged-member-add: POSTs /tagged_members with tag id and member email", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await action.execute({ memberTagId: 5, userEmail: "a@b.c" }, ctx);
  assertEquals(calls[0].url, `${API}/tagged_members`);
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { member_tag_id: 5, user_email: "a@b.c" });
});

/**
 * The distinction this action exists for: it ADDS a tag, where
 * `member-update`'s `member_tag_ids` REPLACES the member's whole tag list and
 * would silently strip segmentation another workflow depends on.
 */
Deno.test("tagged-member-add: the description names the additive/replace distinction", () => {
  assert(/additive/i.test(action.description!));
  assert(/member-update/.test(action.description!));
  assertEquals(action.idempotent, true);
});
