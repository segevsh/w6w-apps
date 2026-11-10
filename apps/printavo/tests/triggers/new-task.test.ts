import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-task.ts";

const input = { params: {}, subscriptionId: "sub-1" };
test("new-task: seeds, emits new records, retries idempotently, and requests the feed", async () => {
  const seed = mockCtx([{
    body: {
      data: {
        tasks: { nodes: [{ id: "task-1" }], pageInfo: { hasNextPage: false, endCursor: null } },
      },
    },
  }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(seed.calls[0].url, "https://www.printavo.com/api/v2");
  const sent = JSON.parse(seed.calls[0].body ?? "{}") as {
    query: string;
    variables: Record<string, unknown>;
  };
  assertEquals(sent.variables, { first: 100, sortOn: "CREATED_AT", sortDescending: true });
  assertEquals(sent.query.includes("tasks(first: $first"), true);
  const page = {
    data: {
      tasks: {
        nodes: [{ id: "task-2" }, { id: "task-1" }],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    },
  };
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});
