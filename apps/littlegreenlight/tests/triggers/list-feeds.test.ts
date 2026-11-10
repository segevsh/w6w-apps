import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newGift from "../../triggers/new-gift.ts";
import newOrUpdatedGift from "../../triggers/new-or-updated-gift.ts";
import newAppeal from "../../triggers/new-appeal.ts";
import newCampaign from "../../triggers/new-campaign.ts";
import newFund from "../../triggers/new-fund.ts";
import newGroup from "../../triggers/new-group.ts";
import newConstituentNote from "../../triggers/new-constituent-note.ts";

const sub = { subscriptionId: "sub-1" };
const API = "/api/v1";

function requestOf(call: { method: string; url: string }) {
  const u = new URL(call.url);
  return {
    method: call.method,
    path: u.pathname,
    query: [...u.searchParams.entries()],
  };
}

const gifts = [
  { trigger: newGift, sort: "date_created!" },
  { trigger: newOrUpdatedGift, sort: "date_updated!" },
];

for (const g of gifts) {
  const rec = (id: number, updated = "2026-11-01T00:00:00Z") => ({ id, updated_at: updated });
  test(`${g.trigger.key}: seeds, emits the unseen gift, retries identically, sends the literal request`, async () => {
    const seed = mockCtx([{ body: { items: [rec(1)] } }]);
    const seeded = await g.trigger.poll!({ params: {}, state: {}, ...sub }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(requestOf(seed.calls[0]), {
      method: "GET",
      path: `${API}/gifts/search.json`,
      query: [
        ["sort", g.sort],
        ["limit", "100"],
        ["offset", "0"],
        ["q[]", "updated_from=2000-01-01"],
      ],
    });
    const resp = { body: { items: [rec(2), rec(1)] } };
    const first = await g.trigger.poll!(
      { params: {}, state: seeded.nextState, ...sub },
      mockCtx([resp]).ctx,
    );
    const second = await g.trigger.poll!(
      { params: {}, state: seeded.nextState, ...sub },
      mockCtx([resp]).ctx,
    );
    assertEquals(first.events, [rec(2)]);
    assertEquals(first, second);
  });
}

test("new-or-updated-gift: an edit of an old gift is a new event", async () => {
  const old = { id: 1, updated_at: "2026-11-01T00:00:00Z" };
  const seeded = await newOrUpdatedGift.poll!(
    { params: {}, state: {}, ...sub },
    mockCtx([{ body: { items: [old] } }]).ctx,
  );
  const edited = { id: 1, updated_at: "2026-11-10T09:00:00Z" };
  const out = await newOrUpdatedGift.poll!(
    { params: {}, state: seeded.nextState, ...sub },
    mockCtx([{ body: { items: [edited, old] } }]).ctx,
  );
  assertEquals(out.events, [edited]);
});

const snaps = [
  { trigger: newAppeal, params: {}, path: `${API}/appeals.json` },
  { trigger: newCampaign, params: {}, path: `${API}/campaigns.json` },
  { trigger: newFund, params: {}, path: `${API}/funds.json` },
  { trigger: newGroup, params: {}, path: `${API}/groups.json` },
  {
    trigger: newConstituentNote,
    params: { constituent_id: 42 },
    path: `${API}/constituents/42/notes.json`,
  },
];

for (const s of snaps) {
  const rec = (id: number) => ({ id, name: `Record ${id}` });
  const page = (...ids: number[]) => ({
    body: { items: ids.map(rec), items_count: ids.length, total_items: ids.length },
  });
  test(`${s.trigger.key}: seeds, emits only the new record, retries identically, sends the literal request`, async () => {
    const seed = mockCtx([page(1)]);
    const seeded = await s.trigger.poll!({ params: s.params, state: {}, ...sub }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(requestOf(seed.calls[0]), {
      method: "GET",
      path: s.path,
      query: [["limit", "100"], ["offset", "0"]],
    });
    const run = () =>
      s.trigger.poll!(
        { params: s.params, state: seeded.nextState, ...sub },
        mockCtx([page(1, 2)]).ctx,
      );
    const first = await run();
    assertEquals(first.events, [rec(2)]);
    assertEquals(await run(), first);
  });
}

test("new-group: reads the next page while total_items says there is more", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
  const m = mockCtx([
    { body: { items: full, items_count: 100, total_items: 101 } },
    { body: { items: [{ id: 101 }], items_count: 1, total_items: 101 } },
  ]);
  await newGroup.poll!({ params: {}, state: {}, ...sub }, m.ctx);
  assertEquals(m.calls.map((c) => requestOf(c).query), [
    [["limit", "100"], ["offset", "0"]],
    [["limit", "100"], ["offset", "100"]],
  ]);
});
