import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { SEEN_WINDOW } from "../../triggers/new-booking.ts";

const input = { params: { shortname: "bodyglove" }, subscriptionId: "sub_1" };
const booking = (pk: number) => ({ pk, uuid: `u-${pk}`, status: "booked" });
const page = (...pks: number[]) => ({ body: { bookings: pks.map(booking) } });

async function withClock<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => Date.parse(iso);
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

test("new-booking: seeds, emits only unseen bookings, retries idempotently, polls today and yesterday UTC", async () => {
  await withClock("2026-11-10T00:30:00Z", async () => {
    const seed = mockCtx([page(1), page(2)]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

    const responses = [page(3, 1), page(2)];
    const first = mockCtx(responses);
    const retry = mockCtx(responses);
    const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
    const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
    assertEquals(result.events, [booking(3)]);
    assertEquals(repeated, result);

    assertEquals(
      first.calls.map((c) => [c.method, new URL(c.url).pathname, new URL(c.url).search]),
      [
        [
          "GET",
          "/api/external/v1/companies/bodyglove/minimal/bookings-by-create-date/2026-11-10/",
          "",
        ],
        [
          "GET",
          "/api/external/v1/companies/bodyglove/minimal/bookings-by-create-date/2026-11-09/",
          "",
        ],
      ],
    );
  });
});

test("new-booking: 250 bookings in one window are emitted exactly once across successive checks", async () => {
  await withClock("2026-11-10T00:30:00Z", async () => {
    const pks = Array.from({ length: 250 }, (_, i) => 1000 + i);
    // The day endpoint is not paged: every check sees the whole day; the kit emits the oldest 100
    // unseen and only those are marked seen, so the rest arrive on the following checks.
    let state: unknown = { v: 1, kind: "ids", seeded: true, ids: [] };
    const seen: number[] = [];
    for (let check = 0; check < 3; check++) {
      const { ctx } = mockCtx([page(...pks.slice().reverse()), page()]);
      const result = await trigger.poll!({ ...input, state }, ctx);
      seen.push(...result.events.map((e) => (e as { pk: number }).pk));
      state = result.nextState;
    }
    assertEquals(seen.length, 250);
    assertEquals(new Set(seen).size, 250);
    const { ctx } = mockCtx([page(...pks.slice().reverse()), page()]);
    assertEquals((await trigger.poll!({ ...input, state }, ctx)).events, []);
  });
});

test("new-booking: a window of 1200 bookings that existed before the seed never floods a later check", async () => {
  await withClock("2026-11-10T00:30:00Z", async () => {
    // More than the old 1000-id memory and more than a hundred times maxEvents.
    assertEquals(SEEN_WINDOW >= 1200, true);
    const old = Array.from({ length: 1200 }, (_, i) => 1000 + i).reverse();
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([page(...old), page()]).ctx,
    );
    assertEquals(seeded.events, []);
    const quiet = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([page(...old), page()]).ctx,
    );
    assertEquals(quiet.events, []);
    const fresh = await trigger.poll!(
      { ...input, state: quiet.nextState },
      mockCtx([page(5000, ...old), page()]).ctx,
    );
    assertEquals(fresh.events, [booking(5000)]);
    // ... and it is not emitted a second time while it stays listed.
    const again = await trigger.poll!(
      { ...input, state: fresh.nextState },
      mockCtx([page(5000, ...old), page()]).ctx,
    );
    assertEquals(again.events, []);
  });
});
