import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newList from "../../triggers/new-list.ts";
import newSegment from "../../triggers/new-segment.ts";
import newTag from "../../triggers/new-tag.ts";

const cases = [
  {
    name: "new-list",
    trigger: newList,
    params: { accountId: "1" },
    url: "https://api.aweber.com/1.0/accounts/1/lists?ws.size=100",
    body: (ids: number[], tag = "") => ({
      entries: ids.map((id) => ({ id, name: `list-${id}${tag}` })),
    }),
    seed: [10],
    next: [10, 20],
    added: "20",
  },
  {
    name: "new-segment",
    trigger: newSegment,
    params: { accountId: "1", listId: "2" },
    url: "https://api.aweber.com/1.0/accounts/1/lists/2/segments?ws.size=100",
    body: (ids: number[], tag = "") => ({
      entries: ids.map((id) => ({ id, name: `segment-${id}${tag}` })),
    }),
    seed: [5],
    next: [5, 6],
    added: "6",
  },
  {
    name: "new-tag",
    trigger: newTag,
    params: { accountId: "1", listId: "2" },
    url: "https://api.aweber.com/1.0/accounts/1/lists/2/tags",
    body: (ids: number[], _tag = "") => ids.map((id) => `tag-${id}`),
    seed: [1],
    next: [1, 2],
    added: "tag-2",
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const input = { params: c.params, subscriptionId: "sub-1" };

    test("seeds without emitting, emits only the addition, retries idempotently", async () => {
      const seed = mockCtx([{ body: c.body(c.seed) }]);
      const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      const run = () =>
        c.trigger.poll!(
          { ...input, state: seeded.nextState },
          mockCtx([{ body: c.body(c.next) }]).ctx,
        );
      const first = await run();
      assertEquals(first.events.map((e) => (e as { key: string }).key), [c.added]);
      assertEquals((first.events[0] as { change: string }).change, "added");
      assertEquals(await run(), first);
    });

    // new-tag rows are bare strings: a different string is a different key, so there is no field to change.
    test(
      "a seen row whose field changes emits nothing",
      { skip: c.name === "new-tag" },
      async () => {
        const seeded = await c.trigger.poll!(
          { ...input, state: {} },
          mockCtx([{ body: c.body(c.seed) }]).ctx,
        );
        const r = await c.trigger.poll!(
          { ...input, state: seeded.nextState },
          mockCtx([{ body: c.body(c.seed, "renamed") }]).ctx,
        );
        assertEquals(r.events, []);
      },
    );

    test("sends the list action's literal request", async () => {
      const seed = mockCtx([{ body: c.body(c.seed) }]);
      await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seed.calls.length, 1);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
    });
  });
}
