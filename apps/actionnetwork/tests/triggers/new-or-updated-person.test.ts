import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-or-updated-person.ts";
import { mockCtx } from "../_helpers.ts";

const page = (items: unknown[]) => ({ _embedded: { "osdi:people": items }, _links: {} });

test("new-or-updated-person seeds, emits an edit, retries, and requests the modified filter", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const old = { identifiers: ["a"], modified_date: "2026-11-08T00:00:00Z" };
  const edited = { identifiers: ["a"], modified_date: "2026-11-09T00:00:00Z" };
  const seed = mockCtx([{ body: page([old]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://actionnetwork.org/api/v2/people?page=1&per_page=100&filter=modified_date+gt+%271970-01-01%27",
  );
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([edited]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([edited]) }]).ctx,
  );
  assertEquals(first.events, [edited]);
  assertEquals(retry, first);
});
