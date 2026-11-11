import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import newMessage from "../../triggers/new-message.ts";
import newMediaFile from "../../triggers/new-media-file.ts";
import newContactGroup from "../../triggers/new-contact-group.ts";
import newKeyword from "../../triggers/new-keyword.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: string) => ({ id });
const ctx = (ids: string[], extra: Record<string, unknown> = {}) =>
  mockCtx([{ body: page(ids.map(row), extra) }]);
const API = "https://a.eztexting.com/v1";

// Newest-first triggers: one request with the documented sort.
const sorted = [
  {
    name: "new-message",
    trigger: newMessage,
    url: `${API}/messages?page=0&size=100&sort=sentAt%2Cdesc`,
  },
  {
    name: "new-media-file",
    trigger: newMediaFile,
    url: `${API}/media-files?page=0&size=100&sort=uploadAt%2Cdesc`,
  },
];
for (const c of sorted) {
  describe(c.name, () => {
    test("seeds without emitting, then emits only the new rows, idempotently", async () => {
      const seeded = await c.trigger.poll!({ ...input, state: {} }, ctx(["b", "a"]).ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      const newer = ["d", "c", "b", "a"];
      const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx(newer).ctx);
      const retry = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx(newer).ctx);
      assertEquals(first.events, [row("c"), row("d")]);
      assertEquals(retry, first);
    });
    test("requests the wrapped list action newest first", async () => {
      const seed = ctx(["a"]);
      await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seed.calls.length, 1);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
    });
  });
}

// Snapshot triggers: walk every page at the largest size and diff the ids.
const snaps = [
  { name: "new-contact-group", trigger: newContactGroup, path: "contact-groups" },
  { name: "new-keyword", trigger: newKeyword, path: "keywords" },
];
for (const c of snaps) {
  describe(c.name, () => {
    test("seeds without emitting, then emits only the new rows, idempotently", async () => {
      const seeded = await c.trigger.poll!({ ...input, state: {} }, ctx(["1", "2"]).ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      const first = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        ctx(["1", "2", "3"]).ctx,
      );
      const retry = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        ctx(["1", "2", "3"]).ctx,
      );
      assertEquals(first.events, [row("3")]);
      assertEquals(retry, first);
    });
    test("sends the literal request and follows every page", async () => {
      const m = mockCtx([
        { body: page([row("1")], { totalPages: 2 }) },
        { body: page([row("2")], { totalPages: 2 }) },
      ]);
      const out = await c.trigger.poll!({ ...input, state: {} }, m.ctx);
      assertEquals(out.events, []);
      assertEquals(m.calls.length, 2);
      assertEquals(m.calls[0].method, "GET");
      assertEquals(m.calls[0].url, `${API}/${c.path}?page=0&size=200`);
      assertEquals(m.calls[1].url, `${API}/${c.path}?page=1&size=200`);
    });
    test("a collection beyond 25 pages fails instead of a partial snapshot", async () => {
      const m = mockCtx(Array.from({ length: 26 }, (_, i) => ({
        body: page([row(String(i))], { totalPages: 99 }),
      })));
      await assertRejects(() => c.trigger.poll!({ ...input, state: {} }, m.ctx), Error, "25 pages");
    });
  });
}
