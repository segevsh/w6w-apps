import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

test("new-contact seeds, emits, retries, and posts the documented creation sort", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { contacts: [{ id: "a" }] } }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  const run = async () => {
    const mock = mockCtx([{ body: { contacts: [{ id: "b" }, { id: "a" }] } }]);
    const result = await trigger.poll!({ ...input, state: seeded.nextState }, mock.ctx);
    assertEquals(mock.calls[0].url, "https://api.apollo.io/api/v1/contacts/search");
    assertEquals(JSON.parse(mock.calls[0].body!), {
      sort_by_field: "contact_created_at",
      sort_ascending: false,
      page: 1,
      per_page: 100,
    });
    return result;
  };
  assertEquals((await run()).events, [{ id: "b" }]);
  assertEquals(await run(), await run());
});
