import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-campaign.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (
  id: string,
  stamp = "stamp-1",
) => ({ campaign_key: id, campaign_name: `Campaign ${id}`, created_time: stamp });
const page = (...rows: unknown[]) =>
  mockCtx([{ body: { status: "success", recent_campaigns: rows } }]);

test("new-campaign: the first check seeds without events and sends the documented request", async () => {
  const seed = page(item("a"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://campaigns.zoho.com/api/v1.1/recentcampaigns?resfmt=JSON&sort=desc&fromindex=1&range=20",
  );
});

test("new-campaign: emits only the new campaign, and a retry from the same state is identical", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, page(item("a")).ctx);
  const rows = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
  const again = await trigger.poll!({ ...input, state: first.nextState }, page(...rows).ctx);
  assertEquals(again.events, []);
});
