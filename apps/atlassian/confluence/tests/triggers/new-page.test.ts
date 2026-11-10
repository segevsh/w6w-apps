import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-page.ts";
const page = (results: unknown[]) => ({ results, _links: {} });
test("new-page seeds, emits, retries, and requests newest-created pages", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const display = { display: { site: "acme" } };
  const seed = mockCtx([{ body: page([{ id: "a" }]) }], display);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://acme.atlassian.net/wiki/api/v2/pages?sort=-created-date&limit=100",
  );
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([{ id: "b" }, { id: "a" }]) }], display).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([{ id: "b" }, { id: "a" }]) }], display).ctx,
  );
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});
