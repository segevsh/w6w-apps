import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";
import trigger from "../../triggers/new-lead.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const lead = (id: number) => ({ id });
const ctx = (records: unknown[]) => mockCtx([{ result: records }]);

test("new-lead: seeds, emits only new leads, retries idempotently, and sorts newest first", async () => {
  const seed = ctx([lead(10)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(rpcBody(seed.calls[0]).method, "findLeads");
  assertEquals(rpcBody(seed.calls[0]).params, {
    query: {},
    orderBy: "id",
    orderDirection: "DESC",
    limit: 100,
    page: 1,
    stubResponses: false,
  });

  const page = [lead(11), lead(10)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [lead(11)]);
  assertEquals(retry, first);
});
