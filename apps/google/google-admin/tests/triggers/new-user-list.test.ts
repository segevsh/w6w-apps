import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-user-list.ts";

test("new-user-list seeds, emits, retries, and requests creation-time descending", async () => {
  const seed = mockCtx([{ body: { users: [{ id: "a" }] } }]);
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://admin.googleapis.com/admin/directory/v1/users?customer=my_customer&maxResults=100&orderBy=creationTime&sortOrder=DESCENDING",
  );
});
