import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-job.ts";

const input = { params: { organizationId: "org_1" }, subscriptionId: "sub_1" };
const reply = (nodes: unknown[]) => ({ organization: { jobs: { nodes, nextPage: null } } });

test("new-job seeds, emits unseen jobs idempotently, and uses the createdAt-desc Pave query", async () => {
  const seedCtx = mockCtx([{ body: reply([{ id: "old" }]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seedCtx.calls[0].method, "POST");
  assertEquals(seedCtx.calls[0].url, "https://api.jobtread.com/pave");
  assertEquals(JSON.parse(seedCtx.calls[0].body ?? ""), {
    query: {
      organization: {
        $: { id: "org_1" },
        jobs: {
          $: { size: 100, sortBy: [{ field: "createdAt", order: "desc" }] },
          nextPage: {},
          nodes: { id: {}, name: {}, number: {}, status: {}, createdAt: {} },
        },
      },
    },
  });
  const response = { body: reply([{ id: "new" }, { id: "old" }]) };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([response]).ctx);
  const second = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response]).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(first, second);
});
