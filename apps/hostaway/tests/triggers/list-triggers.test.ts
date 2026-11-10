import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import newListing from "../../triggers/new-listing.ts";
import newConversationMessage from "../../triggers/new-conversation-message.ts";
import newReview from "../../triggers/new-review.ts";

const API = "https://api.hostaway.com/v1";
const sub = "sub_1";
const row = (id: number) => ({ id });
const rows = (from: number, n: number) => Array.from({ length: n }, (_, i) => row(from + i));

describe("new-review", () => {
  const input = { params: {}, subscriptionId: sub };
  test("seeds without emitting, then emits only the new reviews, idempotently", async () => {
    const seeded = await newReview.poll!(
      { ...input, state: {} },
      mockCtx([envelope([row(2), row(1)])]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = envelope([row(4), row(3), row(2), row(1)]);
    const first = await newReview.poll!({ ...input, state: seeded.nextState }, mockCtx([page]).ctx);
    const retry = await newReview.poll!({ ...input, state: seeded.nextState }, mockCtx([page]).ctx);
    assertEquals(first.events, [row(3), row(4)]);
    assertEquals(retry, first);
  });
  test("requests the wrapped list action newest first (literal sort)", async () => {
    const seed = mockCtx([envelope([row(1)])]);
    await newReview.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      `${API}/reviews?limit=100&offset=0&sortBy=id&sortOrder=desc`,
    );
  });
});

const snaps = [
  { name: "new-listing", trigger: newListing, params: {}, path: "listings" },
  {
    name: "new-conversation-message",
    trigger: newConversationMessage,
    params: { conversationId: 1406 },
    path: "conversations/1406/messages",
  },
];
for (const c of snaps) {
  describe(c.name, () => {
    const input = { params: c.params, subscriptionId: sub };
    test("seeds without emitting, then emits only the new rows, idempotently", async () => {
      const seeded = await c.trigger.poll!(
        { ...input, state: {} },
        mockCtx([envelope([row(1), row(2)])]).ctx,
      );
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      const page = envelope([row(1), row(2), row(3)]);
      const first = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([page]).ctx,
      );
      const retry = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([page]).ctx,
      );
      assertEquals(first.events, [row(3)]);
      assertEquals(retry, first);
    });
    test("sends the literal request and pages until a short page", async () => {
      const m = mockCtx([envelope(rows(1, 100)), envelope(rows(101, 7))]);
      const out = await c.trigger.poll!({ ...input, state: {} }, m.ctx);
      assertEquals(out.events, []);
      assertEquals(m.calls.length, 2);
      assertEquals(m.calls[0].method, "GET");
      assertEquals(m.calls[0].url, `${API}/${c.path}?limit=100&offset=0`);
      assertEquals(m.calls[1].url, `${API}/${c.path}?limit=100&offset=100`);
    });
    test("a collection beyond 25 pages fails instead of a partial snapshot", async () => {
      const m = mockCtx(Array.from({ length: 25 }, (_, i) => envelope(rows(i * 100 + 1, 100))));
      await assertRejects(() => c.trigger.poll!({ ...input, state: {} }, m.ctx), Error, "25 pages");
    });
  });
}
