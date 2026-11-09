import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-lead.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const connection = { display: { accountDomain: "acme.kommo.com" } };

test("new-lead seeds, emits unseen leads idempotently, and requests newest-first leads", async () => {
  const seedCtx = mockCtx([{ body: { _embedded: { leads: [{ id: "old" }] } } }], connection);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seedCtx.calls[0].url,
    "https://acme.kommo.com/api/v4/leads?order%5Bcreated_at%5D=desc&page=1&limit=100",
  );
  const response = { body: { _embedded: { leads: [{ id: "new" }, { id: "old" }] } } };
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response], connection).ctx,
  );
  const second = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response], connection).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(first, second);
});
