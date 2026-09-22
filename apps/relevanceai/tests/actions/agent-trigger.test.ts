import { assert, assertEquals } from "@std/assert";
import agentTrigger from "../../actions/agent-trigger.ts";
import { bodyOf, mockRelevanceCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-trigger: POSTs the vendor's documented body to /agents/trigger", async () => {
  const { ctx, calls } = mockRelevanceCtx([
    {
      body: {
        agent_id: "a1",
        conversation_id: "c1",
        state: "running",
        job_info: { job_id: "j1" },
      },
    },
  ]);
  const out = await agentTrigger.execute(
    { agentId: "a1", message: "summarise the inbox", conversationId: "c1" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/latest/agents/trigger");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), {
    agent_id: "a1",
    message: { role: "user", content: "summarise the inbox" },
    conversation_id: "c1",
  });
  // The answer is a job receipt, not the agent's reply.
  assertEquals(out.state, "running");
  assertEquals(out.conversation_id, "c1");
});

Deno.test("agent-trigger: omitting the conversation starts a new one", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { agent_id: "a1" } }]);
  await agentTrigger.execute({ agentId: "a1", message: "hi" }, ctx);

  const body = bodyOf(calls[0]);
  assertEquals("conversation_id" in body, false);
  assertEquals(body.message, { role: "user", content: "hi" });
});

/**
 * No idempotency key exists on this endpoint — `external_id` names a
 * conversation rather than deduplicating a request — so a retry would bill a
 * second agent run.
 */
Deno.test("agent-trigger: is a perform that is not idempotent, and says so", () => {
  assertEquals(agentTrigger.type, "perform");
  assertEquals(agentTrigger.idempotent, false);
  assertEquals(agentTrigger.params?.map((p) => p.key), ["agentId", "message", "conversationId"]);
  assertEquals(agentTrigger.params?.find((p) => p.key === "message")?.required, true);
  assert(agentTrigger.description!.length > 0);
});
