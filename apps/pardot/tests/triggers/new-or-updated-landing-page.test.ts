import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-or-updated-landing-page.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const at = (seconds: number) => {
  clock.now = () => seconds * 1000;
};

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: number, updatedAt = "2026-11-09T10:00:00-05:00") => ({
  id,
  name: `p${id}`,
  updatedAt,
});
const ctx = (rows: unknown[]) => mockCtx([{ body: { values: rows, nextPageToken: null } }]);
// 2026-11-09T12:00:00Z = 1794225600 s; minus the 120 s overlap = 11:58:00+00:00.
const url = (iso: string) =>
  "https://pi.pardot.com/api/v5/objects/landing-pages?fields=id%2Cname%2Ctitle%2Curl%2CcampaignId%2CformId%2CcreatedAt%2CupdatedAt" +
  `&limit=200&orderBy=id+DESC&updatedAtAfter=${iso}`;

test("new-or-updated-landing-page: seeds, emits an edited page, retries idempotently, filters updatedAtAfter", async () => {
  at(1794225600);
  const seed = ctx([row(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, url("2026-11-09T11%3A58%3A00%2B00%3A00"));

  at(1794225900);
  const page = [row(1, "2026-11-09T12:03:00-05:00"), row(1)];
  const next = ctx(page);
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [row(1, "2026-11-09T12:03:00-05:00")]);
  assertEquals(next.calls[0].url, url("2026-11-09T11%3A58%3A00%2B00%3A00"));
  assertEquals(retry, first);
});
