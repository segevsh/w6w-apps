import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import newDataset from "../../triggers/new-dataset.ts";
import newKeyValueStore from "../../triggers/new-key-value-store.ts";
import newRun from "../../triggers/new-run.ts";
import newStoreActor from "../../triggers/new-store-actor.ts";
import newStoreKey from "../../triggers/new-store-key.ts";
import newTask from "../../triggers/new-task.ts";
import newWebhook from "../../triggers/new-webhook.ts";
import type { TriggerDefinition } from "@w6w/types";

const BASE = "https://api.apify.com/v2";
const NEWEST = "desc=1&limit=100&offset=0";

interface Case {
  name: string;
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  /** Literal URL of the request one check makes. */
  url: string;
}

const cases: Case[] = [
  { name: "new-run", trigger: newRun, params: {}, url: `${BASE}/actor-runs?${NEWEST}` },
  { name: "new-task", trigger: newTask, params: {}, url: `${BASE}/actor-tasks?${NEWEST}` },
  { name: "new-webhook", trigger: newWebhook, params: {}, url: `${BASE}/webhooks?${NEWEST}` },
  { name: "new-dataset", trigger: newDataset, params: {}, url: `${BASE}/datasets?${NEWEST}` },
  {
    name: "new-dataset (include unnamed)",
    trigger: newDataset,
    params: { includeUnnamed: true },
    url: `${BASE}/datasets?unnamed=1&${NEWEST}`,
  },
  {
    name: "new-key-value-store",
    trigger: newKeyValueStore,
    params: {},
    url: `${BASE}/key-value-stores?${NEWEST}`,
  },
  {
    name: "new-store-actor",
    trigger: newStoreActor,
    params: {},
    url: `${BASE}/store?sortBy=newest&limit=20&offset=0`,
  },
  {
    name: "new-store-actor (filtered)",
    trigger: newStoreActor,
    params: { search: "scraper", category: "ECOMMERCE" },
    url: `${BASE}/store?search=scraper&sortBy=newest&category=ECOMMERCE&limit=20&offset=0`,
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const poll = async (state: unknown, ids: string[]) => {
      const m = mockCtx([{ body: listEnvelope(ids.map((id) => ({ id, name: `Item ${id}` }))) }]);
      const r = await c.trigger.poll!({ params: c.params, state, subscriptionId: "s" }, m.ctx);
      return { r, calls: m.calls };
    };

    test("seeds without events, then emits only the new record, idempotently", async () => {
      const seeded = await poll({}, ["b", "a"]);
      assertEquals(seeded.r.events, []);
      assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
      const first = await poll(seeded.r.nextState, ["c", "b", "a"]);
      const retry = await poll(seeded.r.nextState, ["c", "b", "a"]);
      assertEquals(first.r.events, [{ id: "c", name: "Item c" }]);
      assertEquals(retry.r, first.r);
    });

    test("sends the literal newest-first request of the wrapped list action", async () => {
      const { calls } = await poll({}, ["a"]);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "GET");
      assertEquals(calls[0].url, c.url);
    });
  });
}

test("new-webhook: the header template (which may hold secrets) never reaches the event", async () => {
  const hook = {
    id: "h1",
    requestUrl: "https://example.com/hook",
    headersTemplate: "x-token: test-secret",
  };
  const m = mockCtx([{ body: listEnvelope([hook]) }, {
    body: listEnvelope([{ id: "h2", headersTemplate: "x: test-secret" }, hook]),
  }]);
  const seeded = await newWebhook.poll!({ params: {}, state: {}, subscriptionId: "s" }, m.ctx);
  const next = await newWebhook.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    m.ctx,
  );
  assertEquals(next.events, [{ id: "h2" }]);
});

describe("new-store-key", () => {
  const keys = (names: string[], more?: string) => ({
    body: {
      data: {
        items: names.map((key) => ({ key, size: 10 })),
        isTruncated: more !== undefined,
        nextExclusiveStartKey: more,
        limit: 1000,
      },
    },
  });
  const params = { storeId: "store-1", prefix: "img-" };
  const run = async (state: unknown, responses: Array<{ body: unknown }>) => {
    const m = mockCtx(responses);
    const r = await newStoreKey.poll!({ params, state, subscriptionId: "s" }, m.ctx);
    return { r, calls: m.calls };
  };

  test("seeds, then emits the new key, idempotently; request is literal", async () => {
    const seeded = await run({}, [keys(["img-a", "img-b"])]);
    assertEquals(seeded.r.events, []);
    assertEquals(seeded.calls[0].method, "GET");
    assertEquals(
      seeded.calls[0].url,
      `${BASE}/key-value-stores/store-1/keys?prefix=img-&limit=1000`,
    );
    const first = await run(seeded.r.nextState, [keys(["img-a", "img-b", "img-c"])]);
    const retry = await run(seeded.r.nextState, [keys(["img-a", "img-b", "img-c"])]);
    assertEquals(first.r.events, [{ key: "img-c", size: 10 }]);
    assertEquals(retry.r, first.r);
  });

  test("follows nextExclusiveStartKey while truncated", async () => {
    const r = await run({}, [keys(["a"], "a"), keys(["b"])]);
    assertEquals(r.calls.map((c) => c.url), [
      `${BASE}/key-value-stores/store-1/keys?prefix=img-&limit=1000`,
      `${BASE}/key-value-stores/store-1/keys?prefix=img-&exclusiveStartKey=a&limit=1000`,
    ]);
  });

  test("a store with more than 5000 keys throws instead of diffing a partial list", async () => {
    const pages = Array.from({ length: 5 }, (_, i) => keys([`k${i}`], `k${i}`));
    await assertRejects(() => run({}, pages));
  });
});
