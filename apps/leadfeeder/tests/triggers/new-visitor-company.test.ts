import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-visitor-company.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const input = { params: { accountId: "A1" }, subscriptionId: "sub-1" };
const co = (id: string) => ({ id, type: "company_location", relationships: {} });
const page = (...ids: string[]) => ({
  body: {
    data: ids.map(co),
    meta: { request_id: "r1", pagination: { page_num: 1, page_count: 1 } },
  },
});

test("new-visitor-company: seeds, emits the new visitor, retries, and requests the dated window", async () => {
  clock.now = () => 1_794_225_600_000;
  const seed = mockCtx([page("c1")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  const url = new URL(seed.calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.leadfeeder.com/v1/web-visits/companies");
  assertEquals(url.searchParams.get("account_id"), "A1");
  assertEquals(url.searchParams.get("start_date"), "2026-11-08");
  assertEquals(url.searchParams.get("end_date"), "2026-11-09");
  assertEquals(url.searchParams.get("page[size]"), "100");
  assertEquals(url.searchParams.has("sort[field]"), false);
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([page("c2", "c1")]).ctx);
  const first = await run();
  assertEquals(first.events, [co("c2")]);
  assertEquals(await run(), first);
});
