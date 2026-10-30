import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import agentDetail from "../../actions/agent-detail.ts";
import { mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

test("agent-detail: gets /v2/agent.detail with agent_id as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ agent: { id: "a1", nickname: "Bot" } }) }]);
  const out = await agentDetail.execute({ agentId: "a1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/agent.detail");
  assertEquals(queryOf(calls[0].url), { agent_id: "a1" });
  assertEquals(out, { id: "a1", nickname: "Bot" });
});
