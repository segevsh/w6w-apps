import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-profile.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const profile = (id: string, updated: string) => ({ id, attributes: { updated } });
const response = (data: unknown[]) => ({ body: { data, links: {} } });

test("new-or-updated-profile seeds, emits new and edited profiles, retries, and requests the literal updated sort", async () => {
  const old = profile("p1", "2026-11-09T10:00:00+00:00");
  const edited = profile("p1", "2026-11-09T11:00:00+00:00");
  const fresh = profile("p2", "2026-11-09T11:30:00+00:00");
  const seed = mockCtx([response([old])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://a.klaviyo.com/api/profiles/?sort=-updated&page%5Bsize%5D=100",
  );
  const run = (items: unknown[]) =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([response(items)]).ctx);
  const first = await run([fresh, edited, old]);
  assertEquals(first.events, [edited, fresh]);
  assertEquals(await run([fresh, edited, old]), first);
  // An unchanged profile (same id, same updated stamp) does not fire again.
  assertEquals((await run([old])).events, []);
});

test("new-or-updated-profile walks past page 1 when the whole page is unseen (maxPages+1 stall probe)", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([response([profile("p0", "2026-11-09T09:00:00+00:00")])]).ctx,
  );
  const fullPage = (from: number) =>
    Array.from({ length: 100 }, (_, i) => profile(`p${from - i}`, "2026-11-09T12:00:00+00:00"));
  const page = (items: unknown[], next?: string) => ({
    body: {
      data: items,
      links: next
        ? { next: `https://a.klaviyo.com/api/profiles/?sort=-updated&page%5Bcursor%5D=${next}` }
        : {},
    },
  });
  const m = mockCtx([
    page(fullPage(1000), "c2"),
    page(fullPage(900), "c3"),
    page(fullPage(800), "c4"),
    page(fullPage(700), "c5"),
    page(fullPage(600), "c6"),
  ]);
  const out = await trigger.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(m.calls.length, 5);
  assertEquals(new URL(m.calls[1].url).searchParams.get("page[cursor]"), "c2");
  assertEquals(new URL(m.calls[4].url).searchParams.get("page[cursor]"), "c5");
  // Oldest 100 of the 500 unseen are emitted (kit maxEvents); the rest stay unseen for the next check.
  assertEquals(out.events.length, 100);
  const state = out.nextState as { ids: string[] };
  assertEquals(state.ids.includes("p600:2026-11-09T12:00:00+00:00"), true);
  assertEquals(state.ids.includes("p1000:2026-11-09T12:00:00+00:00"), false);
});
