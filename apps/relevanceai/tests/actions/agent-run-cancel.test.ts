import { assertEquals } from "@std/assert";
import agentRunCancel from "../../actions/agent-run-cancel.ts";
import { bodyOf, mockRelevanceCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-run-cancel: POSTs an empty body to /agents/{id}/cancel", async () => {
  // A successful cancel answers 200 with no body at all.
  const { ctx, calls } = mockRelevanceCtx([{ status: 200 }]);
  const out = await agentRunCancel.execute({ agentId: "a1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/latest/agents/a1/cancel");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), {});
  // `CancelAgentOutput` declares no properties, so the only readable fact is
  // that the call was accepted.
  assertEquals(out, { cancelled: true });
});

Deno.test("agent-run-cancel: is idempotent, and the endpoint takes no key", () => {
  assertEquals(agentRunCancel.type, "perform");
  assertEquals(agentRunCancel.idempotent, true);
  assertEquals(agentRunCancel.params?.map((p) => p.key), ["agentId"]);
  assertEquals(agentRunCancel.params?.[0].required, true);
});
