import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTag from "../../triggers/new-tag.ts";
import newGrowthTool from "../../triggers/new-growth-tool.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const cases = [
  { trigger: newTag, url: "https://api.manychat.com/fb/page/getTags" },
  { trigger: newGrowthTool, url: "https://api.manychat.com/fb/page/getGrowthTools" },
];
const row = (id: number, name = `n${id}`) => ({ id, name });
const ctx = (rows: unknown[]) => mockCtx([{ body: { status: "success", data: rows } }]);

for (const c of cases) {
  const key = c.trigger.key;

  test(`${key}: seeds, emits only added rows, retries idempotently, requests the list endpoint`, async () => {
    const seed = ctx([row(1)]);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
      method: "GET",
      url: c.url,
    });

    const later = { ...input, state: seeded.nextState };
    const first = await c.trigger.poll!(later, ctx([row(2), row(1)]).ctx);
    const retry = await c.trigger.poll!(later, ctx([row(2), row(1)]).ctx);
    assertEquals(first.events, [row(2)]);
    assertEquals(retry, first);
  });

  test(`${key}: a renamed or removed row is not a new row`, async () => {
    const seeded = await c.trigger.poll!({ ...input, state: {} }, ctx([row(1), row(9)]).ctx);
    const res = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      ctx([row(1, "renamed")]).ctx,
    );
    assertEquals(res.events, []);
  });
}
