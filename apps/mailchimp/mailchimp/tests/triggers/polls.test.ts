import { test } from "node:test";
import assert from "node:assert/strict";
import { mockCtx } from "../_helpers.ts";
import newCampaign from "../../triggers/new-campaign.ts";
import newGroupInterest from "../../triggers/new-group-interest.ts";

const CAMPAIGN_URL = "https://us14.api.mailchimp.com/3.0/campaigns?";
const campaign = (id: string) => ({ id, status: "save", create_time: "2026-11-09T10:00:00+00:00" });

test("new-campaign: seeds without emitting, then emits only the campaign newly ahead", async () => {
  const seed = mockCtx([{ body: { campaigns: [campaign("c1"), campaign("c0")] } }]);
  const seeded = await newCampaign.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assert.deepEqual(seeded.events, []);
  assert.equal((seeded.nextState as { seeded?: boolean }).seeded, true);

  const page = { body: { campaigns: [campaign("c2"), campaign("c1"), campaign("c0")] } };
  const first = mockCtx([page]);
  const retry = mockCtx([page]);
  const input = { params: {}, state: seeded.nextState, subscriptionId: "s" };
  const result = await newCampaign.poll!(input, first.ctx);
  assert.deepEqual(result.events, [campaign("c2")]);
  assert.deepEqual(await newCampaign.poll!(input, retry.ctx), result);
});

test("new-campaign: the request is the list-campaigns endpoint sorted newest created first", async () => {
  const { ctx, calls } = mockCtx([{ body: { campaigns: [] } }]);
  await newCampaign.poll!({ params: { listId: "aud_1" }, state: {}, subscriptionId: "s" }, ctx);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
  assert.equal(
    calls[0].url,
    `${CAMPAIGN_URL}list_id=aud_1&sort_field=create_time&sort_dir=DESC&fields=campaigns.id%2Ccampaigns.web_id%2Ccampaigns.type%2Ccampaigns.create_time%2Ccampaigns.status%2Ccampaigns.send_time%2Ccampaigns.settings.title%2Ccampaigns.settings.subject_line%2Ccampaigns.recipients.list_id&count=50&offset=0`,
  );
  assert.equal(calls[0].body, null);
});

test("new-campaign: without an audience the request carries no list_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { campaigns: [] } }]);
  await newCampaign.poll!({ params: {}, state: {}, subscriptionId: "s" }, ctx);
  assert.equal(new URL(calls[0].url).searchParams.has("list_id"), false);
});

// ------------------------------------------------------------------ new-group-interest

const interest = (id: string) => ({
  id,
  category_id: "cat_1",
  list_id: "aud_1",
  name: `Interest ${id}`,
});
const GI = { params: { listId: "aud_1", categoryId: "cat_1" }, subscriptionId: "s" };
const GI_URL = "https://us14.api.mailchimp.com/3.0/lists/aud_1/interest-categories/cat_1/interests";

test("new-group-interest: seeds, emits only added interests, retries idempotently", async () => {
  const seed = mockCtx([{ body: { interests: [interest("i1"), interest("i2")], total_items: 2 } }]);
  const seeded = await newGroupInterest.poll!({ ...GI, state: {} }, seed.ctx);
  assert.deepEqual(seeded.events, []);
  assert.equal((seeded.nextState as { seeded?: boolean }).seeded, true);

  const page = {
    body: { interests: [interest("i1"), interest("i2"), interest("i3")], total_items: 3 },
  };
  const a = await newGroupInterest.poll!({ ...GI, state: seeded.nextState }, mockCtx([page]).ctx);
  const b = await newGroupInterest.poll!({ ...GI, state: seeded.nextState }, mockCtx([page]).ctx);
  assert.deepEqual(a.events, [interest("i3")]);
  assert.deepEqual(b, a);
});

test("new-group-interest: a rename or a removal does not emit", async () => {
  const seed = mockCtx([{ body: { interests: [interest("i1"), interest("i2")], total_items: 2 } }]);
  const seeded = await newGroupInterest.poll!({ ...GI, state: {} }, seed.ctx);
  const next = mockCtx([{
    body: { interests: [{ ...interest("i1"), name: "Renamed" }], total_items: 1 },
  }]);
  assert.deepEqual(
    (await newGroupInterest.poll!({ ...GI, state: seeded.nextState }, next.ctx)).events,
    [],
  );
});

test("new-group-interest: the request is the interests endpoint, 1000 at a time", async () => {
  const { ctx, calls } = mockCtx([{ body: { interests: [], total_items: 0 } }]);
  await newGroupInterest.poll!({ ...GI, state: {} }, ctx);
  assert.deepEqual(calls.map(({ method, url, body }) => ({ method, url, body })), [{
    method: "GET",
    url: `${GI_URL}?count=1000&offset=0`,
    body: null,
  }]);
});

test("new-group-interest: a second page is read at offset 1000 when total_items says so", async () => {
  const full = Array.from({ length: 1000 }, (_, i) => interest(`a${i}`));
  const { ctx, calls } = mockCtx([
    { body: { interests: full, total_items: 1001 } },
    { body: { interests: [interest("z")], total_items: 1001 } },
  ]);
  const out = await newGroupInterest.poll!({ ...GI, state: {} }, ctx);
  assert.deepEqual(out.events, []);
  assert.deepEqual(calls.map((c) => c.url), [
    `${GI_URL}?count=1000&offset=0`,
    `${GI_URL}?count=1000&offset=1000`,
  ]);
});

test("new-group-interest: a category larger than five pages is refused, not compared partly", async () => {
  const full = Array.from({ length: 1000 }, (_, i) => interest(`a${i}`));
  const { ctx, calls } = mockCtx(
    Array.from({ length: 5 }, () => ({ body: { interests: full, total_items: 6000 } })),
  );
  await assert.rejects(
    async () => await newGroupInterest.poll!({ ...GI, state: {} }, ctx),
    /more interests/,
  );
  assert.equal(calls.length, 5);
});

test("new-group-interest: a missing audience or category is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assert.rejects(
    async () =>
      await newGroupInterest.poll!(
        { params: { listId: "aud_1" }, state: {}, subscriptionId: "s" },
        ctx,
      ),
    /Interest category/,
  );
  assert.equal(calls.length, 0);
});
