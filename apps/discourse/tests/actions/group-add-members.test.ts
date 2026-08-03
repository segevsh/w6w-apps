import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/group-add-members.ts";

Deno.test("group-add-members: PUTs /groups/{id}/members.json", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { success: "OK" } }]);
  const out = await action.execute({ groupId: 7, usernames: "alice,bob" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/groups/7/members.json`);
  // PUT adds; it does not replace the membership set. Hence "Add Members".
  assertEquals(calls[0].method, "PUT");
  assertEquals(out, { success: "OK" });
});

Deno.test("group-add-members: usernames go on the wire as a comma-separated STRING", async () => {
  // The schema types this `string` with the example `username1,username2`.
  // Sending an array is a silent no-op on some Discourse versions.
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ groupId: 1, usernames: " alice , bob ,, carol " }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.usernames, "alice,bob,carol");
  assertEquals(typeof body.usernames, "string");
});
