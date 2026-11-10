import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-account.ts";

const input = { params: {}, subscriptionId: "s" };

test("new-account seeds, emits only the new account, retries identically", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { accounts: [{ id: "a" }] } }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: { accounts: [{ id: "b" }, { id: "a" }] } }]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(await run(), first);
});

test("new-account posts the documented creation sort, newest first", async () => {
  const mock = mockCtx([{ body: { accounts: [] } }]);
  await trigger.poll!({ ...input, state: {} }, mock.ctx);
  assertEquals(mock.calls.length, 1);
  assertEquals(mock.calls[0].method, "POST");
  assertEquals(mock.calls[0].url, "https://api.apollo.io/api/v1/accounts/search");
  assertEquals(JSON.parse(mock.calls[0].body!), {
    sort_by_field: "account_created_at",
    sort_ascending: false,
    page: 1,
    per_page: 100,
  });
});
