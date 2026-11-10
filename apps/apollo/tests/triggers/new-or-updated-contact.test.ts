import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";

test("new-or-updated-contact seeds, emits an edit, retries, and posts updated sort", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { contacts: [{ id: "a", updated_at: "1" }] } }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  const run = async () => {
    const mock = mockCtx([{
      body: { contacts: [{ id: "a", updated_at: "2" }, { id: "a", updated_at: "1" }] },
    }]);
    const result = await trigger.poll!({ ...input, state: seeded.nextState }, mock.ctx);
    assertEquals(mock.calls[0].url, "https://api.apollo.io/api/v1/contacts/search");
    assertEquals(JSON.parse(mock.calls[0].body!), {
      sort_by_field: "contact_updated_at",
      sort_ascending: false,
      page: 1,
      per_page: 100,
    });
    return result;
  };
  assertEquals((await run()).events, [{ id: "a", updated_at: "2" }]);
  assertEquals(await run(), await run());
});
