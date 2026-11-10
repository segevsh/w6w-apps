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
