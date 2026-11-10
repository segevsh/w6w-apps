import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact-group.ts";

test("new-contact-group seeds, emits, retries, and requests the bounded groups page", async () => {
  const seed = mockCtx([{ body: { contactGroups: [{ resourceName: "contactGroups/a" }] } }]);
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://people.googleapis.com/v1/contactGroups?pageSize=1000");
});
