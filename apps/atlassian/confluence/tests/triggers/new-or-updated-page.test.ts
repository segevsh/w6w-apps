import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-page.ts";

const page = (results: unknown[]) => ({ results, _links: {} });

test("new-or-updated-page seeds, emits edits, retries, and requests newest-modified pages", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const display = { display: { site: "acme" } };
  const seed = mockCtx([{ body: page([{ id: "a", version: { number: 1 } }]) }], display);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://acme.atlassian.net/wiki/api/v2/pages?sort=-modified-date&limit=100",
  );
  const changed = [{ id: "a", version: { number: 2 } }];
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page(changed) }], display).ctx,
    );
  const first = await run();
  const retry = await run();
  assertEquals(first.events, changed);
  assertEquals(retry, first);
});
