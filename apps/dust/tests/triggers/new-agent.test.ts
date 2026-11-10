import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtxWithConnection } from "../_helpers.ts";
import trigger from "../../triggers/new-agent.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const agent = (sId: string) => ({ sId, name: `Agent ${sId}`, scope: "workspace" });

test("new-agent: seeds, emits only added agents, retries idempotently, and requests GET assistant/agent_configurations?view=list", async () => {
  const seed = mockCtxWithConnection([{ body: { agentConfigurations: [agent("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const response = { body: { agentConfigurations: [agent("a"), agent("b")] } };
  const first = mockCtxWithConnection([response]);
  const retry = mockCtxWithConnection([response]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [agent("b")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(
    first.calls[0].url,
    "https://dust.tt/api/v1/w/ws_test123/assistant/agent_configurations?view=list",
  );
});
