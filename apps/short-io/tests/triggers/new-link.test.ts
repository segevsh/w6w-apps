import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-link.ts";

const input = { params: { domainId: 1 }, subscriptionId: "sub-1" };
const item = { idString: "link-a" };
const body = (items: unknown[]) => ({ links: items });

test("new-link: seeds, emits unseen rows, retries idempotently, and requests the wrapped feed", async () => {
  const seededCtx = mockCtx([{ body: body([item]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} } as never, seededCtx.ctx);
  assertEquals((seeded as { events: unknown[] }).events, []);
  assertEquals((seeded as { nextState: { seeded?: boolean } }).nextState.seeded, true);
  const added = { idString: "new-id" };
  const page = body([added, item]);
  const nextCtx = mockCtx([{ body: page }]);
  const first = await trigger.poll!(
    { ...input, state: (seeded as { nextState: unknown }).nextState } as never,
    nextCtx.ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: (seeded as { nextState: unknown }).nextState } as never,
    mockCtx([{ body: page }]).ctx,
  );
  assertEquals((first as { events: unknown[] }).events, [added]);
  assertEquals(retry, first);
  assertEquals(nextCtx.calls[0].method, "GET");
  assertEquals(
    nextCtx.calls[0].url,
    "https://api.short.io/api/links?domain_id=1&limit=100&dateSortOrder=desc",
  );
});
