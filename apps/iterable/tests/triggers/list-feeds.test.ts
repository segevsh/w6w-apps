import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTemplate from "../../triggers/new-template.ts";
import newOrUpdatedTemplate from "../../triggers/new-or-updated-template.ts";
import newJourney from "../../triggers/new-journey.ts";
import newOrUpdatedJourney from "../../triggers/new-or-updated-journey.ts";
import newList from "../../triggers/new-list.ts";
import newCatalog from "../../triggers/new-catalog.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const BASE = "https://api.iterable.com/api";

interface Case {
  name: string;
  trigger: typeof newTemplate;
  url: string;
  body: (items: unknown[]) => unknown;
  old: unknown;
  fresh: unknown;
}

const cases: Case[] = [
  {
    name: "new-template",
    trigger: newTemplate,
    url: `${BASE}/templates?page=1&pageSize=100&sort=-createdAt`,
    body: (templates) => ({ templates }),
    old: { templateId: 1, updatedAt: "2026-11-01T00:00:00Z" },
    fresh: { templateId: 2, updatedAt: "2026-11-02T00:00:00Z" },
  },
  {
    name: "new-or-updated-template",
    trigger: newOrUpdatedTemplate,
    url: `${BASE}/templates?page=1&pageSize=100&sort=-updatedAt`,
    body: (templates) => ({ templates }),
    old: { templateId: 1, updatedAt: "2026-11-01T00:00:00Z" },
    fresh: { templateId: 2, updatedAt: "2026-11-02T00:00:00Z" },
  },
  {
    name: "new-journey",
    trigger: newJourney,
    url: `${BASE}/journeys?page=1&pageSize=50&sort=-createdAt`,
    body: (journeys) => ({ journeys, totalJourneysCount: journeys.length }),
    old: { id: 1, updatedAt: 10 },
    fresh: { id: 2, updatedAt: 20 },
  },
  {
    name: "new-or-updated-journey",
    trigger: newOrUpdatedJourney,
    url: `${BASE}/journeys?page=1&pageSize=50&sort=-updatedAt`,
    body: (journeys) => ({ journeys, totalJourneysCount: journeys.length }),
    old: { id: 1, updatedAt: 10 },
    fresh: { id: 2, updatedAt: 20 },
  },
];

for (const c of cases) {
  test(`${c.name}: seeds, emits the unseen record, retries identically, sends the literal request`, async () => {
    const seed = mockCtx([{ body: c.body([c.old]) }]);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
    const resp = { body: c.body([c.fresh, c.old]) };
    const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([resp]).ctx);
    const second = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([resp]).ctx,
    );
    assertEquals(first.events, [c.fresh]);
    assertEquals(first, second);
  });
}

test("new-or-updated-template: an edit of an old template is a new event", async () => {
  const old = { templateId: 1, updatedAt: "2026-11-01T00:00:00Z" };
  const seeded = await newOrUpdatedTemplate.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { templates: [old] } }]).ctx,
  );
  const edited = { templateId: 1, updatedAt: "2026-11-10T09:00:00Z" };
  const out = await newOrUpdatedTemplate.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { templates: [edited, old] } }]).ctx,
  );
  assertEquals(out.events, [edited]);
});

test("new-or-updated-journey: an edit of an old journey is a new event", async () => {
  const old = { id: 1, updatedAt: 10 };
  const seeded = await newOrUpdatedJourney.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { journeys: [old] } }]).ctx,
  );
  const edited = { id: 1, updatedAt: 99 };
  const out = await newOrUpdatedJourney.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { journeys: [edited, old] } }]).ctx,
  );
  assertEquals(out.events, [edited]);
});

test("new-list: seeds, emits only the new list, retries identically, requests GET /lists", async () => {
  const seed = mockCtx([{ body: { lists: [{ id: 1, name: "A" }] } }]);
  const seeded = await newList.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, `${BASE}/lists`);
  const resp = { body: { lists: [{ id: 1, name: "A" }, { id: 2, name: "B" }] } };
  const first = await newList.poll!({ ...input, state: seeded.nextState }, mockCtx([resp]).ctx);
  const second = await newList.poll!({ ...input, state: seeded.nextState }, mockCtx([resp]).ctx);
  assertEquals(first.events, [{ id: 2, name: "B" }]);
  assertEquals(first, second);
});

test("new-catalog: seeds, emits only the new catalog, retries identically, requests page 1 of size 100", async () => {
  const seed = mockCtx([{ body: { catalogNames: [{ name: "products" }], totalCatalogsCount: 1 } }]);
  const seeded = await newCatalog.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].url, `${BASE}/catalogs?page=1&pageSize=100`);
  const resp = {
    body: { catalogNames: [{ name: "products" }, { name: "stores" }], totalCatalogsCount: 2 },
  };
  const first = await newCatalog.poll!({ ...input, state: seeded.nextState }, mockCtx([resp]).ctx);
  const second = await newCatalog.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([resp]).ctx,
  );
  assertEquals(first.events, [{ name: "stores" }]);
  assertEquals(first, second);
});

test("new-catalog: reads the next page when a page is full", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ name: `c${i}` }));
  const m = mockCtx([
    { body: { catalogNames: full, totalCatalogsCount: 101 } },
    { body: { catalogNames: [{ name: "c100" }], totalCatalogsCount: 101 } },
  ]);
  await newCatalog.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.map((c) => c.url), [
    `${BASE}/catalogs?page=1&pageSize=100`,
    `${BASE}/catalogs?page=2&pageSize=100`,
  ]);
});
