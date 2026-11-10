import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-booking.ts";

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
