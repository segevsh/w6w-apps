import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-issue.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = { id: "issue-a" };
const body = (items: unknown[]) => ({ data: items, links: {} });

test("new-issue: seeds, emits unseen rows, retries idempotently, and requests the wrapped feed", async () => {
  const seededCtx = mockCtx([{ body: body([item]) }], { display: { orgId: "org-1" } });
  const seeded = await trigger.poll!({ ...input, state: {} } as never, seededCtx.ctx);
  assertEquals((seeded as { events: unknown[] }).events, []);
  assertEquals((seeded as { nextState: { seeded?: boolean } }).nextState.seeded, true);
  const added = {
    ...item,
    id: "new-id",
    contactId: "new-id",
    shipmentId: "new-id",
    sequenceId: "new-id",
  };
  const page = body([added, item]);
  const nextCtx = mockCtx([{ body: page }], { display: { orgId: "org-1" } });
  const first = await trigger.poll!(
    { ...input, state: (seeded as { nextState: unknown }).nextState } as never,
    nextCtx.ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: (seeded as { nextState: unknown }).nextState } as never,
    mockCtx([{ body: page }], { display: { orgId: "org-1" } }).ctx,
  );
  assertEquals((first as { events: unknown[] }).events, [added]);
  assertEquals(retry, first);
  assertEquals(nextCtx.calls[0].method, "GET");
  assertEquals(
    nextCtx.calls[0].url,
    "https://api.snyk.io/rest/orgs/org-1/issues?version=2026-03-25&limit=100",
  );
});
