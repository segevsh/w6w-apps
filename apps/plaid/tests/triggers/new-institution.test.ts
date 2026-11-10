import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-institution.ts";

const input = { params: {}, subscriptionId: "sub-1" };
test("new-institution: seeds, emits additions only, retries idempotently, and requests the catalog", async () => {
  const seed = mockCtx([{ body: { institutions: [{ institution_id: "ins-1" }], total: 1 } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(seed.calls[0].url, "https://sandbox.plaid.com/institutions/get");
  assertEquals(
    seed.calls[0].body,
    '{"count":200,"offset":0,"country_codes":["US"],"options":{"include_optional_metadata":true}}',
  );
  const page = {
    institutions: [{ institution_id: "ins-2" }, { institution_id: "ins-1" }],
    total: 2,
  };
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  assertEquals(first.events, [{
    change: "added",
    key: "ins-2",
    values: { institution_id: "ins-2" },
  }]);
  assertEquals(retry, first);
  const edited = {
    institutions: [{ institution_id: "ins-2", name: "Renamed" }, { institution_id: "ins-1" }],
    total: 2,
  };
  const noUpdate = await trigger.poll!(
    { ...input, state: first.nextState },
    mockCtx([{ body: edited }]).ctx,
  );
  assertEquals(noUpdate.events, []);
});
