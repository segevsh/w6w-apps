import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newOffer from "../../triggers/new-offer.ts";
import newPlaylistItem from "../../triggers/new-playlist-item.ts";

const BASE = "https://uscreen.io/publisher_api/v1";
const JSON_HEADERS = { "content-type": "application/json" };
const rec = (id: number) => ({ id, title: `t${id}` });

test("new-offer: seeds, emits a new id, retries idempotently, requests the literal page", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const resp = (items: unknown[], next?: number) => ({
    body: items,
    headers: {
      ...JSON_HEADERS,
      ...(next ? { link: `<${BASE}/offers?page=${next}>; rel="next"` } : {}),
    },
  });
  const seeded = await newOffer.poll!({ ...input, state: {} }, mockCtx([resp([rec(1)])]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const run = mockCtx([resp([rec(2)], 2), resp([rec(1)])]);
  const first = await newOffer.poll!({ ...input, state: seeded.nextState }, run.ctx);
  const retry = await newOffer.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([resp([rec(2)], 2), resp([rec(1)])]).ctx,
  );
  assertEquals(first.events, [rec(2)]);
  assertEquals(retry, first);
  assertEquals(run.calls.map((c) => [c.method, c.url]), [
    ["GET", `${BASE}/offers?page=1`],
    ["GET", `${BASE}/offers?page=2`],
  ]);
  const again = await newOffer.poll!(
    { ...input, state: first.nextState },
    mockCtx([resp([rec(2)], 2), resp([rec(1)])]).ctx,
  );
  assertEquals(again.events, []);
});

test("new-playlist-item: seeds, emits a new id, retries idempotently, requests the literal list", async () => {
  const input = { params: { contentId: "55" }, subscriptionId: "s" };
  const resp = (items: unknown[]) => ({ body: items, headers: JSON_HEADERS });
  const seeded = await newPlaylistItem.poll!(
    { ...input, state: {} },
    mockCtx([resp([rec(1)])]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const run = mockCtx([resp([rec(2), rec(1)])]);
  const first = await newPlaylistItem.poll!({ ...input, state: seeded.nextState }, run.ctx);
  const retry = await newPlaylistItem.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([resp([rec(2), rec(1)])]).ctx,
  );
  assertEquals(first.events, [rec(2)]);
  assertEquals(retry, first);
  assertEquals(run.calls.length, 1);
  assertEquals(run.calls[0].method, "GET");
  assertEquals(run.calls[0].url, `${BASE}/contents/55/playlist_items`);
});
