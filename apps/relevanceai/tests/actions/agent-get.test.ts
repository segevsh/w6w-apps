import { assertEquals } from "@std/assert";
import agentGet from "../../actions/agent-get.ts";
import { mockRelevanceCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("agent-get: GETs /agents/{id}/get and passes the definition through", async () => {
  const { ctx, calls } = mockRelevanceCtx([{
    body: { agent: { agent_id: "a1", title: "Triage" } },
  }]);
  const out = await agentGet.execute({ agentId: "a1" }, ctx) as {
    agent: Record<string, unknown>;
  };

  assertEquals(pathOf(calls[0].url), "/latest/agents/a1/get");
  assertEquals(calls[0].method, "GET");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.agent.title, "Triage");
});

Deno.test("agent-get: the version filter and the id encoding both survive", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { agent: {} } }]);
  await agentGet.execute({ agentId: "a1.b2-c3_d4", version: "draft" }, ctx);

  assertEquals(pathOf(calls[0].url), "/latest/agents/a1.b2-c3_d4/get");
  assertEquals(queryOf(calls[0].url), { version: "draft" });
});

Deno.test("agent-get: the vendor's agent_not_found is the error a caller sees", async () => {
  const { ctx } = mockRelevanceCtx([
    { status: 404, body: { message: "Agent abc not found", error_type: "agent_not_found" } },
  ]);
  let message = "";
  try {
    await agentGet.execute({ agentId: "abc" }, ctx);
  } catch (error) {
    message = (error as Error).message;
  }
  assertEquals(
    message,
    "Relevance AI 404 for GET /latest/agents/abc/get: agent_not_found: Agent abc not found",
  );
});
