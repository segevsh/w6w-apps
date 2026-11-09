import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-person.ts";
const page = (ids: string[]) => ({
  _embedded: { "osdi:people": ids.map((id) => ({ identifiers: [id] })) },
  _links: {},
});
test("new-person seeds, emits, retries, and requests the modified filter", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const seed = mockCtx([{ body: page(["a"]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://actionnetwork.org/api/v2/people?page=1&per_page=100&filter=modified_date+gt+%271970-01-01%27",
  );
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page(["b", "a"]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page(["b", "a"]) }]).ctx,
  );
  assertEquals(first.events, [{ identifiers: ["b"] }]);
  assertEquals(retry, first);
});
