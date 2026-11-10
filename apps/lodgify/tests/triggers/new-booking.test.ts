import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-booking.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const response = (ids: string[]) => ({ count: ids.length, items: ids.map((id) => ({ id })) });
const ctx = (ids: string[]) => mockCtx([{ body: response(ids) }]);

test("new-booking: seeds, emits only new items, retries idempotently, and requests its feed", async () => {
  const seed = ctx(["a"]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const request = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    path: request.pathname,
    query: Object.fromEntries(request.searchParams),
  }, {
    method: "GET",
    path: "/v2/reservations/bookings",
    query: { page: "1", size: "100", updatedSince: "1970-01-01T00:00:00Z" },
  });
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(["b", "a"]).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(["b", "a"]).ctx);
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});
