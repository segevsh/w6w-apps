import assert from "node:assert/strict";
import { describe, test } from "node:test";
import newContact from "../../triggers/new-contact.ts";
import newSeat from "../../triggers/new-seat.ts";
import { mockCtx } from "../_helpers.ts";

const sent = (c: { method: string; url: string }) => {
  const u = new URL(c.url);
  return { method: c.method, path: u.pathname, query: Object.fromEntries(u.searchParams) };
};

describe("new-contact", () => {
  const res = (phone: string) => ({ body: [{ phone, firstName: "A" }] });
  test("seeds, emits once, retries idempotently, and requests newest first", async () => {
    const seed = mockCtx([res("+14155550001")]);
    const seeded = await newContact.poll!({ params: {}, state: {} }, seed.ctx);
    assert.deepEqual(seeded.events, []);
    assert.equal(seeded.nextState.seeded, true);
    assert.deepEqual(sent(seed.calls[0]), {
      method: "GET",
      path: "/api/v2/contacts",
      query: { order_by: "created_at", order_direction: "desc", limit: "100", offset: "0" },
    });
    const run = mockCtx([res("+14155550002")]);
    const out = await newContact.poll!({ params: {}, state: seeded.nextState }, run.ctx);
    assert.deepEqual(out.events, [{ phone: "+14155550002", firstName: "A" }]);
    const again = await newContact.poll!(
      { params: {}, state: seeded.nextState },
      mockCtx([res("+14155550002")]).ctx,
    );
    assert.deepEqual(again, out);
    assert.deepEqual(sent(run.calls[0]), {
      method: "GET",
      path: "/api/v2/contacts",
      query: { order_by: "created_at", order_direction: "desc", limit: "100", offset: "0" },
    });
  });
});

describe("new-seat", () => {
  const seat = (id: string) => ({ seat_id: id, email: `${id}@example.com` });
  test("seeds, emits only the added seat, retries identically, sends the literal request", async () => {
    const seed = mockCtx([{ body: [seat("s1")] }]);
    const seeded = await newSeat.poll!({ params: {}, state: {} }, seed.ctx);
    assert.deepEqual(seeded.events, []);
    assert.deepEqual(sent(seed.calls[0]), { method: "GET", path: "/api/v2/seats", query: {} });
    const run = () => mockCtx([{ body: [seat("s2"), seat("s1")] }]);
    const out = await newSeat.poll!({ params: {}, state: seeded.nextState }, run().ctx);
    const again = await newSeat.poll!({ params: {}, state: seeded.nextState }, run().ctx);
    assert.deepEqual(out.events, [seat("s2")]);
    assert.deepEqual(again, out);
  });
});
