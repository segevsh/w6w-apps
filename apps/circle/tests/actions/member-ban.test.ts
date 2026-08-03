import { assert, assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import action from "../../actions/member-ban.ts";

Deno.test("member-ban: PUTs the ban_member sub-route with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ memberId: 12 }, ctx);
  assertEquals(calls[0].url, `${API}/community_members/12/ban_member`);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].body, null);
});

/**
 * Circle's own words: "Ban a community member and delete all associated records
 * including posts, comments, likes, and chat messages." Anyone reading the
 * action list must see that before they wire it up, so the description leads
 * with the deletion rather than the ban.
 */
Deno.test("member-ban: the description leads with the content deletion", () => {
  assert(/DESTRUCTIVE/.test(action.description!));
  assert(/delete/i.test(action.description!));
  assert(/no unban/i.test(action.description!));
});
