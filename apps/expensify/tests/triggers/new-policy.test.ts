import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";
import trigger from "../../triggers/new-policy.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const policy = (id: string) => ({ id, name: `Policy ${id}`, type: "corporate" });

test("new-policy: seeds, emits only added policies, retries idempotently, and posts the get/policyList job", async () => {
  const seed = mockCtx([{ body: { responseCode: 200, policyList: [policy("A")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const response = { body: { responseCode: 200, policyList: [policy("A"), policy("B")] } };
  const first = mockCtx([response]);
  const retry = mockCtx([response]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [policy("B")]);
  assertEquals(repeated.events, result.events);
  assertWire(first.calls[0]);
  assertEquals(first.calls[0].method, "POST");
  assertEquals(
    first.calls[0].url,
    "https://integrations.expensify.com/Integration-Server/ExpensifyIntegrations",
  );
  assertEquals(sent(first.calls[0]).job, { type: "get", inputSettings: { type: "policyList" } });
});

test("new-policy: edits and removals do not emit", async () => {
  const seed = mockCtx([{ body: { responseCode: 200, policyList: [policy("A"), policy("B")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  const next = mockCtx([{
    body: { responseCode: 200, policyList: [{ ...policy("A"), name: "Renamed" }] },
  }]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  assertEquals(result.events, []);
});
