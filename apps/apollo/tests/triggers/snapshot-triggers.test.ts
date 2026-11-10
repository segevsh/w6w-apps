import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newList from "../../triggers/new-list.ts";
import newSequence from "../../triggers/new-sequence.ts";

const input = { params: {}, subscriptionId: "s" };

// Table-driven: the two bounded-collection (pollSnapshot) triggers share one case set.
const specs = [
  {
    name: "new-list",
    trigger: newList,
    method: "GET",
    url: "https://api.apollo.io/api/v1/labels",
    wrap: (items: unknown[]) => items,
    body: undefined as unknown,
  },
  {
    name: "new-sequence",
    trigger: newSequence,
    method: "POST",
    url: "https://api.apollo.io/api/v1/emailer_campaigns/search?page=1&per_page=100",
    wrap: (items: unknown[]) => ({
      emailer_campaigns: items,
      pagination: { page: 1, per_page: 100, total_entries: items.length, total_pages: 1 },
    }),
    body: undefined as unknown,
  },
];

for (const { name, trigger, method, url, wrap } of specs) {
  const old = [{ id: "one", name: "One" }];
  const fresh = { id: "two", name: "Two" };

  test(`${name} seeds without events, then emits only the new record`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([{ body: wrap(old) }]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    const run = () =>
      trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: wrap([fresh, ...old]) }]).ctx,
      );
    const first = await run();
    assertEquals(first.events, [fresh]);
    assertEquals(await run(), first); // idempotent retry
  });

  test(`${name} makes the literal request of its list action`, async () => {
    const mock = mockCtx([{ body: wrap(old) }]);
    await trigger.poll!({ ...input, state: {} }, mock.ctx);
    assertEquals(mock.calls.length, 1);
    assertEquals(mock.calls[0].method, method);
    assertEquals(mock.calls[0].url, url);
  });

  test(`${name} does not re-emit a record that was already seen`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([{ body: wrap(old) }]).ctx);
    const again = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: wrap(old) }]).ctx,
    );
    assertEquals(again.events, []);
  });
}

test("new-sequence reads every page of the collection", async () => {
  const page = (items: unknown[], n: number) => ({
    emailer_campaigns: items,
    pagination: { page: n, per_page: 100, total_entries: 3, total_pages: 2 },
  });
  const seeded = await newSequence.poll!(
    { ...input, state: {} },
    mockCtx([{ body: page([{ id: "s1" }, { id: "s2" }], 1) }, { body: page([{ id: "s3" }], 2) }])
      .ctx,
  );
  assertEquals(seeded.events, []);
  const mock = mockCtx([
    { body: page([{ id: "s1" }, { id: "s2" }], 1) },
    { body: page([{ id: "s3" }, { id: "s4" }], 2) },
  ]);
  const next = await newSequence.poll!({ ...input, state: seeded.nextState }, mock.ctx);
  assertEquals(next.events, [{ id: "s4" }]);
  assertEquals(mock.calls.map((c) => c.url), [
    "https://api.apollo.io/api/v1/emailer_campaigns/search?page=1&per_page=100",
    "https://api.apollo.io/api/v1/emailer_campaigns/search?page=2&per_page=100",
  ]);
});
