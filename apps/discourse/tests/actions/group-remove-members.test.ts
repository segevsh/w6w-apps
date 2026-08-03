import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/group-remove-members.ts";

Deno.test("group-remove-members: DELETEs /groups/{id}/members.json — with a body", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { success: "OK" } }]);
  await action.execute({ groupId: 7, usernames: "alice" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/groups/7/members.json`);
  assertEquals(calls[0].method, "DELETE");
  // A DELETE that carries a payload is unusual; some clients drop it, which
  // would turn this into a request that removes nobody and still answers 200.
  assertEquals(JSON.parse(calls[0].body!), { usernames: "alice" });
});

Deno.test("group-remove-members: the same comma-separated string shape as the add route", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ groupId: 1, usernames: "alice, bob" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).usernames, "alice,bob");
});
