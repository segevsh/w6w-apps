import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-playlist.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const pl = (id: string, snapshot_id = "snap-1") => ({ id, name: `Playlist ${id}`, snapshot_id });
const page = (items: unknown[], next: string | null = null) => ({
  body: { items, total: items.length, next },
});
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;
const seed = () => trigger.poll!({ ...input, state: {} } as never, mockCtx([page([pl("a")])]).ctx);

test("new-playlist: first check stores the snapshot without emitting", async () => {
  const r = await seed();
  assertEquals(events(r), []);
  assertEquals((next(r) as { seeded?: boolean }).seeded, true);
});

test("new-playlist: emits only the added playlist; a retry is identical", async () => {
  const seeded = await seed();
  const resp = () => mockCtx([page([pl("a"), pl("b")])]).ctx;
  const first = await trigger.poll!({ ...input, state: next(seeded) } as never, resp());
  const retry = await trigger.poll!({ ...input, state: next(seeded) } as never, resp());
  assertEquals(events(first), [pl("b")]);
  assertEquals(retry, first);
});

test("new-playlist: an edited playlist (new snapshot_id) is not a new playlist", async () => {
  const seeded = await seed();
  const r = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page([pl("a", "snap-2")])]).ctx,
  );
  assertEquals(events(r), []);
});

test("new-playlist: reads the whole library across pages with limit=50 and offsets", async () => {
  const full = Array.from({ length: 50 }, (_, i) => pl(`p${i}`));
  const c = mockCtx([
    page(full, "https://api.spotify.com/v1/me/playlists?offset=50&limit=50"),
    page([pl("last")]),
  ]);
  const seeded = await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  assertEquals(c.calls.length, 2);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(c.calls[0].url, "https://api.spotify.com/v1/me/playlists?limit=50&offset=0");
  assertEquals(c.calls[1].url, "https://api.spotify.com/v1/me/playlists?limit=50&offset=50");
  assertEquals(Object.keys((next(seeded) as { hashes: object }).hashes).length, 51);
});

test("new-playlist: a library over 500 playlists is refused, not truncated", async () => {
  const full = Array.from({ length: 50 }, (_, i) => pl(`p${i}`));
  const c = mockCtx(
    Array.from({ length: 10 }, () => page(full, "https://api.spotify.com/v1/me/playlists?next")),
  );
  let message = "";
  try {
    await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Spotify library has more than 500 playlists; too many to snapshot");
});
