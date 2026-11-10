import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-landing-page.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: number) => ({ id, name: `p${id}` });
const ctx = (ids: number[]) => mockCtx([{ body: { values: ids.map(row), nextPageToken: null } }]);

test("new-landing-page: seeds, emits only new pages, retries idempotently, orders by id DESC", async () => {
  const seed = ctx([1]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://pi.pardot.com/api/v5/objects/landing-pages?fields=id%2Cname%2Ctitle%2Curl%2CcampaignId%2CformId%2CcreatedAt%2CupdatedAt&limit=200&orderBy=id+DESC",
  );

  const page = [2, 1];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [row(2)]);
  assertEquals(retry, first);
});
